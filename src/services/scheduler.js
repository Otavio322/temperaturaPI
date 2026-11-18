const env = require('../config/env');
const { consultarTodosOsSensores, verificarSensoresOffline } = require('./poller');
const { coletarTodas, logarVariaveisDisponiveis } = require('./climapi');
const { ingestMarketData } = require('./marketData');

let temporizadores = [];

function iniciar() {
  if (!env.agendadoresAtivos) return;
  const t1 = setInterval(() => consultarTodosOsSensores().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message)), env.THINGSPEAK_POLL_INTERVAL_MS);
  const t2 = setInterval(() => verificarSensoresOffline().catch((e) => console.error('Erro ao verificar sensores offline:', e.message)), Math.max(60000, env.THINGSPEAK_POLL_INTERVAL_MS));
  t1.unref(); t2.unref();
  temporizadores = [t1, t2];

  if (env.climapiAtivo) {
    const coletar = () => coletarTodas().catch((e) => console.error('Erro no agendador da ClimAPI:', e.message));
    const t3 = setInterval(coletar, env.CLIMAPI_INTERVALO_HORAS * 3600 * 1000);
    t3.unref();
    temporizadores.push(t3);
    coletar();
  } else if (env.CLIMAPI_CONSUMER_KEY && env.CLIMAPI_CONSUMER_SECRET) {
    logarVariaveisDisponiveis().catch((e) => console.error('Erro ao listar variáveis da ClimAPI:', e.message));
  }

  if (env.MARKET_SIMULATE === 'true') {
    const mercado = () => ingestMarketData().catch((e) => console.error('Erro no agendador de mercado:', e.message));
    const t4 = setInterval(mercado, env.MARKET_POLL_INTERVAL_MS);
    t4.unref();
    temporizadores.push(t4);
    mercado();
  }

  consultarTodosOsSensores().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message));
}

function parar() {
  temporizadores.forEach(clearInterval);
  temporizadores = [];
}

module.exports = { iniciar, parar };