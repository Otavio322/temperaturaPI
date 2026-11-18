const router = require('express').Router();
const frutasRepo = require('../repositorios/frutas');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const propriedadesRepo = require('../repositorios/propriedades');

router.use(autenticar);

router.get('/', assincrono(async (req, res) => {
  const frutas = await frutasRepo.listar();
  if (req.usuario.perfil !== 'ANALISTA') return res.json({ frutas });
  const idsFrutas = await propriedadesRepo.listarIdsFrutasVinculadas(req.usuario.id_usuario);
  res.json({ frutas: frutas.filter((f) => idsFrutas.includes(Number(f.id_fruta))) });
}));

router.post('/', autorizar('ADMIN'), validar(schemas.criarFruta), assincrono(async (req, res) => {
  res.status(201).json({ fruta: await frutasRepo.criar(req.body) });
}));

router.put('/:id', idValido(), autorizar('ADMIN'), validar(schemas.atualizarFruta), assincrono(async (req, res) => {
  const fruta = await frutasRepo.atualizar(Number(req.params.id), req.body);
  if (!fruta) throw new ErroHttp(404, 'Fruta não encontrada');
  res.json({ fruta });
}));

router.delete('/:id', idValido(), autorizar('ADMIN'), assincrono(async (req, res) => {
  if (await frutasRepo.estaEmUso(Number(req.params.id))) {
    throw new ErroHttp(409, 'Esta fruta está em uso por um setor. Troque a fruta do setor antes de excluir.');
  }
  if (!(await frutasRepo.excluir(Number(req.params.id)))) throw new ErroHttp(404, 'Fruta não encontrada');
  res.json({ ok: true });
}));

module.exports = router;
