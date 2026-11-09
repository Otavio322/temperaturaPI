import argparse
import os

import joblib
import pandas as pd
from sqlalchemy import text

from comum import carregar_leituras, carregar_previsoes, conectar, id_propriedade_do_sensor, montar_features

INSERIR = text(
    "INSERT INTO previsao_temperatura (id_sensor, gerada_em, valida_para, horizonte_h, temperatura_prevista, modelo) "
    "VALUES (:sensor, :gerada, :valida, :horizonte, :temp, :modelo) "
    "ON DUPLICATE KEY UPDATE temperatura_prevista = VALUES(temperatura_prevista)"
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

    with con.connect() as c:
        minutos = c.execute(
            text("SELECT TIMESTAMPDIFF(MINUTE, MAX(medido_em), NOW()) FROM leitura_climatica WHERE id_sensor = :id AND valida = TRUE"),
            {"id": args.sensor},
        ).scalar()
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
    valida = gerada + pd.Timedelta(hours=args.horizonte)

    with con.begin() as c:
        c.execute(
            INSERIR,
            {
                "sensor": args.sensor,
                "gerada": gerada.to_pydatetime(),
                "valida": valida.to_pydatetime(),
                "horizonte": args.horizonte,
                "temp": round(previsto, 2),
                "modelo": pacote["nome"],
            },
        )
    print(f"{gerada} -> {valida}: {previsto:.2f} °C")


if __name__ == "__main__":
    main()
