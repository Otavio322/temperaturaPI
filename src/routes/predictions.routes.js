const router = require('express').Router();
const { pool } = require('../config/db');
const frutasRepo = require('../repositorios/frutas');
const propriedadesRepo = require('../repositorios/propriedades');
const sensoresRepo = require('../repositorios/sensores');
const configuracaoModeloRepo = require('../repositorios/configuracaoModeloColheita');
const mercadoRepo = require('../repositorios/mercado');
const previsoesColheitaRepo = require('../repositorios/previsoesColheita');
const schemas = require('../validators');
const { validar } = require('../middleware/validate');
const { autenticar, autorizar } = require('../middleware/auth');
const { assincrono, ErroHttp } = require('../utils/httpError');
const { generatePrediction } = require('../services/prediction');
const { emitirAlertaJanelaIdeal } = require('../services/harvestAlerts');
const { idsPropriedadesVisiveis } = require('../utils/acesso');

function exigirConfiguracaoModelo(configuracao) {
  if (!configuracao) {
    throw new ErroHttp(503, 'Configuração do modelo indisponível. Aplique a migração de configuração do modelo.');
  }
  return configuracao;
}

function mapearConfiguracaoModelo(configuracao) {
  const atual = exigirConfiguracaoModelo(configuracao);
  return {
    climateWeight: atual.pesoClima,
    harvestThreshold: atual.limiarColher,
    monitorThreshold: atual.limiarMonitorar,
  };
}

async function listarLeiturasRecentes(idFruta, limite = 200, idsPropriedades = null) {
  const parametros = { idFruta, limite };
  let filtroPropriedades = '';
  if (Array.isArray(idsPropriedades)) {
    if (!idsPropriedades.length) return [];
    const placeholders = idsPropriedades.map((idPropriedade, indice) => {
      const nome = `idPropriedade${indice}`;
      parametros[nome] = idPropriedade;
      return `:${nome}`;
    });
    filtroPropriedades = ` AND st.id_propriedade IN (${placeholders.join(', ')})`;
  }

  const [linhas] = await pool.execute(
    `SELECT l.temperatura, l.umidade
     FROM leitura_climatica l
     JOIN sensor se ON se.id_sensor = l.id_sensor
     JOIN setor st ON st.id_setor = se.id_setor
     WHERE st.id_fruta = :idFruta AND l.valida = TRUE${filtroPropriedades}
     ORDER BY l.medido_em DESC
     LIMIT :limite`,
    parametros
  );

  return linhas.map((linha) => ({
    temperature: Number(linha.temperatura),
    humidity: Number(linha.umidade),
  }));
}

function mapearMercado(dados = []) {
  return dados.map((item) => ({
    price: Number(item.preco_referencia),
    demandIndex: Number(item.indice_demanda),
    recordedAt: item.registrado_em,
  }));
}

router.use(autenticar);

router.get('/historico', validar(schemas.predictionHistoryQuery, 'query'), assincrono(async (req, res) => {
  const { fruit, limit } = req.query;
  const fruta = await frutasRepo.buscarPorId(fruit);
  if (!fruta) throw new ErroHttp(404, 'Fruta não encontrada');
  const ehAnalista = req.usuario.perfil === 'ANALISTA';
  if (ehAnalista && !(await propriedadesRepo.listarIdsFrutasVinculadas(req.usuario.id_usuario)).includes(Number(fruit))) {
    throw new ErroHttp(404, 'Fruta não encontrada');
  }
  const historico = await previsoesColheitaRepo.listar({
    idFruta: fruit,
    limite: limit,
    idUsuario: ehAnalista ? req.usuario.id_usuario : null,
  });
  res.json({ historico });
}));

router.get('/configuracao', autorizar('ANALISTA', 'ADMIN'), assincrono(async (_req, res) => {
  const configuracao = exigirConfiguracaoModelo(await configuracaoModeloRepo.buscar());
  res.json({ configuracao });
}));

router.put(
  '/configuracao',
  autorizar('ANALISTA', 'ADMIN'),
  validar(schemas.atualizarConfiguracaoModelo),
  assincrono(async (req, res) => {
    const configuracao = exigirConfiguracaoModelo(await configuracaoModeloRepo.atualizar({
      ...req.body,
      idUsuario: req.usuario.id_usuario,
    }));
    res.json({ configuracao });
  })
);

router.get('/', validar(schemas.predictionQuery, 'query'), assincrono(async (req, res) => {
  const { fruit, limit } = req.query;
  const ehAnalista = req.usuario.perfil === 'ANALISTA';
  const idsFrutasVinculadas = ehAnalista
    ? await propriedadesRepo.listarIdsFrutasVinculadas(req.usuario.id_usuario)
    : null;
  const frutas = fruit
    ? [await frutasRepo.buscarPorId(fruit)]
    : await frutasRepo.listar();

  const lista = frutas
    .filter((fruta) => fruta && (!ehAnalista || idsFrutasVinculadas.includes(Number(fruta.id_fruta))))
    .slice(0, Number(limit || 10));
  if (!lista.length && fruit) throw new ErroHttp(404, 'Fruta não encontrada');
  const idsPropriedades = ehAnalista
    ? (await propriedadesRepo.listar({ idUsuario: req.usuario.id_usuario, somenteVinculadas: true }))
      .map((propriedade) => propriedade.id_propriedade)
    : null;
  const modelConfig = mapearConfiguracaoModelo(await configuracaoModeloRepo.buscar());

  const predictions = await Promise.all(lista.map(async (fruta) => {
    const readings = await listarLeiturasRecentes(fruta.id_fruta, 200, idsPropriedades);
    const mercado = await mercadoRepo.listar({ idFruta: fruta.id_fruta, limite: 30 });
    return generatePrediction({
      fruitId: fruta.id_fruta,
      fruit: {
        tempMin: Number(fruta.temp_min),
        tempMax: Number(fruta.temp_max),
        humMin: Number(fruta.umidade_min),
        humMax: Number(fruta.umidade_max),
      },
      readings,
      marketPoints: mapearMercado(mercado),
      modelConfig,
    });
  }));

  res.json({ predictions });
}));

router.post('/', autorizar('PRODUTOR', 'ANALISTA', 'ADMIN'), validar(schemas.predictionGenerate), assincrono(async (req, res) => {
  const fruta = await frutasRepo.buscarPorId(req.body.fruit);
  if (!fruta) throw new ErroHttp(404, 'Fruta não encontrada');
  const ehAnalista = req.usuario.perfil === 'ANALISTA';
  const idsFrutasVinculadas = ehAnalista
    ? await propriedadesRepo.listarIdsFrutasVinculadas(req.usuario.id_usuario)
    : null;
  if (ehAnalista && !idsFrutasVinculadas.includes(Number(fruta.id_fruta))) {
    throw new ErroHttp(404, 'Fruta não encontrada');
  }

  const idsPropriedades = ehAnalista
    ? (await propriedadesRepo.listar({ idUsuario: req.usuario.id_usuario, somenteVinculadas: true }))
      .map((propriedade) => propriedade.id_propriedade)
    : null;
  if (ehAnalista && req.body.device) {
    const sensor = await sensoresRepo.buscarPorId(req.body.device);
    if (!sensor || !idsPropriedades.includes(Number(sensor.id_propriedade)) || Number(sensor.id_fruta) !== Number(fruta.id_fruta)) {
      throw new ErroHttp(404, 'Sensor não encontrado');
    }
  }
  const readings = await listarLeiturasRecentes(fruta.id_fruta, 200, idsPropriedades);
  const mercado = await mercadoRepo.listar({ idFruta: fruta.id_fruta, limite: 30 });
  const modelConfig = mapearConfiguracaoModelo(await configuracaoModeloRepo.buscar());
  const prediction = await generatePrediction({
    fruitId: fruta.id_fruta,
    deviceId: req.body.device || null,
    userId: req.usuario.id_usuario,
    fruit: {
      tempMin: Number(fruta.temp_min),
      tempMax: Number(fruta.temp_max),
      humMin: Number(fruta.umidade_min),
      humMax: Number(fruta.umidade_max),
    },
    readings,
    marketPoints: mapearMercado(mercado),
    modelConfig,
  });

  await previsoesColheitaRepo.criar({ prediction, fruitName: fruta.nome });

  await emitirAlertaJanelaIdeal(prediction, {
    idsPropriedades: await idsPropriedadesVisiveis(req.usuario),
    nomeFruta: fruta.nome,
  });

  res.status(201).json({ prediction });
}));

module.exports = router;