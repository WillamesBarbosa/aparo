# Aparo API

Sistema de agendamento para barbearias. Notificações automáticas via WhatsApp estão planejadas (veja "Módulos pendentes").

## Stack

- **Framework:** NestJS + TypeScript
- **Banco de dados:** PostgreSQL + Prisma
- **Cache/Auth Store:** Redis
- **Auth:** JWT com refresh token e rotação via Redis
- **Logs:** Pino
- **Segurança:** Helmet + Rate Limiting (Throttler)
- **Testes:** Jest + Supertest
- **Deploy:** Railway

## Requisitos

- Node.js 20+
- Docker + Docker Compose

## Como rodar

```bash
# Instalar dependências
npm install

# Subir banco e Redis
docker compose up -d

# Rodar migrations
npx prisma migrate dev

# Rodar migrations no banco de teste
npx dotenv-cli -e .env.test -- npx prisma migrate deploy

# Iniciar servidor de desenvolvimento
npm run start:dev
```

A API estará disponível em `http://localhost:3000/api`.

## Variáveis de ambiente

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aparo?schema=public

JWT_SECRET=
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

## Variáveis de ambiente — testes

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/aparo_test?schema=public

JWT_SECRET=
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

## Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Testes e2e de um módulo específico
npx dotenv-cli -e .env.test -- jest --config ./test/jest-e2e.json --runInBand <nome-do-modulo>

# Cobertura
npm run test:cov
```

### Convenções dos testes

- Helpers em `src/common/helpers`: `setupBarbershop` (cria usuário, barbearia, serviço e agenda de segunda; aceita um e-mail para montar duas barbearias), `nextMonday` / `nextWeekday` (datas futuras), `barbershopNow` e `createAppointmentDirect` (insere o agendamento direto no banco, sem passar pelas regras).
- Não usar datas fixas: as regras de data passada fariam os testes quebrarem com o tempo. Use `nextMonday(hora)` ou `nextWeekday(dia, hora)`.
- Testes de segurança devem conferir o estado do banco além do status HTTP, e testes de erro devem conferir o campo `message`, para não passarem pelo motivo errado.

## Estrutura do projeto

```
src/
  auth/              # Autenticação, JWT, strategies, guards e refresh token
  users/             # Gerenciamento de usuários (barbeiros)
  barbershops/       # Gerenciamento de barbearias
  services/          # Serviços oferecidos pela barbearia
  schedules/         # Horários de funcionamento por dia da semana
  customer/          # Clientes que realizam agendamentos
  appointments/      # Agendamentos, disponibilidade e agenda do barbeiro
  redis/             # RedisModule e client global
  common/            # Utilitários, helpers, validators e tipos compartilhados
  prisma/            # PrismaService e PrismaModule
prisma/
  schema.prisma
  migrations/
test/
  auth/
  barbershop/
  services/
  schedules/
  customers/
  appointments/
```

## Convenção de datas e horários

Os horários são gravados na convenção **"UTC = horário local"**: 09:00 no Recife é gravado como `09:00Z`, sem conversão de fuso. O "agora" da barbearia vem de `barbershopNow()` (`Date.now()` menos 3 horas; o Brasil não tem horário de verão desde 2019).

Em regra de negócio não se usa `new Date()` diretamente, e a leitura de datas é sempre feita com os métodos `getUTC*`.

## Endpoints

### Auth

```
POST /api/auth/register   → registra barbeiro e cria barbearia automaticamente
POST /api/auth/login      → retorna accessToken e refreshToken
POST /api/auth/refresh    → renova tokens com rotação via Redis
```

### Users

```
POST   /api/users         → cria usuário
GET    /api/users/:id     → busca usuário
PUT    /api/users/:id     → atualiza usuário
DELETE /api/users/:id     → deleta usuário
```

### Barbershops (JWT)

```
POST   /api/barbershops      → cria barbearia
GET    /api/barbershops/me   → busca barbearia do barbeiro autenticado
PUT    /api/barbershops/me   → atualiza barbearia
DELETE /api/barbershops/me   → deleta barbearia
```

### Services

```
GET    /api/services/:id   → (público) nome da barbearia e serviços ativos; o :id é o da barbearia
POST   /api/services       → (JWT) cria serviço
GET    /api/services       → (JWT) lista serviços da barbearia
PUT    /api/services/:id   → (JWT) atualiza serviço da barbearia logada
DELETE /api/services/:id   → (JWT) remove serviço da barbearia logada
```

A rota pública responde `{ barbershop: { name }, services: [{ id, name, price, durationMins }] }`. O `price` é serializado como string.

### Schedules (JWT)

```
POST   /api/schedules              → cria ou atualiza horário (upsert por dia)
GET    /api/schedules              → lista horários da barbearia
DELETE /api/schedules/:dayOfWeek   → remove horário do dia
```

`openTime` e `closeTime` no formato `HH:MM`, com `openTime` anterior a `closeTime`. `dayOfWeek` aceita `MONDAY` a `SUNDAY`; valor inválido retorna 400.

### Customers (público)

```
POST /api/customers   → cria ou atualiza cliente via upsert por telefone
```

### Appointments

```
POST  /api/appointments                       → cria agendamento (JWT — barbeiro)
POST  /api/appointments/public                → cria agendamento (público — cliente)
PATCH /api/appointments/:id/status            → confirma, cancela ou conclui (JWT)
GET   /api/appointments?date=                 → agenda do dia (JWT); sem date, o dia de hoje da barbearia
GET   /api/appointments/week?from=YYYY-MM-DD  → agenda de 7 dias (JWT); sem from, começa hoje
GET   /api/appointments/available?barbershopId=&serviceId=&date=   → horários do dia (público); date é opcional
GET   /api/appointments/available/week?barbershopId=&serviceId=    → horários dos próximos 7 dias (público)
```

- `POST /api/appointments` recebe `serviceId`, `customerName`, `customerPhone` e `date`. A barbearia vem do token, e enviar `barbershopId` retorna 400.
- `POST /api/appointments/public` recebe também o `barbershopId`.
- `available` responde `{ date, dayOfWeek, available, reason, slots }`, com `reason` igual a `no_schedule`, `fully_booked` ou `past_date`.
- `available/week` devolve 7 dias a partir de hoje (hoje incluído).

## Regras de negócio

### Isolamento entre barbearias

Toda consulta por id filtra também pela barbearia do token. Serviços, agendamentos e horários só são acessíveis pela barbearia dona, e um id de outra barbearia responde 404, igual a um id inexistente.

### Agendamento

- Data no passado é rejeitada com 400, nas duas rotas de criação.
- Horário fora do expediente retorna 400; horário já ocupado retorna 409. Agendamentos cancelados não ocupam horário.
- O cliente só agenda serviços ativos. O barbeiro pode agendar serviço desativado da própria barbearia.
- Cliente é criado ou reaproveitado pelo telefone.

### Disponibilidade

- Os horários são gerados preenchendo as lacunas entre os agendamentos do dia, limitados ao expediente.
- Para o dia de hoje, só aparecem horários depois do "agora" da barbearia.
- Dia anterior a hoje retorna `available: false` com `reason: past_date`. Se hoje não restar horário, retorna `available: false` com `reason: fully_booked`.

### Status do agendamento

Todo agendamento nasce `PENDING`. As mudanças permitidas:

| De          | Para                                  |
| ----------- | ------------------------------------- |
| `PENDING`   | `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `CONFIRMED` | `COMPLETED`, `CANCELLED`              |
| `CANCELLED` | nenhum (final)                        |
| `COMPLETED` | nenhum (final)                        |

Cancelar libera o horário. Para refazer um agendamento cancelado, cria-se um novo. Transição fora da tabela retorna 400.

### Erros

Respostas de erro seguem o formato do Nest: `{ "message": "...", "error": "...", "statusCode": 400 }`. O texto do erro fica em `message`; `error` é só o nome do status HTTP.

| Código | Quando                                                                        |
| ------ | ----------------------------------------------------------------------------- |
| 400    | Dado inválido, data passada, fora do expediente, transição de status proibida |
| 401    | Sem token ou token inválido                                                   |
| 404    | Recurso inexistente ou de outra barbearia                                     |
| 409    | Horário já ocupado                                                            |

## Funcionalidades do MVP

- Registro e autenticação de barbeiros com JWT
- Refresh token com rotação e invalidação via Redis
- Cadastro e gerenciamento de barbearias
- Cadastro de serviços com nome, preço e duração
- Configuração de horários de funcionamento por dia da semana com upsert
- Agendamento público pelo cliente, sem necessidade de conta
- Agendamento pelo barbeiro autenticado
- Detecção de conflitos de horário nos dois tipos de agendamento
- Rejeição de agendamentos em data passada
- Status do agendamento (confirmar, cancelar, concluir) com transições válidas
- Disponibilidade em tempo real para clientes, por dia e por semana, respeitando o horário local da barbearia
- Cadastro automático de clientes via upsert por telefone
- Validação de telefone via regex
- Agenda do dia e da semana para o barbeiro, com navegação por `from`
- Isolamento entre barbearias
- Rate limiting global e específico por rota
- Segurança HTTP com Helmet
- Logs estruturados com Pino

## Módulos pendentes

- Notificações via WhatsApp (aguardando CNPJ para API oficial Meta)
- Histórico de agendamentos por cliente

## Melhorias futuras

- A checagem de conflito e a gravação do agendamento não são atômicas; a solução definitiva é no banco (índice único ou transação com bloqueio)
- Flag explícita de encaixe, aceita só na rota autenticada
- Mensagem do 409 indicando qual agendamento conflitou
- Proteger a mudança de status contra requisições concorrentes

## Licença

Proprietária — todos os direitos reservados © Willames Barbosa
