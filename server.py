import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.engine import make_url

import history_db as hist
from graph.db import inspect_database
from main import build_graph

app = FastAPI(title="SQL Agent")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
SQLITE_MAGIC = b"SQLite format 3\x00"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

hist.init_db()
agent = build_graph()


class ConnectReq(BaseModel):
    connection_string: str


class QueryReq(BaseModel):
    session_id: str
    question: str


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _label_of(connection_string: str) -> str:
    return connection_string.split("?")[0].split("/")[-1] or "database"


def _rows_to_table(rows):
    if not rows:
        return {"columns": [], "rows": []}
    columns = list(rows[0].keys())
    return {"columns": columns, "rows": [[r.get(c) for c in columns] for r in rows]}


@app.post("/connect")
def connect(req: ConnectReq):
    try:
        schema = inspect_database(req.connection_string)
    except Exception as e:
        return JSONResponse({"error": f"Could not connect: {e}"})

    dialect = make_url(req.connection_string).get_backend_name()
    label = _label_of(req.connection_string)
    cid = hist.create_conversation(label, dialect, req.connection_string, schema)

    return {
        "session_id": cid,
        "conversation_id": cid,
        "dialect": dialect,
        "label": label,
        "schema_summary": schema,
        "title": label,
    }


@app.post("/connect-file")
async def connect_file(file: UploadFile = File(...)):
    name = file.filename or "database.db"
    if not name.lower().endswith((".db", ".sqlite", ".sqlite3")):
        return JSONResponse({"error": "Please upload a .db or .sqlite file."})

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        return JSONResponse({"error": "File too large (max 100 MB)."})
    if not contents.startswith(SQLITE_MAGIC):
        return JSONResponse(
            {"error": "That doesn't look like a SQLite database file."}
        )

    saved = UPLOAD_DIR / f"{uuid.uuid4().hex}.db"
    saved.write_bytes(contents)
    conn_str = f"sqlite:///{saved.as_posix()}"

    try:
        schema = inspect_database(conn_str)
    except Exception as e:
        saved.unlink(missing_ok=True)
        return JSONResponse({"error": f"Could not open database: {e}"})

    cid = hist.create_conversation(name, "sqlite", conn_str, schema)
    return {
        "session_id": cid,
        "conversation_id": cid,
        "dialect": "sqlite",
        "label": name,
        "schema_summary": schema,
        "title": name,
    }


@app.post("/query")
def query(req: QueryReq):
    conv = hist.get_conversation(req.session_id)

    if not conv:
        def missing():
            yield _sse("error", {"attempt": 0, "message": "Unknown session."})
            yield _sse("done", {"status": "gave_up"})

        return StreamingResponse(missing(), media_type="text/event-stream")

    hist.add_user_message(req.session_id, req.question)
    history = hist.build_llm_history(req.session_id)

    def gen():
        state = {
            "connection_string": conv["connection_string"],
            "schema": conv["schema"],
            "question": req.question,
            "generated_sql": "",
            "is_safe": False,
            "results": None,
            "error": None,
            "attempts": 0,
            "history": history,
        }

        final_sql = None
        final_result = None
        rejected_reason = None
        gave_up_msg = None
        last_error = None

        try:
            for update in agent.stream(state, stream_mode="updates"):
                for node, changes in update.items():
                    yield _sse("status", {"node": node})

                    if node == "generate_sql":
                        final_sql = changes.get("generated_sql")
                        yield _sse("sql", {"sql": final_sql})

                    elif node == "execute":
                        if changes.get("error"):
                            last_error = changes["error"]
                        elif changes.get("results") is not None:
                            final_result = _rows_to_table(changes["results"])
                            yield _sse("result", final_result)

                    elif node == "handle_error":
                        yield _sse(
                            "error",
                            {
                                "attempt": changes.get("attempts", 0),
                                "message": last_error or "Query failed.",
                            },
                        )

                    elif node == "reject":
                        rejected_reason = (
                            "Query is not read-only — only SELECT statements are allowed."
                        )
                        yield _sse("rejected", {"reason": rejected_reason})

                    elif node == "give_up":
                        gave_up_msg = last_error or "Unknown error"

            yield _sse(
                "done", {"status": "gave_up" if gave_up_msg else "success"}
            )
        finally:
            hist.add_agent_message(
                req.session_id, final_sql, final_result, rejected_reason, gave_up_msg
            )

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/conversations")
def list_conversations():
    return hist.list_conversations()


@app.get("/conversations/{cid}")
def get_conversation(cid: str):
    conv = hist.get_conversation(cid)
    if not conv:
        return JSONResponse({"error": "not found"}, status_code=404)

    messages = []
    for m in hist.get_messages(cid):
        if m["role"] == "user":
            messages.append({"role": "user", "text": m["text"]})
        else:
            messages.append(
                {
                    "role": "agent",
                    "sql": m["sql"],
                    "result": json.loads(m["result_json"]) if m["result_json"] else None,
                    "rejected": m["rejected"],
                    "gaveUp": m["gave_up"],
                }
            )

    return {
        "id": cid,
        "title": conv["title"],
        "dialect": conv["dialect"],
        "label": conv["label"],
        "messages": messages,
    }


@app.delete("/conversations/{cid}")
def delete_conversation(cid: str):
    conv = hist.get_conversation(cid)
    if conv:
        cs = conv.get("connection_string") or ""
        upload_prefix = f"sqlite:///{UPLOAD_DIR.as_posix()}"
        if cs.startswith(upload_prefix):
            try:
                Path(cs[len("sqlite:///"):]).unlink(missing_ok=True)
            except OSError:
                pass

    hist.delete_conversation(cid)
    return {"ok": True}
