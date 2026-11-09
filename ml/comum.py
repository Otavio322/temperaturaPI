import os

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

LAGS = (1, 2, 3, 6, 12, 24)
PASSO_GFS = "6h"


def conectar():
    url = URL.create(
        "mysql+pymysql",
        username=os.environ["DB_USER"],
        password=os.environ.get("DB_PASSWORD", ""),
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "3306")),
        database=os.environ.get("DB_NAME", "climora"),
    )
    return create_engine(url)


def id_propriedade_do_sensor(con, id_sensor):
    sql = text(
        "SELECT s.id_propriedade FROM sensor se JOIN setor s ON s.id_setor = se.id_setor WHERE se.id_sensor = :id"
    )
    with con.connect() as c:
        linha = c.execute(sql, {"id": id_sensor}).fetchone()
    if linha is None:
        raise SystemExit(f"Sensor {id_sensor} não encontrado")
    return linha[0]


def carregar_leituras(con, id_sensor):
    sql = text(
        "SELECT medido_em, temperatura, umidade FROM leitura_climatica "
        "WHERE id_sensor = :id AND valida = TRUE ORDER BY medido_em"
    )
    df = pd.read_sql(sql, con, params={"id": id_sensor}, parse_dates=["medido_em"])
    if df.empty:
        raise SystemExit(f"Sensor {id_sensor} sem leituras válidas")
    horaria = (
        df.set_index("medido_em")[["temperatura", "umidade"]]
        .astype(float)
        .resample("1h")
        .mean()
        .interpolate(limit=3)
    )
    return horaria.dropna()


def carregar_previsoes(con, id_propriedade):
    sql = text(
        "SELECT c.id_coleta, c.variavel, c.coletado_em, p.valido_para, p.valor "
        "FROM climapi_ponto p JOIN climapi_coleta c ON c.id_coleta = p.id_coleta "
        "WHERE c.id_propriedade = :id"
    )
    df = pd.read_sql(sql, con, params={"id": id_propriedade}, parse_dates=["coletado_em", "valido_para"])
    df["valor"] = df["valor"].astype(float)
    return df


def juntar_previsoes(base, previsoes, horizonte):
    if previsoes.empty:
        return base
    chaves = base.index.to_frame(name="t").reset_index(drop=True)
    chaves["passo"] = (chaves["t"] + pd.Timedelta(hours=horizonte)).dt.floor(PASSO_GFS)
    for variavel, grupo in previsoes.groupby("variavel"):
        coletas = grupo[["id_coleta", "coletado_em"]].drop_duplicates().sort_values("coletado_em")
        chaves = pd.merge_asof(
            chaves.sort_values("t"), coletas, left_on="t", right_on="coletado_em", direction="backward"
        )
        pontos = grupo[["id_coleta", "valido_para", "valor"]].rename(
            columns={"valido_para": "passo", "valor": f"gfs_{variavel}"}
        )
        chaves = chaves.merge(pontos, on=["id_coleta", "passo"], how="left").drop(
            columns=["id_coleta", "coletado_em"]
        )
    chaves = chaves.drop(columns=["passo"]).set_index("t")
    return base.join(chaves)


def montar_features(horaria, previsoes, horizonte):
    dados = horaria.copy()
    dados["alvo"] = dados["temperatura"].shift(-horizonte)
    for lag in LAGS:
        dados[f"t_lag{lag}"] = dados["temperatura"].shift(lag)
    dados["media_6h"] = dados["temperatura"].rolling(6).mean()
    dados["hora"] = dados.index.hour
    dados["dia_ano"] = dados.index.dayofyear
    obrigatorias = [c for c in dados.columns if c != "alvo"]
    dados = dados.dropna(subset=obrigatorias)
    return juntar_previsoes(dados, previsoes, horizonte)


INSERIR_PREVISAO = text(
    "INSERT INTO previsao_temperatura (id_sensor, gerada_em, valida_para, horizonte_h, temperatura_prevista, modelo) "
    "VALUES (:sensor, :gerada, :valida, :horizonte, :temp, :modelo) "
    "ON DUPLICATE KEY UPDATE temperatura_prevista = VALUES(temperatura_prevista)"
)


def listar_sensores_ativos(con):
    with con.connect() as c:
        linhas = c.execute(text("SELECT id_sensor FROM sensor WHERE status = 'ATIVO' ORDER BY id_sensor")).fetchall()
    return [linha[0] for linha in linhas]


def minutos_sem_leitura(con, id_sensor):
    sql = text(
        "SELECT TIMESTAMPDIFF(MINUTE, MAX(medido_em), NOW()) FROM leitura_climatica "
        "WHERE id_sensor = :id AND valida = TRUE"
    )
    with con.connect() as c:
        return c.execute(sql, {"id": id_sensor}).scalar()


def gravar_previsao(con, id_sensor, gerada, horizonte, valor, modelo):
    valida = gerada + pd.Timedelta(hours=horizonte)
    with con.begin() as c:
        c.execute(
            INSERIR_PREVISAO,
            {
                "sensor": id_sensor,
                "gerada": gerada.to_pydatetime(),
                "valida": valida.to_pydatetime(),
                "horizonte": horizonte,
                "temp": round(float(valor), 2),
                "modelo": modelo,
            },
        )
    return valida
