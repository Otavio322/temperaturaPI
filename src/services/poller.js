const env = require('../config/env');
const sensoresRepo = require('../repositorios/sensores');
const leiturasRepo = require('../repositorios/leituras');
const alertasRepo = require('../repositorios/alertas');
const { buscarFeeds } = require('./thingspeak');
const { montarAlertas } = require('../utils/avaliacaoClimatica');

const FAIXA_TEMP_FISICA = [-40, 80];
const FAIXA_UMIDADE_FISICA = [0, 100];
const dentroDaFaixa = (n, [min, max]) => Number.isFinite(n) && n >= min && n <= max;

async function consultarSensor(sensor) {
  const feeds = await buscarFeeds(sensor);
  let gravadas = 0;
  let maisRecente = null;

  for (const feed of feeds) {
    const temperatura = Number(feed.field1);
    const umidade = Number(feed.field2);
    const medidoEm = feed.created_at ? new Date(feed.created_at) : new Date();
    const valida = dentroDaFaixa(temperatura, FAIXA_TEMP_FISICA) && dentroDaFaixa(umidade, FAIXA_UMIDADE_FISICA);

    const leitura = await leiturasRepo.criarSeNova({ idSensor: sensor.id_sensor, medidoEm, temperatura, umidade, valida });
    if (!leitura) continue; 
    gravadas += 1;
    if (!maisRecente || medidoEm > maisRecente) maisRecente = medidoEm;

    if (valida) {
      const faixa = { temp_min: sensor.temp_min, temp_max: sensor.temp_max, umidade_min: sensor.umidade_min, umidade_max: sensor.umidade_max };
      const alertas = montarAlertas({ temperatura, umidade, faixa, nomeFruta: sensor.fruta_nome });
      for (const alerta of alertas) {
        await alertasRepo.criar({ idSensor: sensor.id_sensor, idLeitura: leitura.id_leitura, ...alerta });
      }
    }
  }

  if (maisRecente) await sensoresRepo.atualizarUltimaLeitura(sensor.id_sensor, maisRecente);
  return { idSensor: sensor.id_sensor, gravadas };
}

async function consultarTodosOsSensores() {
  const sensores = await sensoresRepo.listarAtivos();
  const resultados = [];
  for (const sensor of sensores) {
    try {
      resultados.push(await consultarSensor(sensor));
    } catch (erro) {
      console.error(`Falha ao consultar o sensor ${sensor.codigo}:`, erro.message);
      resultados.push({ idSensor: sensor.id_sensor, erro: erro.message });
    }
  }
  return resultados;
}

async function verificarSensoresOffline() {
  const sensores = await sensoresRepo.listarAtivos();
  const limiteMs = env.SENSOR_OFFLINE_APOS_MIN * 60 * 1000;
  const criados = [];
  for (const sensor of sensores) {
    const semLeitura = !sensor.ultima_leitura_em || Date.now() - new Date(sensor.ultima_leitura_em).getTime() > limiteMs;
    if (!semLeitura) continue;
    if (await alertasRepo.existeAlertaOfflineNaoLido(sensor.id_sensor)) continue;
    criados.push(await alertasRepo.criar({
      idSensor: sensor.id_sensor,
      idLeitura: null,
      tipo: 'SENSOR_OFFLINE',
      severidade: 'ALTA',
      mensagem: `Sensor ${sensor.codigo} sem leituras há mais de ${env.SENSOR_OFFLINE_APOS_MIN} minutos.`,
    }));
  }
  return criados;
}

module.exports = { consultarSensor, consultarTodosOsSensores, verificarSensoresOffline };
