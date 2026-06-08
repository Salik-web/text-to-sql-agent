from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END

from graph.state import AgentState
from graph.db import inspect_database
from graph.nodes import (
    generate_sql, validate_safety, execute, handle_error, format_results,
)

load_dotenv()


def route_after_safety(state):
    return "execute" if state["is_safe"] else "reject"


def route_after_execute(state):
    if state["error"] is None:
        return "format_results"
    if state["attempts"] < 3:
        return "handle_error"
    return "give_up"


def reject(state):
    print("\n[BLOCKED] Query is not a read-only SELECT.")
    print(f"   Generated: {state['generated_sql']}")
    return {}


def give_up(state):
    print(f"\n[FAILED] Couldn't produce a working query after {state['attempts']} attempts.")
    print(f"   Last error: {state['error']}")
    return {}


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("generate_sql", generate_sql)
    g.add_node("validate_safety", validate_safety)
    g.add_node("execute", execute)
    g.add_node("handle_error", handle_error)
    g.add_node("format_results", format_results)
    g.add_node("reject", reject)
    g.add_node("give_up", give_up)

    g.add_edge(START, "generate_sql")
    g.add_edge("generate_sql", "validate_safety")

    g.add_conditional_edges("validate_safety", route_after_safety, {
        "execute": "execute",
        "reject": "reject",
    })

    g.add_conditional_edges("execute", route_after_execute, {
        "format_results": "format_results",
        "handle_error": "handle_error",
        "give_up": "give_up",
    })

    g.add_edge("handle_error", "generate_sql")
    g.add_edge("format_results", END)
    g.add_edge("reject", END)
    g.add_edge("give_up", END)

    return g.compile()


def main():
    conn = input("Database connection string: ").strip()
    try:
        schema = inspect_database(conn)
    except Exception as e:
        print(f"Could not connect: {e}")
        return

    app = build_graph()
    print("\nConnected. Ask questions (or 'quit').\n")

    history = []
    MAX_HISTORY = 5

    while True:
        question = input("> ").strip()
        if question.lower() in ("quit", "exit"):
            break

        state = {
            "connection_string": conn,
            "schema": schema,
            "question": question,
            "generated_sql": "",
            "is_safe": False,
            "results": None,
            "error": None,
            "attempts": 0,
            "history": history,
        }
        final = app.invoke(state)

        if final["results"] is not None:
            history.append({"question": question, "sql": final["generated_sql"]})
            del history[:-MAX_HISTORY]


if __name__ == "__main__":
    main()
