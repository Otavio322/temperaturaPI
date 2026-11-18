import pandas as pd

FAIXA_TEMPERATURA = (-40, 85)
FAIXA_UMIDADE = (0, 100)


def limpar_leituras_climaticas(dados):
    colunas = ["medido_em", "temperatura", "umidade"]
    if not set(colunas).issubset(dados.columns):
        raise ValueError("As leituras precisam conter medido_em, temperatura e umidade")

    leituras = dados[colunas].copy()
    leituras["medido_em"] = pd.to_datetime(leituras["medido_em"], errors="coerce")
    leituras["temperatura"] = pd.to_numeric(leituras["temperatura"], errors="coerce")
    leituras["umidade"] = pd.to_numeric(leituras["umidade"], errors="coerce")
    leituras = leituras.dropna(subset=colunas)
    leituras = leituras[
        leituras["temperatura"].between(*FAIXA_TEMPERATURA)
        & leituras["umidade"].between(*FAIXA_UMIDADE)
    ]

    if leituras.empty:
        return pd.DataFrame(
            columns=["temperatura", "umidade"],
            index=pd.DatetimeIndex([], name="medido_em"),
        )

    return (
        leituras.set_index("medido_em")[["temperatura", "umidade"]]
        .sort_index()
        .resample("1h")
        .mean()
        .interpolate(limit=3)
        .dropna()
    )
