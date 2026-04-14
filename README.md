# Gen X Business Builder

A production-grade SaaS platform that processes scraped business leads into tailored AI Agent specifications or Website redesign proposals, with personalized outreach emails.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React SPA  │────▶│ Express API  │────▶│  PostgreSQL DB  │
│  (Vite)     │◀────│ + WebSocket  │     └─────────────────┘
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────────┐
                    │  BullMQ      │────▶│     Redis       │
                    │  Job Queues  │     └─────────────────┘
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│  Enrichment   │  │  AI Agent /  │  │   Outreach   │
│  Worker       │  │  Website Gen │  │   Generator  │
└───────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────┬───────┘                  │
                   ▼                          ▼
            ┌────────────┐           ┌──────────────┐
            │  OpenAI    │           │  Email Draft  │
            │  GPT API   │           │  Storage      │
            └────────────┘           └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS 4, React Router 7 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Queue | Redis + BullMQ |
| AI | OpenAI GPT-4o |
| Real-time | WebSocket (ws) |
| Validation | Zod |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# 1. Start databases
docker compose up -d

# 2. Install dependencies
npm run install:all

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your OpenAI API key

# 4. Run database migrations
npm run db:migrate

# 5. Start development servers
npm run dev
```

The frontend runs at http://localhost:5173 and the API at http://localhost:3001.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/leads/import | Import leads (CSV-compatible JSON) |
| GET | /api/leads | List leads (paginated, filterable) |
| GET | /api/leads/:id | Get lead details |
| POST | /api/leads/:id/start | Start processing a single lead |
| GET | /api/leads/:id/preview | Get full preview (insights + solution + outreach) |
| GET | /api/batches | List all batches |
| GET | /api/batches/:id | Get batch details with leads |
| POST | /api/batches/:id/start | Start processing entire batch |
| GET | /api/batches/:id/progress | Get batch progress stats |
| GET | /api/jobs | List jobs |
| GET | /api/jobs/:id | Get job status |
| GET | /api/stats/overview | Dashboard stats |
| GET | /api/health | Health check |

## Processing Pipeline

For each lead:

1. **Enrichment** — Fetch website content, analyze business data via LLM
2. **Solution Generation** — Create AI Agent spec OR Website proposal
3. **Outreach Generation** — Draft personalized email referencing insights + solution

Each step runs as an independent BullMQ worker with retry logic and progress tracking.

## Data Flow

```
CSV Import → Lead Created (PENDING)
          → Enrichment Job (QUEUED → RUNNING → COMPLETED)
          → Lead status: ENRICHING
          → AI/Website Job (QUEUED → RUNNING → COMPLETED)
          → Lead status: PROCESSING
          → Outreach Job (QUEUED → RUNNING → COMPLETED)
          → Lead status: COMPLETED
```

WebSocket broadcasts progress updates to connected clients in real-time.

## Map Scraper Integration

Import directly from the Map Scraper CSV export. The system accepts these CSV headers:
- Name, Website, Email, Social Media, Rating, Hours, Phone, Address, Category
