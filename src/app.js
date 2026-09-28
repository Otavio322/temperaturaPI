const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();


app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ['https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        
        'upgrade-insecure-requests': env.isProd ? [] : null,
      },
    },
  })
);


if (env.corsOrigins.length) {
  app.use(cors({
    origin: env.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
}

app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize()); 
app.use('/api', globalLimiter);


app.use('/api', (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (ms > env.SLOW_REQUEST_MS) console.warn(`Consulta lenta (${ms.toFixed(0)}ms > ${env.SLOW_REQUEST_MS}ms): ${req.method} ${req.originalUrl}`);
  });
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/fruits', require('./routes/fruits.routes'));
app.use('/api/devices', require('./routes/devices.routes')); // canais do ThingSpeak (RF01/RF02)
app.use('/api/readings', require('./routes/readings.routes'));
app.use('/api/dashboard', require('./routes/readings.routes').dashboard); // RF07 — dashboard de BI
app.use('/api/market', require('./routes/market.routes')); // RF03/RF04
app.use('/api/predictions', require('./routes/predictions.routes')); // RF06
app.use('/api/reports', require('./routes/reports.routes')); // RF11
app.use('/api/lgpd', require('./routes/lgpd.routes')); // RNF08
app.use('/api', notFound);

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: env.isProd ? '1h' : 0 }));

app.use(errorHandler);

module.exports = app;
