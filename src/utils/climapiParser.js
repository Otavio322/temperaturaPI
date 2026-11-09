const CHAVES_DATA = ['data', 'datahora', 'data_hora', 'dataHora', 'horario', 'timestamp', 'time', 'valid_time', 'validTime', 'date'];
const CHAVES_VALOR = ['valor', 'value', 'val'];

function primeiraLista(resposta) {
  if (Array.isArray(resposta)) return resposta;
  if (resposta && typeof resposta === 'object') {
    const lista = Object.values(resposta).find(Array.isArray);
    if (lista) return lista;
  }
  return [];
}

function textoDoItem(item) {
  if (item !== null && typeof item === 'object') {
    const texto = Object.values(item).find((v) => typeof v === 'string' || typeof v === 'number');
    return texto === undefined ? null : String(texto);
  }
  return item === undefined || item === null ? null : String(item);
}

function extrairExecucoes(resposta) {
  return primeiraLista(resposta).map(textoDoItem).filter(Boolean).sort();
}

function ultimaExecucao(resposta) {
  const execucoes = extrairExecucoes(resposta);
  return execucoes.length ? execucoes[execucoes.length - 1] : null;
}

function acharChave(item, candidatas) {
  return candidatas.find((c) => Object.prototype.hasOwnProperty.call(item, c));
}

function extrairPontos(resposta) {
  const pontos = [];
  for (const item of primeiraLista(resposta)) {
    if (item === null || typeof item !== 'object') continue;
    const chaveData = acharChave(item, CHAVES_DATA);
    let chaveValor = acharChave(item, CHAVES_VALOR);
    if (!chaveValor) chaveValor = Object.keys(item).find((k) => k !== chaveData && item[k] !== null && item[k] !== '' && Number.isFinite(Number(item[k])));
    if (!chaveData || !chaveValor) continue;
    const validoPara = new Date(item[chaveData]);
    const valor = Number(item[chaveValor]);
    if (Number.isNaN(validoPara.getTime()) || item[chaveValor] === null || !Number.isFinite(valor)) continue;
    pontos.push({ validoPara, valor });
  }
  return pontos;
}

module.exports = { extrairExecucoes, ultimaExecucao, extrairPontos };
