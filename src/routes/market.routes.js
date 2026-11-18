const router = require('express').Router();
const mercadoRepo = require('../repositorios/mercado');
const frutasRepo = require('../repositorios/frutas');
const schemas = require('../validators');
const { validar } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ingestMarketData } = require('../services/marketData');

router.use(autenticar);

router.get('/', validar(schemas.consultaMercado, 'query'), assincrono(async (req, res) => {
  const { idFruta, limite } = req.query;
  const dados = await mercadoRepo.listar({ idFruta, limite });
  res.json({ dados });
}));

router.post('/', autorizar('ADMIN'), validar(schemas.criarMercado), assincrono(async (req, res) => {
  if (!(await frutasRepo.buscarPorId(req.body.idFruta))) throw new ErroHttp(400, 'Fruta inexistente');
  const entrada = await mercadoRepo.criar({
    idFruta: req.body.idFruta,
    price: req.body.price,
    demandIndex: req.body.demandIndex,
    source: req.body.source || 'EXTERNO',
  });
  res.status(201).json({ entrada });
}));

router.post('/ingest-now', autorizar('ADMIN'), assincrono(async (req, res) => {
  const created = await ingestMarketData();
  res.json({ ok: true, created: created.length });
}));

module.exports = router;
