import argparse
import os

import joblib

from comum import (
    carregar_leituras,
    carregar_previsoes,
    conectar,
    gravar_previsao,
    id_propriedade_do_sensor,
    minutos_sem_leitura,
    montar_features,
)

MINUTOS_MAX_SEM_LEITURA = 180


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sensor", type=int, required=True)
    ap.add_argument("--horizonte", type=int, default=6)
    ap.add_argument("--modelos", default="modelos")
    args = ap.parse_args()

    pacote = joblib.load(os.path.join(args.modelos, f"sensor{args.sensor}_h{args.horizonte}.joblib"))
    con = conectar()

    minutos = minutos_sem_leitura(con, args.sensor)
    if minutos is None or minutos > MINUTOS_MAX_SEM_LEITURA:
        raise SystemExit(f"Sensor sem leituras recentes ({minutos} min). Previsão não gerada.")

    horaria = carregar_leituras(con, args.sensor)
    previsoes = carregar_previsoes(con, id_propriedade_do_sensor(con, args.sensor))
    dados = montar_features(horaria, previsoes, args.horizonte)
    for coluna in pacote["colunas"]:
        if coluna not in dados.columns:
            dados[coluna] = float("nan")

    ultima = dados.iloc[[-1]]
    previsto = float(pacote["modelo"].predict(ultima[pacote["colunas"]])[0])
    gerada = ultima.index[0]
    valida = gravar_previsao(con, args.sensor, gerada, args.horizonte, previsto, pacote["nome"])
    print(f"{gerada} -> {valida}: {previsto:.2f} °C")


if __name__ == "__main__":
    main()
