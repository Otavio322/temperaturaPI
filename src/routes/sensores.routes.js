const router = require('express').Router();
const sensoresRepo = require('../repositorios/sensores');
const setoresRepo = require('../repositorios/setores');
const propriedadesRepo = require('../repositorios/propriedades');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ehAdmin } = require('../utils/acesso');
const { consultarSensor } = require('../services/poller');

router.use(autenticar);

async function exigirAcessoPropriedade(req, idPropriedade) {
  if (ehAdmin(req.usuario)) return;
  if (!(await propriedadesRepo.usuarioTemAcesso(req.usuario.id_usuario, idPropriedade))) {
    throw new ErroHttp(404, 'Propriedade não encontrada');
  }
}

router.get('/', assincrono(async (req, res) => {
  const idPropriedade = req.query.idPropriedade ? Number(req.query.idPropriedade) : null;
  if (idPropriedade) {
    await exigirAcessoPropriedade(req, idPropriedade);
    return res.json({ sensores: await sensoresRepo.listarPorPropriedade(idPropriedade) });
  }
  if (!ehAdmin(req.usuario)) throw new ErroHttp(400, 'Informe idPropriedade');
  res.json({ sensores: await sensoresRepo.listar() });
}));

router.post('/', autorizar('ADMIN'), validar(schemas.criarSensor), assincrono(async (req, res) => {
  if (!(await setoresRepo.buscarPorId(req.body.idSetor))) throw new ErroHttp(400, 'Setor inexistente');
  res.status(201).json({ sensor: await sensoresRepo.criar(req.body) });
}));

router.put('/:id', idValido(), autorizar('ADMIN'), validar(schemas.atualizarSensor), assincrono(async (req, res) => {
  if (req.body.idSetor && !(await setoresRepo.buscarPorId(req.body.idSetor))) throw new ErroHttp(400, 'Setor inexistente');
  const sensor = await sensoresRepo.atualizar(Number(req.params.id), req.body);
  if (!sensor) throw new ErroHttp(404, 'Sensor não encontrado');
  res.json({ sensor });
}));

router.post('/:id/consultar-agora', idValido(), autorizar('ADMIN'), assincrono(async (req, res) => {
  const sensor = await sensoresRepo.buscarPorId(Number(req.params.id));
  if (!sensor) throw new ErroHttp(404, 'Sensor não encontrado');
  res.json({ ok: true, ...(await consultarSensor(sensor)) });
}));

router.delete('/:id', idValido(), autorizar('ADMIN'), assincrono(async (req, res) => {
  if (!(await sensoresRepo.excluir(Number(req.params.id)))) throw new ErroHttp(404, 'Sensor não encontrado');
  res.json({ ok: true });
}));

module.exports = router;
