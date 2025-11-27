# Orchi AI - Multi-Agent Orchestration System

A configurable Multi-Agent Orchestration System where any agent can act as an orchestrator using consult rules, memory, models, and tools.

## Features

- **Multi-Agent Orchestration**: Agents can consult other agents based on configurable rules
- **Multi-Provider LLM Support**: OpenAI, Anthropic, Google, and custom providers
- **Tool Integration**: Seedream, Veo, CRM, Email, Social, and custom tools
- **Multiple Trigger Types**: Chat, Webhook, and Scheduled triggers
- **Memory Management**: Short-term and long-term memory with intelligent summarization
- **Admin UI**: Comprehensive web interface for managing all system components

## Architecture

```
packages/
├── backend/     # Node.js/TypeScript API server
├── frontend/    # Next.js Admin UI
├── shared/      # Shared types and utilities
└── database/    # Prisma schema and migrations
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Install PostgreSQL (if not already installed)
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb orchiai

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run db:migrate
```

### 3. Development

```bash
# Start all services
npm run dev

# Or start individually
npm run backend:dev  # Backend API on port 3001
npm run frontend:dev # Frontend UI on port 3000
```

### 4. Database Management

```bash
# Open Prisma Studio
npm run db:studio

# Create new migration
npm run db:migrate

# Reset database
npm run db:reset
```

## Project Structure

See [Project Plan](./Project/project-plan.md) and [Implementation Plan](./Project/claude-implementation-plan.md) for detailed architecture and implementation details.

## Development Workflow

1. Create feature branch from `main`
2. Make changes in appropriate package
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Commit changes
6. Create pull request

## Testing

### Automated API Testing

```bash
# Run comprehensive API test suite
./scripts/test-api.sh

# Or test manually using curl
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/agents
```

### Test Documentation

- **[Test Plan](./TEST-PLAN.md)** - Comprehensive test plan with 100+ test cases
- **[Quick Reference](./TEST-QUICK-REFERENCE.md)** - Quick testing guide and examples

### Manual Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -w packages/backend
npm test -w packages/frontend
```

## Deployment

See [Deployment Guide](./docs/deployment.md) for production deployment instructions.

## Documentation

- [Architecture Overview](./Project/claude-implementation-plan.md)
- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Agent Configuration Guide](./docs/agents.md)
- [Tool Integration Guide](./docs/tools.md)

## License

Private - All Rights Reserved

## Support

For issues and questions, please open an issue in the repository.
