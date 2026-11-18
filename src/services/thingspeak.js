const env = require('../config/env');

const QUANTIDADE_MAXIMA_FEEDS = 8000;

class ErroThingSpeak extends Error {}

function simularFeeds() {
  const agora = Date.now();
  const temperatura = 24 + Math.sin(agora / 3600000) * 8 + (Math.random() - 0.5) * 2;
  const umidade = 65 + Math.cos(agora / 5400000) * 15 + (Math.random() - 0.5) * 5;

  return [{
    created_at: new Date(agora).toISOString(),
    field1: Number(temperatura.toFixed(2)),
    field2: Number(umidade.toFixed(2)),
  }];
}

async function buscarFeeds(sensor) {
  if (!sensor || !sensor.thingspeak_channel_id) return simularFeeds();

  try {
    const url = `${env.THINGSPEAK_BASE_URL}/channels/${encodeURIComponent(sensor.thingspeak_channel_id)}/feeds.json?results=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`ThingSpeak respondeu ${res.status}`);
    const dados = await res.json();
    const feeds = Array.isArray(dados.feeds) ? dados.feeds : [];
    if (feeds.length) return feeds;
    throw new Error('canal sem nenhum dado publicado');
  } catch (erro) {
    if (env.thingspeakSimularSemCanal) return simularFeeds();
    throw erro;
  }
}

function numeroValido(valor, minimo, maximo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function normalizarFeed(feed) {
  if (!feed || typeof feed !== 'object') return null;
  const timestamp = Date.parse(feed.created_at);
  const temperatura = numeroValido(feed.field1, -40, 80);
  const umidade = numeroValido(feed.field2, 0, 100);
  if (!Number.isFinite(timestamp) || temperatura === null || umidade === null) return null;

  return {
    medido_em: new Date(timestamp).toISOString(),
    temperatura,
    umidade,
    maxima: numeroValido(feed.field3, -40, 80),
    minima: numeroValido(feed.field4, -40, 80),
    media: numeroValido(feed.field5, -40, 80),
  };
}

function calcularEstatisticas(leituras, campo) {
  if (!leituras.length) return null;
  const valores = leituras.map((leitura) => leitura[campo]);
  const minima = Math.min(...valores);
  const maxima = Math.max(...valores);
  const media = valores.reduce((total, valor) => total + valor, 0) / valores.length;
  return { minima, maxima, media: Number(media.toFixed(2)) };
}

async function buscarHistorico(sensor) {
  if (!sensor || !sensor.thingspeak_channel_id) {
    throw new ErroThingSpeak('Sensor sem canal ThingSpeak configurado');
  }

  try {
    const baseUrl = env.THINGSPEAK_BASE_URL.replace(/\/+$/, '');
    const canal = encodeURIComponent(sensor.thingspeak_channel_id);
    const url = `${baseUrl}/channels/${canal}/feeds.json?results=${QUANTIDADE_MAXIMA_FEEDS}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`ThingSpeak respondeu ${res.status}`);

    const dados = await res.json();
    if (!dados || !Array.isArray(dados.feeds)) throw new Error('Resposta inválida do ThingSpeak');

    const leituras = dados.feeds.map(normalizarFeed).filter(Boolean)
      .sort((a, b) => Date.parse(a.medido_em) - Date.parse(b.medido_em));
    return {
      canal: {
        temperatura: 'field1',
        umidade: 'field2',
        maxima: 'field3',
        minima: 'field4',
        media: 'field5',
      },
      quantidade: leituras.length,
      estatisticas: {
        temperatura: calcularEstatisticas(leituras, 'temperatura'),
        umidade: calcularEstatisticas(leituras, 'umidade'),
      },
      leituras,
    };
  } catch (erro) {
    if (erro instanceof ErroThingSpeak) throw erro;
    throw new ErroThingSpeak('Falha ao consultar o histórico do ThingSpeak', { cause: erro });
  }
}

module.exports = { buscarFeeds, buscarHistorico, simularFeeds, ErroThingSpeak };
