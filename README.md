# Text-to-SQL Agent

A full stack application that lets anyone query a database in plain English. You connect a database, ask a question such as "which customer spent the most last month?", and the agent writes the SQL, runs it, and returns the answer as a clean table. No SQL knowledge is required.

## Features

- Plain English to SQL using an LLM (Qwen3-32B via Groq)
- Works with SQLite, PostgreSQL, and MySQL through one SQLAlchemy interface
- Connect by pasting a connection string or by uploading a SQLite file
- Read only by design, with three layers of safety so the database is never modified
- Self correction: when a query fails, the agent feeds the error back to the model and retries up to three times
- Conversation memory, so follow up questions like "now show their names" work
- Chat history stored in SQLite, with a sidebar to reopen and continue past conversations
- Live streaming interface: status, generated SQL, and results appear as the agent works

## How it works

The agent is built with LangGraph as a small state machine. Each question flows through these steps:

1. Inspect schema: read the tables and columns of the connected database.
2. Generate SQL: the LLM writes a query using the schema, conversation history, and dialect.
3. Validate safety: a parser confirms the query is a single read only SELECT.
4. Execute: the query runs on a read only connection.
5. Format results: rows are returned to the interface as a table.

If execution fails, the error is passed back into the prompt and the agent retries, up to three attempts. If a query is not read only, it is blocked before it ever runs.

## Safety

Safety is enforced in three independent layers:

1. The model is instructed to produce only SELECT statements.
2. A validator parses every generated query and rejects writes, multiple statements, and comment based tricks.
3. The database connection is opened in read only mode, so even a write that slipped through would be refused by the database itself.

## Tech stack

Backend: Python, LangGraph, SQLAlchemy, FastAPI, Groq (Qwen3-32B), SQLite

Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Server Sent Events

## Project structure

```
.
├── server.py            FastAPI server (connect, query streaming, history)
├── main.py              CLI version and the LangGraph builder
├── history_db.py        SQLite persistence for chat history
├── graph/
│   ├── state.py         Agent state definition
│   ├── nodes.py         Agent nodes and the LLM client
│   └── db.py            Database connection and schema inspection
├── tools/
│   ├── safety.py        Read only SQL validator
│   └── clean_sql.py     Strips model formatting from generated SQL
├── requirements.txt
├── .env.example
└── frontend/            Next.js chat interface
```

## Getting started

### Prerequisites

- Python 3.14
- Node.js 18 or newer
- A Groq API key

### Backend setup

Install the Python dependencies:

```
pip install -r requirements.txt
```

Copy the example environment file and add your key:

```
cp .env.example .env
```

Then set GROQ_API_KEY in .env.

### Frontend setup

```
cd frontend
npm install
```

## Running

Start the backend:

```
uvicorn server:app --reload --port 8000
```

Start the frontend in a second terminal:

```
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage

1. Click Connect database.
2. Paste a connection string or upload a SQLite file.
3. Ask a question in plain English.
4. Watch the generated SQL and results stream in.

Connection string formats:

- SQLite: `sqlite:///path/to/file.db`
- PostgreSQL: `postgresql+psycopg2://user:pass@host:5432/dbname`
- MySQL: `mysql+pymysql://user:pass@host:3306/dbname`

## Notes

- Connection strings are stored locally in chat_history.db so conversations can resume. This file is ignored by git. For multi user or production use, store credentials securely.
- The CLI version in main.py can be run on its own for a terminal based experience.
