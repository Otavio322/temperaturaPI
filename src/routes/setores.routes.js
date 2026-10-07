const router = require('express').Router();
const setoresRepo = require('../repositorios/setores');
const propriedadesRepo = require('../repositorios/propriedades');
const frutasRepo = require('../repositorios/frutas');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ehAdmin } = require('../utils/acesso');

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
    return res.json({ setores: await setoresRepo.listarPorPropriedade(idPropriedade) });
  }
  if (!ehAdmin(req.usuario)) throw new ErroHttp(400, 'Informe idPropriedade');
  res.json({ setores: await setoresRepo.listar() });
}));

router.post('/', autorizar('ADMIN'), validar(schemas.criarSetor), assincrono(async (req, res) => {
  if (!(await propriedadesRepo.buscarPorId(req.body.idPropriedade))) throw new ErroHttp(400, 'Propriedade inexistente');
  if (!(await frutasRepo.buscarPorId(req.body.idFruta))) throw new ErroHttp(400, 'Fruta inexistente');
  res.status(201).json({ setor: await setoresRepo.criar(req.body) });
}));

router.put('/:id', idValido(), autorizar('ADMIN'), validar(schemas.atualizarSetor), assincrono(async (req, res) => {
  if (req.body.idFruta && !(await frutasRepo.buscarPorId(req.body.idFruta))) throw new ErroHttp(400, 'Fruta inexistente');
  const setor = await setoresRepo.atualizar(Number(req.params.id), req.body);
  if (!setor) throw new ErroHttp(404, 'Setor não encontrado');
  res.json({ setor });
}));

router.delete('/:id', idValido(), autorizar('ADMIN'), assincrono(async (req, res) => {
  if (!(await setoresRepo.excluir(Number(req.params.id)))) throw new ErroHttp(404, 'Setor não encontrado');
  res.json({ ok: true });
}));

module.exports = router;
