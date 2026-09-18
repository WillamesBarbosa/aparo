# Aparo API

Sistema de agendamento para barbearias com notificações automáticas via WhatsApp.

## Stack

- **Framework:** NestJS + TypeScript
- **Banco de dados:** PostgreSQL + Prisma
- **Cache:** Redis
- **Auth:** JWT
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
  auth/              # Autenticação, JWT, strategies e guards
  users/             # Gerenciamento de usuários (barbeiros)
  barbershops/       # Gerenciamento de barbearias
  services/          # Serviços oferecidos pela barbearia
  schedules/         # Horários de funcionamento por dia da semana
  customers/         # Clientes que realizam agendamentos
  appointments/      # Agendamentos e lógica de disponibilidade
  common/            # Utilitários, helpers e tipos compartilhados
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

## Funcionalidades do MVP

- Registro e autenticação de barbeiros com JWT
- Cadastro e gerenciamento de barbearias
- Cadastro de serviços com nome, preço e duração
- Configuração de horários de funcionamento por dia da semana
- Agendamento público pelo cliente (sem autenticação)
- Agendamento pelo barbeiro (autenticado)
- Validação de disponibilidade em tempo real
- Detecção de conflitos de horário
- Cadastro automático de clientes via upsert por telefone
- Rate limiting global e específico por rota
- Logs estruturados com Pino

## Módulos pendentes

- Notificações via WhatsApp (aguardando CNPJ para API oficial)
- Refresh token com rotação via Redis
- Dashboard com agenda do dia

## Licença

Proprietária — todos os direitos reservados © Willames Barbosa
