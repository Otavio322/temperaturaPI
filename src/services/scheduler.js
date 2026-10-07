const env = require('../config/env');
const { consultarTodosOsSensores, verificarSensoresOffline } = require('./poller');

let temporizadores = [];

function iniciar() {
  if (!env.agendadoresAtivos) return;
  const t1 = setInterval(() => consultarTodosOsSensores().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message)), env.THINGSPEAK_POLL_INTERVAL_MS);
  const t2 = setInterval(() => verificarSensoresOffline().catch((e) => console.error('Erro ao verificar sensores offline:', e.message)), Math.max(60000, env.THINGSPEAK_POLL_INTERVAL_MS));
  t1.unref(); t2.unref();
  temporizadores = [t1, t2];
  consultarTodosOsSensores().catch((e) => console.error('Erro no agendador do ThingSpeak:', e.message));
}

function parar() {
  temporizadores.forEach(clearInterval);
  temporizadores = [];
}

module.exports = { iniciar, parar };
