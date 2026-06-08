from typing import Optional,Any,TypedDict,List

class AgentState(TypedDict):
    connection_string : str
    schema:str
    question:str
    generated_sql:str
    is_safe:bool
    results: Optional[List[Any]]
    error: Optional[str]
    attempts: int
    history: List[dict]