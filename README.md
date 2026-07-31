# GetHired API

Rastreador de candidaturas de emprego com gerenciamento de follow-up e analytics de abordagens.

## Stack

- **Framework:** NestJS + TypeScript
- **Banco de dados:** PostgreSQL + Prisma
- **Cache:** Redis
- **Auth:** JWT com rotação de refresh token
- **Logs:** Pino
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

# Iniciar servidor de desenvolvimento
npm run start:dev
```

A API estará disponível em `http://localhost:3000/api`.

## Variáveis de ambiente

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gethired?schema=public

JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

## Estrutura do projeto

```
src/
  auth/         # Autenticação, JWT, strategies e guards
  users/        # Gerenciamento de usuários
  jobs/         # Candidaturas e status workflow
  contacts/     # Contatos por vaga
  follow-ups/   # Rastreamento de follow-ups
  prisma/       # PrismaService e PrismaModule
prisma/
  schema.prisma
  migrations/
```

## Funcionalidades do MVP

- Registro e autenticação de usuários com JWT
- Rotação de refresh token via Redis
- Rastreamento de candidaturas com status workflow
- Gerenciamento de contatos por vaga
- Templates de mensagem reutilizáveis
- Alertas de follow-up para vagas sem atualização

## Licença

Proprietor — all rights reserved © Willames Barbosa
