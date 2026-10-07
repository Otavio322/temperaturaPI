const { pool } = require('../config/db');

const CAMPOS_PUBLICOS = 'id_usuario, nome, email, perfil, ativo, ultimo_login_em, criado_em';

async function criar({ nome, email, senhaHash, perfil }) {
  const [resultado] = await pool.execute(
    'INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (:nome, :email, :senhaHash, :perfil)',
    { nome, email, senhaHash, perfil }
  );
  return buscarPorId(resultado.insertId);
}

async function buscarPorId(idUsuario) {
  const [linhas] = await pool.execute(`SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE id_usuario = :idUsuario`, { idUsuario });
  return linhas[0] || null;
}

async function buscarPorEmailComSenha(email) {
  const [linhas] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS}, senha_hash FROM usuario WHERE email = :email`,
    { email }
  );
  return linhas[0] || null;
}

async function emailEmUso(email, ignorarIdUsuario = null) {
  const [linhas] = await pool.execute(
    'SELECT id_usuario FROM usuario WHERE email = :email AND id_usuario <> :ignorarIdUsuario',
    { email, ignorarIdUsuario: ignorarIdUsuario || 0 }
  );
  return linhas.length > 0;
}

async function listar({ perfil } = {}) {
  if (perfil) {
    const [linhas] = await pool.execute(`SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE perfil = :perfil ORDER BY nome`, { perfil });
    return linhas;
  }
  const [linhas] = await pool.execute(`SELECT ${CAMPOS_PUBLICOS} FROM usuario ORDER BY nome`);
  return linhas;
}

async function atualizar(idUsuario, dados) {
  const campos = [];
  const valores = { idUsuario };
  for (const [coluna, chave] of [['nome', 'nome'], ['email', 'email'], ['perfil', 'perfil'], ['ativo', 'ativo']]) {
    if (dados[chave] !== undefined) { campos.push(`${coluna} = :${chave}`); valores[chave] = dados[chave]; }
  }
  if (campos.length) await pool.execute(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = :idUsuario`, valores);
  return buscarPorId(idUsuario);
}

async function atualizarSenha(idUsuario, senhaHash) {
  await pool.execute('UPDATE usuario SET senha_hash = :senhaHash WHERE id_usuario = :idUsuario', { idUsuario, senhaHash });
}

async function registrarLogin(idUsuario) {
  await pool.execute('UPDATE usuario SET ultimo_login_em = NOW() WHERE id_usuario = :idUsuario', { idUsuario });
}

async function excluir(idUsuario) {
  const [resultado] = await pool.execute('DELETE FROM usuario WHERE id_usuario = :idUsuario', { idUsuario });
  return resultado.affectedRows > 0;
}

module.exports = { criar, buscarPorId, buscarPorEmailComSenha, emailEmUso, listar, atualizar, atualizarSenha, registrarLogin, excluir };
