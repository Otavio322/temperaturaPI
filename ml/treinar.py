import argparse
import os

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from comum import carregar_leituras, carregar_previsoes, conectar, id_propriedade_do_sensor, montar_features


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sensor", type=int, required=True)
    ap.add_argument("--horizonte", type=int, default=6)
    ap.add_argument("--saida", default="modelos")
    args = ap.parse_args()

    con = conectar()
    horaria = carregar_leituras(con, args.sensor)
    previsoes = carregar_previsoes(con, id_propriedade_do_sensor(con, args.sensor))
    dados = montar_features(horaria, previsoes, args.horizonte).dropna(subset=["alvo"])
    colunas = [c for c in dados.columns if c != "alvo"]

    if len(dados) < 24 * 14:
        raise SystemExit(f"Poucos dados ({len(dados)} horas). Colete pelo menos 2 semanas antes de treinar.")

    corte = int(len(dados) * 0.8)
    treino, teste = dados.iloc[:corte], dados.iloc[corte:]

    modelo = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    modelo.fit(treino[colunas], treino["alvo"])

    mae_modelo = mean_absolute_error(teste["alvo"], modelo.predict(teste[colunas]))
    mae_persistencia = mean_absolute_error(teste["alvo"], teste["temperatura"])
    print(f"horas totais: {len(dados)} | teste: {len(teste)}")
    print(f"MAE modelo:       {mae_modelo:.2f} °C")
    print(f"MAE persistência: {mae_persistencia:.2f} °C")
    gfs = [c for c in colunas if c.startswith("gfs_")]
    print(f"colunas da ClimAPI usadas: {gfs or 'nenhuma ainda'}")

    modelo.fit(dados[colunas], dados["alvo"])
    os.makedirs(args.saida, exist_ok=True)
    caminho = os.path.join(args.saida, f"sensor{args.sensor}_h{args.horizonte}.joblib")
    joblib.dump({"modelo": modelo, "colunas": colunas, "horizonte": args.horizonte, "nome": "rf_v1"}, caminho)
    print(f"salvo em {caminho}")


if __name__ == "__main__":
    main()
