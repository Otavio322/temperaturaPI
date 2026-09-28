
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Fruit = require('../models/Fruit');
const Device = require('../models/Device');


const FRUITS = [
  { name: 'Manga', tempMin: 10, tempMax: 13, humMin: 85, humMax: 90 },
  { name: 'Uva', tempMin: 0, tempMax: 2, humMin: 90, humMax: 95 },
  { name: 'Banana', tempMin: 13, tempMax: 15, humMin: 90, humMax: 95 },
  { name: 'Goiaba', tempMin: 5, tempMax: 10, humMin: 85, humMax: 90 },
  { name: 'Mamão', tempMin: 10, tempMax: 13, humMin: 85, humMax: 90 },
];

async function main() {
  await connectDB();

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const email = env.ADMIN_EMAIL.toLowerCase();
    if (await User.exists({ email })) {
      console.log(`Administrador do Sistema ${email} já existe.`);
    } else {
      const admin = new User({ name: env.ADMIN_NAME, email, role: 'admin' });
      await admin.setPassword(env.ADMIN_PASSWORD);
      await admin.save();
      console.log(`Administrador do Sistema criado: ${email}`);
    }
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum admin criado.');
  }

  const fruitDocs = {};
  for (const f of FRUITS) {
    await Fruit.updateOne({ name: f.name }, { $setOnInsert: f }, { upsert: true });
    fruitDocs[f.name] = await Fruit.findOne({ name: f.name });
  }

  if (!(await Device.exists({ name: 'Câmara de exemplo (simulada)' }))) {
    await Device.create({
      name: 'Câmara de exemplo (simulada)',
      location: 'Petrolina/PE',
      fruit: fruitDocs['Manga']._id,
      simulate: true, 
    });
    console.log('Canal de exemplo criado em modo simulado.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
