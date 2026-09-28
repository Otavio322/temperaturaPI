// Compara uma leitura com o perfil ideal da fruta.
function evaluate(temperature, humidity, fruit) {
  if (!fruit) return { status: 'sem_perfil', issues: [] };
  const issues = [];
  if (temperature < fruit.tempMin) issues.push('temperatura_baixa');
  if (temperature > fruit.tempMax) issues.push('temperatura_alta');
  if (humidity < fruit.humMin) issues.push('umidade_baixa');
  if (humidity > fruit.humMax) issues.push('umidade_alta');
  return { status: issues.length ? 'alerta' : 'ok', issues };
}

const idealOf = (fruit) =>
  fruit ? { tempMin: fruit.tempMin, tempMax: fruit.tempMax, humMin: fruit.humMin, humMax: fruit.humMax } : null;

module.exports = { evaluate, idealOf };
