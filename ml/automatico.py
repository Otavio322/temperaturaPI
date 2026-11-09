import os
import sys

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from comum import (
    carregar_leituras,
    carregar_previsoes,
    conectar,
    gravar_previsao,
    id_propriedade_do_sensor,
    listar_sensores_ativos,
    minutos_sem_leitura,
    montar_features,
)

HORIZONTES = [int(h) for h in os.environ.get("ML_HORIZONTES", "6").split(",") if h.strip()]
MIN_HORAS = int(os.environ.get("ML_MIN_HORAS", str(24 * 14)))
MAX_MINUTOS_SEM_LEITURA = int(os.environ.get("ML_MAX_MINUTOS_SEM_LEITURA", "180"))
NOME_MODELO = "rf_auto_v1"


def processar(con, id_sensor, horizonte):
    minutos = minutos_sem_leitura(con, id_sensor)
    if minutos is None:
        return "sem leituras válidas"
    if minutos > MAX_MINUTOS_SEM_LEITURA:
        return f"sem leituras recentes ({minutos} min)"

    horaria = carregar_leituras(con, id_sensor)
    previsoes = carregar_previsoes(con, id_propriedade_do_sensor(con, id_sensor))
    dados = montar_features(horaria, previsoes, horizonte)
    treino = dados.dropna(subset=["alvo"])
    if len(treino) < MIN_HORAS:
        return f"poucos dados ({len(treino)} h, mínimo {MIN_HORAS} h)"

    colunas = [c for c in dados.columns if c != "alvo"]
    corte = int(len(treino) * 0.8)
    antes, depois = treino.iloc[:corte], treino.iloc[corte:]
    avaliacao = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    avaliacao.fit(antes[colunas], antes["alvo"])
    mae_modelo = mean_absolute_error(depois["alvo"], avaliacao.predict(depois[colunas]))
    mae_persistencia = mean_absolute_error(depois["alvo"], depois["temperatura"])

    modelo = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    modelo.fit(treino[colunas], treino["alvo"])

    ultima = dados.iloc[[-1]]
    previsto = float(modelo.predict(ultima[colunas])[0])
    valida = gravar_previsao(con, id_sensor, ultima.index[0], horizonte, previsto, NOME_MODELO)
    return f"{previsto:.2f} °C para {valida} | MAE modelo {mae_modelo:.2f} vs persistência {mae_persistencia:.2f}"


def main():
    con = conectar()
    sensores = listar_sensores_ativos(con)
    if not sensores:
        print("Nenhum sensor ativo.")
        return 0

    erros = 0
    for id_sensor in sensores:
        for horizonte in HORIZONTES:
            rotulo = f"sensor {id_sensor} +{horizonte}h"
            try:
                print(f"{rotulo}: {processar(con, id_sensor, horizonte)}")
            except SystemExit as motivo:
                print(f"{rotulo}: ignorado ({motivo})")
            except Exception as erro:
                erros += 1
                print(f"{rotulo}: ERRO {type(erro).__name__}: {erro}")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
