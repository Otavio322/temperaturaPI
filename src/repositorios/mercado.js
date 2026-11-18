const { pool } = require('../config/db');

function normalizarOrigem(origem) {
  const valor = String(origem || 'SIMULADO').toUpperCase();
  return valor === 'EXTERNO' ? 'EXTERNO' : 'SIMULADO';
}

async function criar({ idFruta, price, demandIndex, source = 'SIMULADO' }) {
  const origem = normalizarOrigem(source);
  const [resultado] = await pool.execute(
    'INSERT INTO mercado (id_fruta, preco_referencia, indice_demanda, origem) VALUES (:idFruta, :price, :demandIndex, :origem)',
    { idFruta, price, demandIndex, origem }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idMercado) {
  const [linhas] = await pool.execute(
    `SELECT m.*, f.nome AS fruta_nome
     FROM mercado m
     JOIN fruta f ON f.id_fruta = m.id_fruta
     WHERE m.id_mercado = :idMercado`,
    { idMercado }
  );
  return linhas[0] || null;
}

async function listar({ idFruta, limite = 30 } = {}) {
  const limiteMax = Math.min(Number(limite) || 30, 300);
  const where = idFruta ? ' WHERE m.id_fruta = :idFruta' : '';
  const [linhas] = await pool.execute(
    `SELECT m.*, f.nome AS fruta_nome
     FROM mercado m
     JOIN fruta f ON f.id_fruta = m.id_fruta
     ${where}
     ORDER BY m.registrado_em DESC
     LIMIT ${limiteMax}`,
    idFruta ? { idFruta } : {}
  );
  return linhas;
}

async function buscarUltimaPorFruta(idFruta) {
  const [linhas] = await pool.execute(
    `SELECT * FROM mercado WHERE id_fruta = :idFruta ORDER BY registrado_em DESC LIMIT 1`,
    { idFruta }
  );
  return linhas[0] || null;
}

async function criarSimulado(idFruta) {
  const anterior = await buscarUltimaPorFruta(idFruta);
  const base = anterior ? Number(anterior.preco_referencia) : 2 + Math.random() * 3;
  const price = Math.max(0.2, Number((base + (Math.random() - 0.5) * 0.3).toFixed(2)));
  const demandIndex = Math.min(100, Math.max(0, Math.round((anterior?.indice_demanda ?? 50) + (Math.random() - 0.5) * 15)));

  return criar({ idFruta, price, demandIndex, source: 'SIMULADO' });
}

module.exports = { criar, buscarPorId, listar, buscarUltimaPorFruta, criarSimulado };
