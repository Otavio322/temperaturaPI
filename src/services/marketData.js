const env = require('../config/env');
const frutasRepo = require('../repositorios/frutas');
const mercadoRepo = require('../repositorios/mercado');

async function ingestMarketData() {
  if (env.MARKET_SIMULATE !== 'true') return [];

  const frutas = await frutasRepo.listar();
  const criados = [];
  for (const fruta of frutas) {
    criados.push(await mercadoRepo.criarSimulado(fruta.id_fruta));
  }
  return criados;
}

module.exports = { ingestMarketData };
