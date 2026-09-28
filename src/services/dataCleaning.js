
const TEMP_RANGE = [-40, 85];
const HUM_RANGE = [0, 100];
const MAX_JUMP_TEMP = 15; 
const MAX_JUMP_HUM = 40; 

const round1 = (n) => Math.round(n * 10) / 10;
const inRange = (n, [min, max]) => Number.isFinite(n) && n >= min && n <= max;


function cleanReading(raw, previous) {
  const flags = [];
  const temperature = Number(raw.temperature);
  const humidity = Number(raw.humidity);

  if (!inRange(temperature, TEMP_RANGE) || !inRange(humidity, HUM_RANGE)) {
    return { ok: false, flags, reason: 'valor_fora_do_intervalo_fisico' };
  }

  if (previous) {
    if (Math.abs(temperature - previous.temperature) > MAX_JUMP_TEMP) flags.push('salto_temperatura');
    if (Math.abs(humidity - previous.humidity) > MAX_JUMP_HUM) flags.push('salto_umidade');
  }

  return { ok: true, temperature: round1(temperature), humidity: round1(humidity), flags };
}

module.exports = { cleanReading, TEMP_RANGE, HUM_RANGE, MAX_JUMP_TEMP, MAX_JUMP_HUM };
