const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const scheduler = require('./services/scheduler');

async function main() {
  await connectDB();
  scheduler.start(); 
  const server = app.listen(env.PORT, () => console.log(`Ponto Certo rodando na porta ${env.PORT}`));

  const shutdown = (signal) => {
    console.log(`${signal} recebido, encerrando...`);
    scheduler.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Falha ao iniciar:', err.message);
  process.exit(1);
});
