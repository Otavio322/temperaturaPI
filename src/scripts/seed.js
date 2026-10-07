const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { pool } = require('../config/db');
const usuarios = require('../repositorios/usuarios');

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD não definidos no .env: nenhum admin foi criado/atualizado.');
    return pool.end();
  }

  const email = env.ADMIN_EMAIL.toLowerCase();
  const senhaHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const existente = await usuarios.buscarPorEmailComSenha(email);

  if (existente) {
    await usuarios.atualizarSenha(existente.id_usuario, senhaHash);
    if (existente.perfil !== 'ADMIN') await usuarios.atualizar(existente.id_usuario, { perfil: 'ADMIN' });
    console.log(`Usuário ${email} já existia — senha redefinida e perfil garantido como ADMIN.`);
  } else {
    await usuarios.criar({ nome: env.ADMIN_NAME, email, senhaHash, perfil: 'ADMIN' });
    console.log(`Administrador criado: ${email}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
