# TemperaturaPI — Backend (Dashboard de Monitoramento Climático e Logístico)

Backend do Projeto Integrador (4º módulo ADS): API em nuvem para exportadoras de frutas de
Petrolina/Juazeiro, que ingere dados de sensores IoT (temperatura/umidade, via ThingSpeak) e dados de
mercado, para apoiar a decisão da janela ideal de colheita e exportação.

Este repositório contém **só o backend** (API + firmware do ESP32). O painel web é um projeto
separado, que consome esta API — ver a seção CORS em [Como rodar](#como-rodar).

## Arquitetura (conforme os requisitos)

```
ESP32 + DHT22 ──HTTP──▶ Canal do ThingSpeak (camada IoT)
                                      │
                                      │ API REST do ThingSpeak (channel feeds) — a cada ≥15s
                                      ▼
                         API Node.js/Express (este backend)
                    ┌─────────────┬─────────────┬──────────────┐
              limpeza de dados  previsão     dados de       auditoria/
               (RF05)          (RF06)      mercado (RF03)   relatórios (RF11)
                    └─────────────┴─────────────┴──────────────┘
                                      │
                                      ▼
                        MongoDB Atlas — banco na nuvem (RF04)
                                      │
                                      ▼
              Painel web (projeto separado) consome esta API via HTTPS/CORS
```

**Importante:** o backend **não recebe dados diretamente do ESP32**. O dispositivo publica no
ThingSpeak; o backend consulta o canal periodicamente (`GET /channels/:id/feeds.json`). Isso está em
`src/services/thingspeak.js` (cliente) e `src/services/poller.js` + `src/services/scheduler.js`
(agendamento).

## Atores e perfis de acesso

| Ator (documento de requisitos) | Perfil no sistema | O que pode fazer |
|---|---|---|
| Administrador do Sistema | `admin` | Gerencia usuários, permissões, canais/dispositivos e integridade dos dados (RF12) |
| Analista de Dados | `analista` | Ajusta as faixas ideais por fruta, gera previsões de safra, lança dados de mercado |
| Produtor/Exportador | `cliente` | Consulta o dashboard dos canais vinculados a ele para decidir colheita/logística |

O cadastro público (`/api/auth/register`) só cria contas de Produtor/Exportador. Admin e analista são
criados por um administrador.

## Como rodar

**1. Banco na nuvem (RF04).** Crie uma conta gratuita no [MongoDB Atlas](https://www.mongodb.com/atlas)
(ou use qualquer outro banco em nuvem/simulador — RNF07), crie um cluster, um usuário e copie a string
de conexão.

**2. Canal do ThingSpeak (RF01/opcional para começar).** Crie uma conta gratuita em
[thingspeak.com](https://thingspeak.com), um canal com `field1` = temperatura e `field2` = umidade, e
anote o **Channel ID** e a **Read API Key**. Sem um canal real, deixe o dispositivo em modo `simulate`
(padrão) — o backend gera leituras sintéticas plausíveis (RNF07).

**3. Configurar.**
```bash
npm install
cp .env.example .env
```
Preencha `MONGODB_URI`, `JWT_SECRET` e `ENCRYPTION_KEY` (comandos para gerar cada um estão comentados
no próprio `.env.example`), `ADMIN_EMAIL`/`ADMIN_PASSWORD`, e **`CORS_ORIGINS`** com a origem do painel
web (o frontend é um projeto à parte — sem essa variável, o navegador bloqueia as chamadas dele para
esta API).

**4. Criar o primeiro administrador, frutas e um canal de exemplo.**
```bash
npm run seed
```

**5. Subir o servidor.**
```bash
npm run dev      # desenvolvimento (recarrega sozinho)
npm start        # produção
```
O servidor sobe em `http://localhost:3000` e já começa a consultar os canais ativos e a gerar dados de
mercado simulados em segundo plano (`src/services/scheduler.js`).

**6. Testes automatizados (RNF05).**
```bash
npm test              # roda a suíte
npm run test:coverage # com cobertura (node --experimental-test-coverage)
```

## API

Autenticação: `Authorization: Bearer <token>` (JWT). Não há mais autenticação de dispositivo — o ESP32
fala apenas com o ThingSpeak.

| Método e rota | Quem | RF/RNF | Descrição |
|---|---|---|---|
| `POST /api/auth/register` | público | RF08 | Cria conta de Produtor/Exportador |
| `POST /api/auth/login` | público | RF08 | Retorna o token JWT |
| `GET /api/auth/me` | logado | — | Dados do usuário |
| `POST /api/auth/logout` | logado | — | Invalida todos os tokens da conta |
| `POST /api/auth/change-password` | logado | — | Troca de senha |
| `GET /api/devices` / `POST` / `PUT` / `DELETE` | admin (leitura: escopo por perfil) | RF01/RF02 | CRUD dos canais do ThingSpeak (`thingSpeakChannelId`, `thingSpeakReadApiKey`, `simulate`) |
| `PATCH /api/devices/:id/fruit` | analista, admin | RF06 | Define qual fruta o canal acompanha |
| `POST /api/devices/:id/poll-now` | admin | RF02 | Consulta o ThingSpeak imediatamente (não espera o agendador) |
| `GET /api/fruits` / `POST` / `PUT` / `DELETE` | logado / analista+admin | RF06 | Faixas ideais de temperatura/umidade por fruta |
| `GET /api/readings?device=ID&hours=24&points=120` | logado | RF10 | Histórico climático agregado |
| `DELETE /api/readings/:deviceId` | admin | — | Apaga o histórico de um canal |
| `GET /api/dashboard` | logado | RF07 | Painel de BI: leitura atual, alerta, mercado e previsão por fruta |
| `GET /api/market?fruit=ID` / `POST` / `POST /ingest-now` | logado / analista+admin | RF03/RF04 | Preço e demanda de exportação por fruta |
| `GET /api/predictions?fruit=ID` / `POST` | logado / analista+admin | RF06 | Gera/consulta a previsão da janela ideal de colheita |
| `GET /api/reports/security?days=30` | admin | RF11 | Relatório de acessos e incidentes de segurança |
| `POST /api/reports/quality/run` | admin | RF11/RNF05 | Roda a suíte de testes agora e resume o resultado |
| `GET /api/lgpd/me/data` | logado | RNF08 | Exporta os próprios dados pessoais (direito de acesso) |
| `DELETE /api/lgpd/me` | logado | RNF08 | Exclui a própria conta (direito de exclusão, confirmado por senha) |
| `GET/POST/PUT/DELETE /api/users[/:id]` | admin | RF12 | Gestão de usuários e permissões |

## Rastreabilidade dos requisitos

| ID | Onde está implementado |
|---|---|
| RF01 | `src/services/thingspeak.js` (modo simulado) — o ESP32 publica no ThingSpeak, fora deste backend |
| RF02 | `src/services/poller.js`, `src/services/scheduler.js`, `src/routes/devices.routes.js` |
| RF03 | `src/services/marketData.js`, `src/routes/market.routes.js` |
| RF04 | MongoDB Atlas (`src/config/db.js`) armazenando `Reading` e `MarketData` |
| RF05 | `src/services/dataCleaning.js` (+ testes em `tests/unit/dataCleaning.test.js`) |
| RF06 | `src/services/prediction.js`, `src/routes/predictions.routes.js` |
| RF07 | `GET /api/dashboard` (clima + mercado + previsão), `GET /api/readings` (histórico) |
| RF08 | `src/middleware/auth.js` (JWT + RBAC via `authorize(...roles)`) |
| RF09 | `src/utils/status.js` (`evaluate`) + alertas registrados em `src/services/poller.js` |
| RF10 | TTL de 90 dias em `Reading`, histórico de `MarketData` e `Prediction` |
| RF11 | `src/routes/reports.routes.js` + `src/models/AuditLog.js` |
| RF12 | `src/routes/users.routes.js` |
| RNF01 | Autenticação sem estado (JWT) — permite escalar horizontalmente; ver observação sobre o rate limit abaixo |
| RNF02 | `src/config/crypto.js` (AES-256-GCM) para a Read API Key do ThingSpeak; HTTPS/HSTS via Helmet para o trânsito |
| RNF03 | Encerramento gracioso (`src/server.js`), reconexão automática do Mongoose |
| RNF04 | Índices em `Reading`/`MarketData`/`Prediction`; aviso de log para requisições acima de `SLOW_REQUEST_MS` (`src/app.js`) |
| RNF05 | `tests/unit/*.test.js` + `npm test` / `npm run test:coverage` |
| RNF06 | Mensagens de erro em português, claras, em toda a API |
| RNF07 | `simulate: true` nos canais (RF01/RF02) e `MARKET_SIMULATE` (RF03) — roda sem nenhum serviço externo real |
| RNF08 | `src/routes/lgpd.routes.js` (acesso e exclusão dos próprios dados) |
| RNF09 | Estrutura modular `src/{config,models,middleware,routes,services,utils}` |
| RNF10 | `authorize()` é apenas uma checagem de array em memória, sem custo relevante |
| RNF11 | `THINGSPEAK_POLL_INTERVAL_MS` validado com mínimo de 15000 ms em `src/config/env.js` |

## Segurança implementada

- **Senhas** com bcrypt (custo 12) e política mínima (10 caracteres, maiúscula, minúscula e número).
- **JWT** com expiração; a cada requisição o servidor confere se a conta segue ativa e se o token não
  foi revogado (logout, troca de senha, mudança de perfil ou desativação derrubam as sessões).
- **Força bruta:** limite de tentativas por IP e bloqueio da conta por 15 min após 5 senhas erradas.
- **RBAC** em cada rota (`authorize('admin')`, etc.) e escopo de dados: Produtor/Exportador só enxerga
  os canais vinculados a ele.
- **Entrada validada** com zod; `express-mongo-sanitize` contra injeção NoSQL; corpo limitado a 10 kB.
- **Credenciais do ThingSpeak criptografadas em repouso** (AES-256-GCM); nunca retornadas pela API,
  nem em texto puro nem criptografadas — só uma máscara (`••••1234`) para conferência.
- **Cabeçalhos** via Helmet (CSP restritiva, HSTS) e CORS fechado por padrão.
- **Auditoria** de login (sucesso/falha), bloqueios de conta e ações administrativas, usada no
  relatório de segurança (RF11).
- **LGPD/GDPR:** minimização de dados nos modelos, endpoint de exportação e de exclusão da própria
  conta.

**Pontos a reforçar conforme o uso:** o rate limit fica em memória — com várias instâncias do servidor,
use um store compartilhado (Redis); não há recuperação de senha por e-mail nem 2FA; ao configurar um
canal real do ThingSpeak, use HTTPS de ponta a ponta e nunca exponha a Read/Write Key no repositório.

## Arduino/ESP32

O firmware em `arduino/ponto_certo_esp32/` já está na versão que publica no ThingSpeak (não fala mais
com esta API diretamente). Preencha `WIFI_SSID`, `WIFI_PASS`, `CHANNEL_ID` e `WRITE_API_KEY` no topo
do arquivo antes de gravar no ESP32.
