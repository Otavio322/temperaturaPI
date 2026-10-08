const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

async function main() {
  const caminho = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(caminho, 'utf8');

  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    // O schema.sql não dá mais "USE banco" (provedores como o Clever Cloud não deixam o usuário do
    // addon criar/trocar de banco) — então quem diz qual banco usar agora é esta conexão.
    database: process.env.DB_NAME,
    multipleStatements: true, // só este script liga isso — nunca em consultas vindas de fora
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });

  console.log(`Executando ${caminho} ...`);
  await conexao.query(sql);
  console.log('Schema criado com sucesso (banco recriado do zero, com os dados de exemplo do arquivo).');
  await conexao.end();
}

main().catch((err) => {
  console.error('Falha ao migrar:', err.message);
  process.exit(1);
});
