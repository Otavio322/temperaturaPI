const env = require('../config/env');
const { pool } = require('../config/db');
const climapi = require('../services/climapi');

const comandos = {
  async variaveis() {
    console.log(JSON.stringify(await climapi.listarVariaveis(), null, 2));
  },
  async execucoes() {
    const variavel = process.argv[3];
    if (!variavel) throw new Error('Uso: npm run climapi -- execucoes <variavel>');
    console.log(JSON.stringify(await climapi.listarExecucoes(variavel), null, 2));
  },
  async coletar() {
    console.log(JSON.stringify(await climapi.coletarTodas({ forcar: true }), null, 2));
  },
  async reprocessar() {
    console.log(await climapi.reprocessarColetas());
  },
};

async function main() {
  const nome = process.argv[2];
  if (!comandos[nome]) {
    console.error(`Uso: npm run climapi -- <${Object.keys(comandos).join('|')}>`);
    process.exit(1);
  }
  if (nome !== 'reprocessar' && (!env.CLIMAPI_CONSUMER_KEY || !env.CLIMAPI_CONSUMER_SECRET)) {
    console.error('Defina CLIMAPI_CONSUMER_KEY e CLIMAPI_CONSUMER_SECRET no .env');
    process.exit(1);
  }
  await comandos[nome]();
  await pool.end();
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
