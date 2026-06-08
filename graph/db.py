from sqlalchemy import create_engine, inspect, text

_READ_ONLY_STMT = {
    "sqlite": "PRAGMA query_only = ON",
    "postgresql": "SET TRANSACTION READ ONLY",
    "mysql": "SET SESSION TRANSACTION READ ONLY",
}


def inspect_database(connection_string):
    engine = create_engine(connection_string)
    inspector = inspect(engine)

    schema_parts = []
    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        col_lines = [f"  {c['name']} {c['type']}" for c in columns]
        schema_parts.append(
            f"Table: {table_name}\n" + "\n".join(col_lines)
        )

    engine.dispose()
    return "\n\n".join(schema_parts)


def run_query(connection_string, sql):
    engine = create_engine(connection_string)
    with engine.connect() as conn:
        read_only = _READ_ONLY_STMT.get(engine.dialect.name)
        if read_only:
            conn.execute(text(read_only))
        result = conn.execute(text(sql))
        rows = [dict(row._mapping) for row in result]
    engine.dispose()
    return rows
