const router = require('express').Router();
const fs = require('node:fs/promises');
const path = require('node:path');
const auditoriaRepo = require('../repositorios/auditoria');
const { autenticar, autorizar } = require('../middleware/auth');
const { ErroHttp, assincrono } = require('../utils/httpError');
const { resumirJUnit } = require('../utils/junitReport');

const CAMINHO_JUNIT = path.resolve(__dirname, '../../test-results.xml');

router.use(autenticar, autorizar('ADMIN'));

async function lerJUnit() {
  try {
    const [conteudo, arquivo] = await Promise.all([
      fs.readFile(CAMINHO_JUNIT, 'utf8'),
      fs.stat(CAMINHO_JUNIT),
    ]);
    return { conteudo, geradoEm: arquivo.mtime.toISOString() };
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      throw new ErroHttp(404, 'Relatório JUnit indisponível. Gere-o com npm run test:report.');
    }
    throw erro;
  }
}

router.get('/seguranca', assincrono(async (req, res) => {
  const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 30));
  const [resumo, falhasRecentes] = await Promise.all([
    auditoriaRepo.listarResumo({ dias, limite: 20 }),
    auditoriaRepo.listarFalhasRecentes({ dias, limite: 50 }),
  ]);

  res.json({
    periodoDias: dias,
    porAcao: resumo,
    falhasRecentes,
    geradoEm: new Date().toISOString(),
  });
}));

router.get('/qualidade', assincrono(async (req, res) => {
  const { conteudo, geradoEm } = await lerJUnit();
  res.json({ ...resumirJUnit(conteudo), geradoEm });
}));

router.get('/qualidade/junit', assincrono(async (req, res) => {
  const { conteudo } = await lerJUnit();
  resumirJUnit(conteudo);
  res.type('application/xml');
  res.attachment('relatorio-testes.xml');
  res.send(conteudo);
}));

module.exports = router;
