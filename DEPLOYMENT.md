# Deployment Guide

This project runs as two services:

- Backend (FastAPI agent) on Hugging Face Spaces
- Frontend (Next.js chat interface) on Vercel

The browser calls the Hugging Face backend directly. CORS on the backend allows it, and Server Sent Events stream straight from Hugging Face to the browser.

## Part 1: Backend on Hugging Face Spaces

### 1. Create the Space

1. Go to https://huggingface.co/new-space
2. Name it (for example, text-to-sql-agent)
3. Select Docker as the SDK, and the blank template
4. Choose the free hardware tier
5. Create the Space

### 2. Add the backend files

Push these files and folders to the Space repo (you can drag and drop in the web Files tab, or clone the Space and copy them in):

```
Dockerfile
requirements.txt
server.py
main.py
history_db.py
graph/
tools/
```

Do not upload the frontend folder, .env, or any database files.

### 3. Add the Space config to README.md

The Space needs a README.md whose top section tells Hugging Face it is a Docker app. Create README.md in the Space with this at the very top:

```
---
title: Text To SQL Agent
sdk: docker
app_port: 7860
pinned: false
---

Backend API for the Text-to-SQL Agent.
```

### 4. Add your secret

In the Space, open Settings, then Variables and secrets, and add a secret:

```
GROQ_API_KEY = your_real_groq_key
```

Optionally add LANGSMITH_API_KEY and LANGSMITH_TRACING if you want tracing.

### 5. Build and test

The Space builds automatically. When it is running, your backend URL looks like:

```
https://YOUR_USERNAME-text-to-sql-agent.hf.space
```

Open `https://YOUR_USERNAME-text-to-sql-agent.hf.space/docs` to confirm the API is live.

## Part 2: Frontend on Vercel

### 1. Import the project

1. Go to https://vercel.com/new
2. Import the GitHub repo text-to-sql-agent
3. Set the Root Directory to `frontend`
4. Framework preset should auto detect Next.js

### 2. Add the backend URL

Under Environment Variables, add:

```
NEXT_PUBLIC_API_BASE = https://YOUR_USERNAME-text-to-sql-agent.hf.space
```

Use the exact Space URL with no trailing slash.

### 3. Deploy

Click Deploy. Vercel gives you a URL like `https://text-to-sql-agent.vercel.app`.

### 4. Lock down CORS (optional but recommended)

Once you know the Vercel URL, go back to the Hugging Face Space, open Settings, Variables and secrets, and add:

```
ALLOWED_ORIGINS = https://text-to-sql-agent.vercel.app
```

This restricts the backend to only your frontend. Without it, the backend allows all origins, which is fine for testing.

## Notes and limitations

- Free Hugging Face Spaces use ephemeral storage. The chat history database and uploaded files reset when the Space restarts or rebuilds. For permanent storage, attach persistent storage or use a hosted database.
- Free Spaces sleep after a period of inactivity and take a few seconds to wake on the next request.
- This is a public app where users paste their own database connection strings. Connection strings are stored in the Space file system. Prefer the SQLite upload option for demos, and avoid pointing it at private production databases.
- NEXT_PUBLIC_API_BASE is read at build time, so changing it requires a redeploy on Vercel.
