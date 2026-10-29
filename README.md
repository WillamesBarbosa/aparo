# Aparo API

Sistema de agendamento para barbearias com notificações automáticas via WhatsApp.

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

## Estrutura do projeto

```
src/
  auth/              # Autenticação, JWT, strategies, guards e refresh token
  users/             # Gerenciamento de usuários (barbeiros)
  barbershops/       # Gerenciamento de barbearias
  services/          # Serviços oferecidos pela barbearia
  schedules/         # Horários de funcionamento por dia da semana
  customers/         # Clientes que realizam agendamentos
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

### Services (JWT)
```
POST   /api/services         → cria serviço
GET    /api/services         → lista serviços da barbearia
PUT    /api/services/:id     → atualiza serviço
DELETE /api/services/:id     → deleta serviço
```

### Schedules (JWT)
```
POST   /api/schedules              → cria ou atualiza horário (upsert por dia)
GET    /api/schedules              → lista horários da barbearia
DELETE /api/schedules/:dayOfWeek   → remove horário do dia
```

### Customers (público)
```
POST /api/customers   → cria ou atualiza cliente via upsert por telefone
```

### Appointments
```
POST /api/appointments                    → cria agendamento (JWT — barbeiro)
POST /api/appointments/public             → cria agendamento (público — cliente)
GET  /api/appointments?date=              → agenda do dia ou data específica (JWT)
GET  /api/appointments/week               → agenda dos próximos 7 dias (JWT)
GET  /api/appointments/available?barbershopId=&serviceId=&date=   → slots disponíveis por dia (público)
GET  /api/appointments/available/week?barbershopId=&serviceId=    → disponibilidade dos próximos 7 dias (público)
```

## Funcionalidades do MVP

- Registro e autenticação de barbeiros com JWT
- Refresh token com rotação e invalidação via Redis
- Cadastro e gerenciamento de barbearias
- Cadastro de serviços com nome, preço e duração
- Configuração de horários de funcionamento por dia da semana com upsert
- Agendamento público pelo cliente sem necessidade de conta
- Agendamento pelo barbeiro autenticado sem validação de conflito
- Validação de disponibilidade em tempo real para clientes
- Algoritmo de slots baseado em preenchimento de lacunas entre agendamentos
- Detecção de conflitos de horário para agendamentos públicos
- Cadastro automático de clientes via upsert por telefone
- Validação de telefone via regex
- Agenda do dia e da semana para o barbeiro
- Slots disponíveis por dia e por semana para o cliente
- Rate limiting global e específico por rota
- Segurança HTTP com Helmet
- Logs estruturados com Pino

## Módulos pendentes

- Notificações via WhatsApp (aguardando CNPJ para API oficial Meta)
- Cancelamento e atualização de status de agendamentos
- Histórico de agendamentos por cliente

## Licença

Proprietária — todos os direitos reservados © Willames Barbosa
