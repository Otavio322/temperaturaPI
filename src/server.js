const env = require('./config/env');
const { conectarBanco } = require('./config/db');
const app = require('./app');
const agendador = require('./services/scheduler');

async function main() {
  await conectarBanco();
  agendador.iniciar();
  const servidor = app.listen(env.PORT, () => console.log(`Climora rodando na porta ${env.PORT}`));

  const encerrar = (sinal) => {
    console.log(`${sinal} recebido, encerrando...`);
    agendador.parar();
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

main().catch((err) => {
  console.error('Falha ao iniciar:', err.message);
  process.exit(1);
});
