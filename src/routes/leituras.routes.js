const router = require('express').Router();
const sensoresRepo = require('../repositorios/sensores');
const leiturasRepo = require('../repositorios/leituras');
const propriedadesRepo = require('../repositorios/propriedades');
const schemas = require('../validators');
const { validar, idValido } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { ehAdmin } = require('../utils/acesso');
const { tiposForaDaFaixa } = require('../utils/avaliacaoClimatica');

router.use(autenticar);

async function buscarSensorComAcesso(req, idSensor) {
  const sensor = await sensoresRepo.buscarPorId(idSensor);
  if (!sensor) throw new ErroHttp(404, 'Sensor não encontrado');
  if (!ehAdmin(req.usuario) && !(await propriedadesRepo.usuarioTemAcesso(req.usuario.id_usuario, sensor.id_propriedade))) {
    throw new ErroHttp(404, 'Sensor não encontrado');
  }
  return sensor;
}

router.get('/:idSensor', idValido('idSensor'), validar(schemas.consultaLeituras, 'query'), assincrono(async (req, res) => {
  const sensor = await buscarSensorComAcesso(req, Number(req.params.idSensor));
  const { horas, pontos } = req.query;
  const desde = new Date(Date.now() - horas * 3600 * 1000);
  const leituras = await leiturasRepo.historicoAgregado(sensor.id_sensor, desde, pontos);
  res.json({
    sensor: { id_sensor: sensor.id_sensor, codigo: sensor.codigo, setor_codigo: sensor.setor_codigo },
    fruta: { nome: sensor.fruta_nome, temp_min: sensor.temp_min, temp_max: sensor.temp_max, umidade_min: sensor.umidade_min, umidade_max: sensor.umidade_max },
    leituras,
  });
}));

router.delete('/:idSensor', idValido('idSensor'), autorizar('ADMIN'), assincrono(async (req, res) => {
  const quantidadeExcluida = await leiturasRepo.excluirPorSensor(Number(req.params.idSensor));
  res.json({ ok: true, quantidadeExcluida });
}));

module.exports = router;

const painel = require('express').Router();
painel.get('/', autenticar, assincrono(async (req, res) => {
  const sensores = ehAdmin(req.usuario)
    ? await sensoresRepo.listar()
    : (await Promise.all((await propriedadesRepo.listar({ idUsuario: req.usuario.id_usuario, somenteVinculadas: true }))
        .map((p) => sensoresRepo.listarPorPropriedade(p.id_propriedade)))).flat();

  const itens = await Promise.all(sensores.map(async (sensor) => {
    const recente = await leiturasRepo.maisRecenteValida(sensor.id_sensor);
    const faixa = { temp_min: sensor.temp_min, temp_max: sensor.temp_max, umidade_min: sensor.umidade_min, umidade_max: sensor.umidade_max };
    const problemas = recente ? tiposForaDaFaixa(Number(recente.temperatura), Number(recente.umidade), faixa) : [];
    return {
      id_sensor: sensor.id_sensor,
      codigo: sensor.codigo,
      status: sensor.status,
      setor_codigo: sensor.setor_codigo,
      id_propriedade: sensor.id_propriedade,
      fruta: { nome: sensor.fruta_nome, temp_min: sensor.temp_min, temp_max: sensor.temp_max, umidade_min: sensor.umidade_min, umidade_max: sensor.umidade_max },
      leitura_recente: recente ? { temperatura: Number(recente.temperatura), umidade: Number(recente.umidade), medido_em: recente.medido_em } : null,
      situacao: !recente ? 'sem_leitura' : problemas.length ? 'alerta' : 'ok',
      problemas,
      ultima_leitura_em: sensor.ultima_leitura_em,
    };
  }));

  res.json({ sensores: itens, horaServidor: new Date().toISOString() });
}));
module.exports.painel = painel;
