const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { limitadorGlobal } = require('./middleware/rateLimit');
const { naoEncontrado, tratadorDeErros } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

if (env.origensCors.length) {
  app.use(cors({
    origin: env.origensCors,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
} else if (env.ehProducao) {
  console.warn('CORS_ORIGINS não configurado em produção: nenhuma origem de frontend poderá chamar esta API.');
}

app.use(express.json({ limit: '10kb' }));
app.use(limitadorGlobal);

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    if (ms > env.SLOW_REQUEST_MS) console.warn(`Consulta lenta (${ms.toFixed(0)}ms > ${env.SLOW_REQUEST_MS}ms): ${req.method} ${req.originalUrl}`);
  });
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/autenticacao', require('./routes/autenticacao.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/propriedades', require('./routes/propriedades.routes'));
app.use('/api/frutas', require('./routes/frutas.routes'));
app.use('/api/setores', require('./routes/setores.routes'));
app.use('/api/sensores', require('./routes/sensores.routes'));
app.use('/api/leituras', require('./routes/leituras.routes'));
app.use('/api/painel', require('./routes/leituras.routes').painel);
app.use('/api/alertas', require('./routes/alertas.routes'));

app.use(naoEncontrado);
app.use(tratadorDeErros);

module.exports = app;
