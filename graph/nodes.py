from langchain_groq import ChatGroq
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

from graph.db import inspect_database, run_query
from tools.safety import is_read_only
from tools.clean_sql import clean_sql

SYSTEM_INSTRUCTIONS = """You are an expert data analyst that writes SQL.
Generate exactly ONE read-only SQL SELECT query that answers the user's
question, using ONLY the tables and columns in the provided schema.

Rules:
- Output ONLY the SQL query. No explanation, no comments, no markdown fences.
- Use only tables/columns that exist in the schema; never invent names.
- Write standard SQL for the given dialect.
- Return results a human can read: when a value is a foreign-key id that
  points to another table, JOIN that table and include its descriptive
  column(s) instead of (or alongside) the raw id.
- Give computed or aggregated columns clear, descriptive aliases.
- Select the columns a person would actually want to see for the question;
  avoid returning bare ids when a human-readable label is available.

Conversation:
- The user may ask follow-up questions that refer to a previous one (e.g.
  "now add ...", "group that by ...", "same but for ...", "include the
  name"). When the question is a refinement, base your new query on the most
  recent relevant query in the conversation history and adjust it.
- Otherwise, treat the question as a brand-new, standalone request."""

load_dotenv()

llm = ChatGroq(
    model="qwen/qwen3-32b",
    temperature=0,
)


def inspect_schema(state):
    schema = inspect_database(state["connection_string"])
    return {"schema": schema}


def _format_history(history):
    if not history:
        return ""
    lines = ["Conversation history (most recent last):"]
    for turn in history:
        lines.append(f"  Q: {turn['question']}")
        lines.append(f"  SQL: {turn['sql']}")
    return "\n".join(lines)


def generate_sql(state):
    dialect = make_url(state["connection_string"]).get_backend_name()

    parts = [
        SYSTEM_INSTRUCTIONS,
        f"\nSQL dialect: {dialect}",
        f"\nSchema:\n{state['schema']}",
    ]

    history = _format_history(state.get("history"))
    if history:
        parts.append("\n" + history)

    parts.append(f"\nCurrent question: {state['question']}")

    if state.get("error"):
        parts.append(
            f"\nYour previous query failed with this error:\n{state['error']}\n"
            "Fix the query."
        )

    response = llm.invoke("\n".join(parts))
    sql = clean_sql(response.content)
    return {"generated_sql": sql}


def validate_safety(state):
    safe = is_read_only(state["generated_sql"])
    return {"is_safe": safe}


def execute(state):
    try:
        rows = run_query(state["connection_string"], state["generated_sql"])
        return {"results": rows, "error": None}
    except Exception as e:
        return {"error": str(e)}


def handle_error(state):
    return {"attempts": state["attempts"] + 1}


def format_results(state):
    from tabulate import tabulate
    rows = state["results"]
    if not rows:
        return {}
    print(tabulate(rows, headers="keys", tablefmt="grid"))
    return {}
