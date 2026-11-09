UPDATE previsao_temperatura p
JOIN (
  SELECT id_sensor,
         DATE_FORMAT(medido_em, '%Y-%m-%d %H:00:00') AS hora,
         AVG(temperatura) AS media
  FROM leitura_climatica
  WHERE valida = TRUE
  GROUP BY id_sensor, hora
) l ON l.id_sensor = p.id_sensor AND l.hora = p.valida_para
SET p.temperatura_real = ROUND(l.media, 2)
WHERE p.temperatura_real IS NULL AND p.valida_para < NOW();

SELECT modelo, horizonte_h, COUNT(*) AS n,
       ROUND(AVG(ABS(temperatura_prevista - temperatura_real)), 2) AS mae
FROM previsao_temperatura
WHERE temperatura_real IS NOT NULL
GROUP BY modelo, horizonte_h;
