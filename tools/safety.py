import re

FORBIDDEN = {
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
    "CREATE", "REPLACE", "MERGE", "GRANT", "REVOKE",
    "EXEC", "EXECUTE", "CALL", "ATTACH", "DETACH", "PRAGMA", "VACUUM",
}


def _strip_comments(sql):
    sql = re.sub(r"--[^\n]*", " ", sql)
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    return sql


def is_read_only(sql):
    if not sql or not sql.strip():
        return False

    cleaned = _strip_comments(sql).strip()

    cleaned = cleaned.rstrip(";").strip()
    if ";" in cleaned:
        return False

    first_word = cleaned.split(None, 1)[0].upper()
    if first_word not in ("SELECT", "WITH"):
        return False

    upper = cleaned.upper()
    for kw in FORBIDDEN:
        if re.search(rf"\b{kw}\b", upper):
            return False

    return True
