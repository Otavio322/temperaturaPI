const env = require('../config/env');
const previsoesRepo = require('../repositorios/previsoes');
const { ultimaExecucao, extrairPontos } = require('../utils/climapiParser');

let tokenEmCache = { valor: null, expiraEm: 0 };

async function obterToken() {
  if (tokenEmCache.valor && Date.now() < tokenEmCache.expiraEm) return tokenEmCache.valor;
  const credencial = Buffer.from(`${env.CLIMAPI_CONSUMER_KEY}:${env.CLIMAPI_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(env.CLIMAPI_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${credencial}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Token da AgroAPI recusado (${res.status})`);
  const json = await res.json();
  tokenEmCache = { valor: json.access_token, expiraEm: Date.now() + Math.max(60, (json.expires_in || 3600) - 60) * 1000 };
  return tokenEmCache.valor;
}

async function chamar(caminho) {
  const token = await obterToken();
  const res = await fetch(`${env.CLIMAPI_BASE_URL}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401) tokenEmCache = { valor: null, expiraEm: 0 };
  if (!res.ok) throw new Error(`ClimAPI ${caminho} respondeu ${res.status}`);
  return res.json();
}

const listarVariaveis = () => chamar('/ncep-gfs');
const listarExecucoes = (variavel) => chamar(`/ncep-gfs/${encodeURIComponent(variavel)}`);
const buscarSerie = ({ variavel, execucao, longitude, latitude }) =>
  chamar(`/ncep-gfs/${encodeURIComponent(variavel)}/${encodeURIComponent(execucao)}/${longitude}/${latitude}`);

async function coletarUma({ propriedade, variavel, execucao }) {
  const chave = { idPropriedade: propriedade.id_propriedade, variavel, execucao };
  if (await previsoesRepo.coletaExiste(chave)) return { ...chave, status: 'ja_coletada' };

  const resposta = await buscarSerie({ variavel, execucao, longitude: propriedade.longitude, latitude: propriedade.latitude });
  const idColeta = await previsoesRepo.salvarColeta({ ...chave, resposta });
  if (!idColeta) return { ...chave, status: 'ja_coletada' };

  const pontos = extrairPontos(resposta);
  if (!pontos.length) {
    console.warn(`ClimAPI: resposta de ${variavel} salva, mas nenhum ponto reconhecido. Ajuste src/utils/climapiParser.js e rode: npm run climapi -- reprocessar`);
    return { ...chave, status: 'salva_sem_pontos' };
  }
  await previsoesRepo.salvarPontos(idColeta, pontos);
  return { ...chave, status: 'ok', pontos: pontos.length };
}

async function coletarTodas({ forcar = false } = {}) {
  if (!env.climapiAtivo) return [];

  if (!forcar) {
    const minutos = await previsoesRepo.minutosDesdeUltimaColeta();
    if (minutos !== null && minutos < (env.CLIMAPI_INTERVALO_HORAS * 60) / 2) return [];
  }

  const propriedades = await previsoesRepo.propriedadesParaColeta();
  if (!propriedades.length) return [];

  const resultados = [];
  for (const variavel of env.climapiVariaveis) {
    let execucao;
    try {
      execucao = ultimaExecucao(await listarExecucoes(variavel));
    } catch (erro) {
      console.error(`ClimAPI: falha ao listar execuções de ${variavel}:`, erro.message);
      continue;
    }
    if (!execucao) continue;

    for (const propriedade of propriedades) {
      try {
        resultados.push(await coletarUma({ propriedade, variavel, execucao }));
      } catch (erro) {
        console.error(`ClimAPI: falha em ${variavel} (propriedade ${propriedade.id_propriedade}):`, erro.message);
        resultados.push({ idPropriedade: propriedade.id_propriedade, variavel, execucao, status: 'erro', erro: erro.message });
      }
    }
  }
  return resultados;
}

async function reprocessarColetas() {
  await previsoesRepo.limparPontos();
  const coletas = await previsoesRepo.listarColetasBrutas();
  let total = 0;
  for (const coleta of coletas) {
    total += await previsoesRepo.salvarPontos(coleta.id_coleta, extrairPontos(coleta.resposta));
  }
  return { coletas: coletas.length, pontos: total };
}

module.exports = { listarVariaveis, listarExecucoes, coletarTodas, reprocessarColetas };
