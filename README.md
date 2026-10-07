# Climora — Backend (monitoramento climático para propriedades agrícolas)

API em Node.js/Express para o monitoramento de temperatura e umidade de setores agrícolas no Vale do
São Francisco. Sensores (ESP32 + DHT22) publicam no ThingSpeak; este backend consulta os canais,
grava o histórico e gera alertas quando a leitura sai da faixa ideal da fruta de cada setor.

Este repositório é **só o backend** (API + schema do banco). O painel web é um projeto à parte, que
consome esta API — ver `CORS_ORIGINS` em [Como rodar](#como-rodar).

## Banco de dados

O schema é exatamente o de `src/db/schema.sql` (MySQL 8.0+ / MariaDB 10.6+), com 8 tabelas:

```
usuario ──┐                                   fruta
          │ usuario_propriedade (N:N)            │
          └──── propriedade ──── setor ───────────┘
                                    │
                                 sensor ──── leitura_climatica
                                    │
                                 alerta (referencia sensor e, opcionalmente, a leitura que o gerou)
```

- **`usuario.perfil`** só tem dois valores no ENUM: `PRODUTOR` e `ADMIN`.
- **`fruta`** guarda a própria faixa ideal (`temp_min/max`, `umidade_min/max`), com `CHECK` no banco
  garantindo mínimo < máximo — a API valida isso também (zod), mas o banco é a garantia final,
  inclusive em updates parciais que a validação de entrada sozinha não pegaria.
- **`leitura_climatica`** tem uma `UNIQUE KEY (id_sensor, medido_em)`: é o que impede a mesma leitura
  do ThingSpeak entrar duas vezes — o backend tenta inserir sempre, e o banco ignora a repetida.
- **`leitura_climatica.valida`**: leituras fisicamente impossíveis (ex.: um defeito momentâneo do
  sensor) são gravadas com `valida = FALSE` em vez de descartadas, e ficam de fora dos cálculos e dos
  alertas.

## Arquitetura

```
ESP32 + DHT22 ──HTTP──▶ Canal do ThingSpeak (público, sem Read API Key)
                                  │
                                  │ GET /channels/:id/feeds.json — a cada ≥15s
                                  ▼
                   API Node.js/Express (este backend)
                          │              │
                  grava em leitura_   compara com a faixa
                  climatica (com      ideal da fruta do
                  UNIQUE KEY)         setor → grava em alerta
                          │
                          ▼
                     MySQL/MariaDB
                          │
                          ▼
        Painel web (projeto separado) consome esta API via HTTPS/CORS
```

## Perfis de acesso

| Perfil | O que pode fazer |
|---|---|
| `ADMIN` | Gerencia usuários, propriedades, frutas, setores e sensores; vê tudo |
| `PRODUTOR` | Só vê as propriedades/setores/sensores/leituras/alertas das propriedades vinculadas a ele (`usuario_propriedade`); pode marcar alertas como lidos |

O cadastro público (`/api/autenticacao/registrar`) sempre cria um `PRODUTOR`. Um `ADMIN` é criado por
outro admin (via `/api/usuarios`) ou pelo script de seed.

## Como rodar

**1. Banco.** Suba um MySQL/MariaDB (local, Docker, ou um serviço na nuvem — PlanetScale, Railway,
Aiven, RDS...).

**2. Configurar.**
```bash
npm install
cp .env.example .env
```
Preencha `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`, `JWT_SECRET` e, se o banco exigir TLS, `DB_SSL=true`.

**3. Criar o schema (isso recria o banco do zero, com os dados de exemplo do próprio arquivo SQL).**
```bash
npm run migrate
```

**4. Garantir um admin com senha de verdade.** O admin de exemplo do `schema.sql` vem com uma senha
fictícia (não dá pra logar com ela). Preencha `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` e rode:
```bash
npm run seed
```
Isso redefine a senha do admin de exemplo (se o e-mail bater) ou cria um novo.

**5. Subir o servidor.**
```bash
npm run dev      # desenvolvimento (recarrega sozinho)
npm start        # produção
```
Sobe em `http://localhost:3000` e já começa a consultar os sensores ativos em segundo plano
(`src/services/scheduler.js`).

**6. Testes automatizados.**
```bash
npm test
npm run test:coverage
```
Os testes em `tests/unit/` cobrem lógica pura (avaliação climática, validação de entrada, token) sem
precisar de banco. O comportamento contra o banco de verdade (RBAC, `CHECK`s, deduplicação de
leitura) foi validado manualmente durante o desenvolvimento — veja a seção seguinte se quiser montar
testes de integração.

## API

Autenticação: `Authorization: Bearer <token>` (JWT).

| Método e rota | Quem | Descrição |
|---|---|---|
| `POST /api/autenticacao/registrar` | público | Cria conta `PRODUTOR` |
| `POST /api/autenticacao/login` | público | Retorna o token JWT |
| `GET /api/autenticacao/eu` | logado | Dados do usuário |
| `POST /api/autenticacao/trocar-senha` | logado | Troca de senha |
| `GET/POST/PUT/DELETE /api/usuarios[/:id]` | admin | Gestão de usuários |
| `GET /api/propriedades` / `GET /:id` | logado (escopo por perfil) | Lista/detalha propriedades |
| `POST/PUT/DELETE /api/propriedades[/:id]` | admin | CRUD de propriedades e seus vínculos (`idsUsuarios`) |
| `GET /api/frutas` | logado | Lista as faixas ideais |
| `POST/PUT/DELETE /api/frutas[/:id]` | admin | CRUD de frutas |
| `GET /api/setores?idPropriedade=ID` | logado (escopo) | Lista setores de uma propriedade |
| `POST/PUT/DELETE /api/setores[/:id]` | admin | CRUD de setores |
| `GET /api/sensores?idPropriedade=ID` | logado (escopo) | Lista sensores de uma propriedade |
| `POST/PUT/DELETE /api/sensores[/:id]` | admin | CRUD de sensores |
| `POST /api/sensores/:id/consultar-agora` | admin | Consulta o ThingSpeak (ou simula) na hora, sem esperar o agendador |
| `GET /api/leituras/:idSensor?horas=24&pontos=120` | logado (escopo) | Histórico climático agregado |
| `DELETE /api/leituras/:idSensor` | admin | Apaga o histórico de um sensor |
| `GET /api/painel` | logado (escopo) | Leitura mais recente de cada sensor visível + situação |
| `GET /api/alertas?apenasNaoLidos=true&limite=50` | logado (escopo) | Lista alertas |
| `PATCH /api/alertas/:id/lido` | logado (escopo) | Marca um alerta como lido |

## O que ficou de fora, por causa do schema

Essas peças existiam numa versão anterior deste backend (sobre MongoDB) e **não foram portadas**,
porque o schema enviado não tem tabela para elas. Se quiser alguma de volta, dá pra estender o SQL:

- **Terceiro perfil (analista de dados):** o ENUM de `usuario.perfil` só tem `PRODUTOR`/`ADMIN`. Hoje
  o `ADMIN` acumula a função de ajustar as faixas ideais das frutas.
- **Read API Key do ThingSpeak por sensor:** a tabela `sensor` só tem `thingspeak_channel_id`. O
  backend assume canal público. Pra canal privado, seria preciso uma coluna a mais (e criptografá-la
  em repouso, como esse projeto já fez numa versão anterior).
- **Revogação de token/bloqueio de conta por tentativas:** `usuario` não tem coluna de versão de
  token nem de tentativas falhas. A sessão expira pelo `JWT_EXPIRES_IN`; força bruta é mitigada só
  pelo rate limit (em memória, por IP) em `/api/autenticacao`.
- **Dados de mercado, previsão de safra, auditoria e LGPD:** não há tabelas `mercado`, `previsao` nem
  `log_auditoria` neste schema.

## Segurança implementada

- Senhas com bcrypt (custo 12) e política mínima (10 caracteres, maiúscula, minúscula, número).
- Todo SQL é parametrizado (`mysql2` com *named placeholders*) — sem concatenar valor de usuário em
  string de consulta.
- RBAC em cada rota (`autorizar('ADMIN')`) e escopo de dados por `usuario_propriedade` para `PRODUTOR`.
- Entrada validada com zod (`.strict()` — campo extra, tipo `perfil` num cadastro público, é rejeitado).
- Restrições de integridade do próprio banco (`CHECK`, `UNIQUE`, `FOREIGN KEY`) como última linha de
  defesa, com o `errorHandler` traduzindo a violação numa resposta HTTP clara.
- Cabeçalhos via Helmet; CORS fechado por padrão (requer `CORS_ORIGINS` explícito).
- Limite de requisições por IP, mais restrito em `/api/autenticacao`.

**Pontos a reforçar conforme o uso:** o rate limit fica em memória — com várias instâncias do
servidor, use um store compartilhado (Redis); não há recuperação de senha por e-mail nem 2FA.

## Arduino/ESP32

O firmware em `arduino/climora_esp32/` publica no ThingSpeak (`field1` = temperatura,
`field2` = umidade) e não fala com esta API diretamente — é o mesmo sketch de antes, porque a
integração do backend com o ThingSpeak não mudou, só a forma como os dados são guardados depois.
Preencha `WIFI_SSID`, `WIFI_PASS`, `CHANNEL_ID` e `WRITE_API_KEY` no topo do arquivo.
