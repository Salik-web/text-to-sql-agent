import json
import sqlite3
import time
import uuid
from pathlib import Path

DB_PATH = Path(__file__).parent / "chat_history.db"


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with _conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id                TEXT PRIMARY KEY,
                title             TEXT NOT NULL,
                label             TEXT,
                dialect           TEXT,
                connection_string TEXT,
                schema            TEXT,
                created_at        REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                seq             INTEGER NOT NULL,
                role            TEXT NOT NULL,
                text            TEXT,
                sql             TEXT,
                result_json     TEXT,
                rejected        TEXT,
                gave_up         TEXT,
                created_at      REAL NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );
            """
        )


def create_conversation(label, dialect, connection_string, schema):
    cid = uuid.uuid4().hex[:12]
    with _conn() as c:
        c.execute(
            "INSERT INTO conversations "
            "(id, title, label, dialect, connection_string, schema, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (cid, label, label, dialect, connection_string, schema, time.time()),
        )
    return cid


def get_conversation(cid):
    with _conn() as c:
        row = c.execute(
            "SELECT * FROM conversations WHERE id = ?", (cid,)
        ).fetchone()
        return dict(row) if row else None


def list_conversations():
    with _conn() as c:
        rows = c.execute(
            "SELECT id, title, label, dialect, created_at "
            "FROM conversations ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def delete_conversation(cid):
    with _conn() as c:
        c.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
        c.execute("DELETE FROM conversations WHERE id = ?", (cid,))


def _next_seq(c, cid):
    row = c.execute(
        "SELECT COALESCE(MAX(seq), 0) AS m FROM messages WHERE conversation_id = ?",
        (cid,),
    ).fetchone()
    return (row["m"] or 0) + 1


def add_user_message(cid, text):
    with _conn() as c:
        has_user = c.execute(
            "SELECT 1 FROM messages WHERE conversation_id = ? AND role = 'user' LIMIT 1",
            (cid,),
        ).fetchone()
        if not has_user:
            title = text.strip()[:60]
            c.execute(
                "UPDATE conversations SET title = ? WHERE id = ?", (title, cid)
            )
        seq = _next_seq(c, cid)
        c.execute(
            "INSERT INTO messages (id, conversation_id, seq, role, text, created_at) "
            "VALUES (?, ?, ?, 'user', ?, ?)",
            (uuid.uuid4().hex[:12], cid, seq, text, time.time()),
        )


def add_agent_message(cid, sql, result, rejected, gave_up):
    with _conn() as c:
        seq = _next_seq(c, cid)
        c.execute(
            "INSERT INTO messages "
            "(id, conversation_id, seq, role, sql, result_json, rejected, gave_up, created_at) "
            "VALUES (?, ?, ?, 'agent', ?, ?, ?, ?, ?)",
            (
                uuid.uuid4().hex[:12],
                cid,
                seq,
                sql,
                json.dumps(result) if result else None,
                rejected,
                gave_up,
                time.time(),
            ),
        )


def get_messages(cid):
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY seq", (cid,)
        ).fetchall()
        return [dict(r) for r in rows]


def build_llm_history(cid, limit=5):
    pairs = []
    pending_q = None
    for m in get_messages(cid):
        if m["role"] == "user":
            pending_q = m["text"]
        elif m["role"] == "agent":
            if pending_q and m["sql"] and not m["rejected"] and not m["gave_up"]:
                pairs.append({"question": pending_q, "sql": m["sql"]})
            pending_q = None
    return pairs[-limit:]
