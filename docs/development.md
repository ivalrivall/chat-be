# Development Guide

- [Development Guide](#development-guide)
  - [First-time Setup](#first-time-setup)
  - [Installation](#installation)
  - [Database Configuration](#database-configuration)
    - [PostgreSQL (Default)](#postgresql-default)
    - [MySQL/MariaDB Alternative](#mysqlmariadb-alternative)
    - [Database Operations](#database-operations)
      - [Migration Examples](#migration-examples)
  - [Development Server](#development-server)
  - [Project Structure](#project-structure)
  - [Code Generation](#code-generation)
  - [Environment Variables](#environment-variables)
  - [Supabase GraphQL Integration](#supabase-graphql-integration)
  - [Docker Development](#docker-development)
    - [Prerequisites](#prerequisites)
    - [Running with Docker](#running-with-docker)
    - [Docker Compose Services](#docker-compose-services)
  - [Development Workflow](#development-workflow)
  - [Debugging](#debugging)
    - [VS Code Configuration](#vs-code-configuration)
    - [Debug Commands](#debug-commands)
  - [Performance Optimization](#performance-optimization)
    - [Development Performance](#development-performance)
    - [Production Considerations](#production-considerations)

## First-time Setup

Ensure you have the required tools installed:

- [Node.js](https://nodejs.org/en/) (v18+ LTS recommended)
- [Yarn](https://yarnpkg.com/lang/en/docs/install/) (v1.22.22+)
- [PostgreSQL](https://www.postgresql.org/) (v12+)
- [Git](https://git-scm.com/)

## Installation

```bash
# Install dependencies from package.json
yarn install
```

> **Note**: Don't delete `yarn.lock` before installation. See more in [Yarn docs](https://classic.yarnpkg.com/en/docs/yarn-lock/)

## Database Configuration

The project uses [TypeORM](https://github.com/typeorm/typeorm) with the Data Mapper pattern and supports multiple database types.

### PostgreSQL (Default)

1. Install and start PostgreSQL
2. Create a database for your application
3. Configure your `.env` file:

```env
# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_boilerplate

# Enable ORM logging (development only)
ENABLE_ORM_LOGS=true
```

### MySQL/MariaDB Alternative

If you prefer MySQL/MariaDB over PostgreSQL:

1. Update your `.env` file:
```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=mysql
DB_PASSWORD=mysql
DB_DATABASE=nest_boilerplate
DB_ROOT_PASSWORD=mysql
DB_ALLOW_EMPTY_PASSWORD=yes
```

2. Update `ormconfig.ts`:
```typescript
export const dataSource = new DataSource({
  type: 'mysql', // Change from 'postgres' to 'mysql'
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // ... rest of configuration
});
```

3. Clear existing migrations and regenerate:
```bash
# Remove existing migrations
rm -rf src/database/migrations/*

# Generate new migrations for MySQL
yarn migration:generate src/database/migrations/InitialMigration
```

### Database Operations

> **Note**: For TypeORM v0.3+, the migration commands have changed:
> - `migration:create` now requires the full path to the migration file
> - `migration:generate` requires the `-d` flag to specify the DataSource configuration
> - All commands now use the DataSource configuration instead of the old ormconfig.ts format

#### Migration Examples

**Creating a new migration manually:**
```bash
# Create a new migration file
yarn migration:create src/database/migrations/add-gifts-table

# This generates: 1754340825698-add-gifts-table.ts
```

**Generating migration from entity changes:**
```bash
# 1. Create or modify your entity (e.g., src/modules/gift/gift.entity.ts)
# 2. Generate migration based on entity changes
yarn migration:generate src/database/migrations/add-gifts-table

# 3. Review the generated migration file
# 4. Run the migration
yarn migration:run
```

**Complete workflow example:**
```bash
# 1. Create entity
# Edit: src/modules/gift/gift.entity.ts

# 2. Generate migration
yarn migration:generate src/database/migrations/gifts-table

# 3. Review generated migration
# File: src/database/migrations/1754340825698-gifts-table.ts

# 4. Run migration
yarn migration:run

# 5. Verify migration status
yarn migration:show

# Revert the last migration
yarn migration:revert

# Drop entire database schema (⚠️ destructive)
yarn schema:drop

```

## Development Server

The project uses Vite for fast development with hot module replacement:

```bash
# Start development server with Vite (recommended)
yarn start:dev

# Alternative: Start with NestJS CLI
yarn nest:start:dev

# Start with file watching
yarn watch:dev

# Start with debugger enabled
yarn nest:start:debug
```

> **Note**: If you're on Linux and see an `ENOSPC` error, you must [increase the number of available file watchers](https://stackoverflow.com/questions/22475849/node-js-error-enospc#answer-32600959).

The development server will be available at:
- **Application**: `http://localhost:3000`
- **API Documentation**: `http://localhost:3000/documentation`

## Project Structure

```
src/
├── common/                 # Shared DTOs, utilities, and base classes
│   ├── dto/               # Common data transfer objects
│   └── abstract.entity.ts # Base entity class
├── constants/             # Application-wide constants
├── database/              # Database configuration and migrations
│   └── migrations/        # TypeORM migration files
├── decorators/            # Custom decorators
├── entity-subscribers/    # TypeORM entity subscribers
├── exceptions/            # Custom exception classes
├── filters/               # Exception filters
├── guards/                # Authentication and authorization guards
├── i18n/                  # Internationalization files
│   ├── en_US/            # English translations
│   └── ru_RU/            # Russian translations
├── interceptors/          # Request/Response interceptors
├── interfaces/            # TypeScript interfaces
├── modules/               # Feature modules
│   ├── auth/             # Authentication module
│   ├── user/             # User management module
│   ├── post/             # Post management module
│   └── health-checker/   # Health check module
├── providers/             # Custom providers
├── shared/                # Shared services and utilities
│   └── services/         # Global services
└── validators/            # Custom validators
```

## Code Generation

Use NestJS CLI for rapid development:

```bash
# Install NestJS CLI globally (if not already installed)
yarn global add @nestjs/cli

# Generate a new module
nest generate module feature-name

# Generate a new service
nest generate service feature-name

# Generate a new controller
nest generate controller feature-name

# Generate a complete resource (module, service, controller, DTOs)
nest generate resource feature-name

# Use project-specific generator
yarn generate service feature-name
yarn g controller feature-name
```

> **Note**: The project includes custom schematics via `awesome-nestjs-schematics` for enhanced code generation.

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_boilerplate
ENABLE_ORM_LOGS=true

# JWT Authentication
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----\\n"
JWT_EXPIRATION_TIME=3600

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# API Documentation
ENABLE_DOCUMENTATION=true

# Throttling
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# NATS (optional)
NATS_ENABLED=false
NATS_HOST=localhost
NATS_PORT=4222

# RabbitMQ
RABBITMQ_URI=
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_CHAT_EXCHANGE=chat.events
RABBITMQ_CHAT_DLX_EXCHANGE=chat.dlx
RABBITMQ_CHAT_QUEUE_PREFIX=chat.message.send
RABBITMQ_CHAT_DLQ_NAME=chat.message.send.dlq
RABBITMQ_CHAT_PARTITION_COUNT=8
RABBITMQ_CHAT_MAX_RETRIES=5
RABBITMQ_CHAT_CONSUMER_PREFETCH=1
```

## Supabase GraphQL Integration

This project provides a reusable `SupabaseGraphqlService` in `SharedModule` for server-to-server GraphQL requests to Supabase.

Configure the following variables in `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_GRAPHQL_URL=
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Notes:
- `SUPABASE_GRAPHQL_URL` is optional. When empty, the app uses `${SUPABASE_URL}/graphql/v1`.
- Requests are authenticated with both `apikey` and `Authorization: Bearer <service-role-key>` headers.
- Use the service-role key only in backend environments.

Per-module GraphQL proxy endpoints are available:
- `POST /auth/graphql`
- `POST /users/graphql`
- `POST /posts/graphql`
- `POST /chats/graphql`

Request body format:

```json
{
  "query": "query Example($id: uuid!) { users_by_pk(id: $id) { id email } }",
  "variables": {
    "id": "00000000-0000-0000-0000-000000000000"
  }
}
```

Example chat conversation list query for Supabase pg_graphql:

```json
{
  "query": "query GetConversationList($first: Int!, $offset: Int!) { chatsCollection(first: $first, offset: $offset, orderBy: [{ updatedAt: DescNullsLast }]) { edges { node { id createdAt updatedAt name isGroup chatParticipantsCollection { edges { node { id userId users { email } } } } chatMessagesCollection(first: 1, orderBy: [{ sentAt: DescNullsLast }]) { edges { node { id createdAt updatedAt chatId senderId content messageType status sequence sentAt chatMessageAttachmentsCollection(first: 1) { edges { node { id createdAt updatedAt fileKey mimeType size attachmentType } } } } } } } } totalCount } }",
  "variables": {
    "first": 10,
    "offset": 0
  }
}
```

Important:
- Supabase pg_graphql does not use Hasura-style root fields such as `chats` or `chats_aggregate`.
- Use `...Collection` fields and `totalCount` instead.

Generate JWT key values for `.env`:

```bash
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
echo "JWT_PRIVATE_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\\\n",$0;}' jwt_private.pem)\""
echo "JWT_PUBLIC_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\\\n",$0;}' jwt_public.pem)\""
```

## Docker Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running with Docker

```bash
# Start all services (app + database)
PORT=3000 docker-compose up

# Start in detached mode
PORT=3000 docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

### Docker Compose Services

The `docker-compose.yml` includes:

- **app**: NestJS application
- **postgres**: PostgreSQL database
- **pgadmin**: Database administration tool (available at `http://localhost:8080`)
- **redis**: Redis cache
- **rabbitmq**: RabbitMQ broker and management UI (available at `http://localhost:15672`)

RabbitMQ credentials are configured via environment variables:

- `RABBITMQ_USERNAME`
- `RABBITMQ_PASSWORD`
- `RABBITMQ_VHOST`

If `RABBITMQ_URI` is provided, it takes precedence over host/port/credential variables.

For MySQL development, use:
```bash
docker-compose -f docker-compose_mysql.yml up
```

## Development Workflow

1. **Feature Development**:
   ```bash
   # Create feature branch
   git checkout -b feature/new-feature

   # Generate module structure
   yarn g resource feature-name

   # Implement feature
   # Write tests
   # Update documentation
   ```

2. **Code Quality**:
   ```bash
   # Run linting
   yarn lint

   # Fix linting issues
   yarn lint:fix

   # Run tests
   yarn test

   # Check test coverage
   yarn test:cov
   ```

3. **Database Changes**:
   ```bash
   # Create/modify entities
   # Generate migration
   yarn migration:generate src/database/migrations/FeatureName

   # Review generated migration
   # Run migration
   yarn migration:run
   ```

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.ts",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Commands

```bash
# Start with debugger
yarn nest:start:debug

# Debug tests
yarn test:debug

# Debug specific test file
yarn test:debug -- user.service.spec.ts
```

## Performance Optimization

### Development Performance

1. **Use Vite for Development**:
   - Faster startup times
   - Hot module replacement
   - Optimized bundling

2. **Database Query Optimization**:
   ```bash
   # Enable query logging
   ENABLE_ORM_LOGS=true

   # Monitor slow queries
   # Add database indexes
   # Use query builders for complex queries
   ```

3. **Memory Management**:
   ```bash
   # Monitor memory usage
   node --inspect src/main.ts

   # Increase Node.js memory limit if needed
   node --max-old-space-size=4096 src/main.ts
   ```

### Production Considerations

- Use `yarn build:prod` for optimized builds
- Enable compression middleware
- Configure proper caching strategies
- Set up monitoring and logging
- Use environment-specific configurations
