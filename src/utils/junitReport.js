function contar(xml, tag) {
  return (xml.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
}

function resumirJUnit(xml) {
  if (typeof xml !== 'string' || !/<testsuites(?:\s|>)/i.test(xml) || !/<\/testsuites>\s*$/i.test(xml.trim())) {
    throw new Error('O arquivo de relatório JUnit é inválido.');
  }

  const testes = contar(xml, 'testcase');
  const falhas = contar(xml, 'failure');
  const erros = contar(xml, 'error');
  const ignorados = contar(xml, 'skipped');
  const aprovados = Math.max(0, testes - falhas - erros - ignorados);

  return {
    testes,
    aprovados,
    falhas,
    erros,
    ignorados,
    taxaSucesso: testes ? Math.round((aprovados / testes) * 100) : 0,
  };
}

module.exports = { resumirJUnit };
