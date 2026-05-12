"""
FastAPI router: /api/review endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
import shutil
import json
import uuid
from pathlib import Path
from agent import get_agent
from datetime import datetime


router = APIRouter(prefix="/api", tags=["Performance Review"])

DATA_DIR = Path(__file__).parent.parent / "sample_data"
LOG_FILE = Path(__file__).parent.parent / "query_log.json"


# ── Request / Response Models ──────────────────────────────────────────────────


class ReviewRequest(BaseModel):
    employee_name: str = Field(
        ..., min_length=2, description="Full or partial employee name"
    )
    role: str = Field(..., description="Employee role (e.g. Software Engineer)")
    additional_context: str = Field(
        default="", description="Any extra context for the review"
    )


class ReviewResponse(BaseModel):
    employee_name: str
    role: str
    review: str
    tools_used: list[str]
    status: str


class HealthResponse(BaseModel):
    status: str
    message: str


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., min_length=1)


class AnalyzeRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        description="Latest user chat message for the performance review assistant",
        alias="query",
    )
    chat_history: list[ChatMessage] = Field(default_factory=list, alias="history")
    session_id: str | None = Field(
        default=None,
        description="Stable chat session identifier used for conversation memory",
        alias="sessionId",
    )
    model_config = {"populate_by_name": True}


class AnalyzeResponse(BaseModel):
    question: str
    answer: str
    tools_used: list[str]
    status: str
    timestamp: str


class QueryLogEntry(BaseModel):
    timestamp: str
    question: str
    answer: str
    tools_used: list[str]


class QueryLogResponse(BaseModel):
    entries: list[QueryLogEntry]
    count: int

class StatsResponse(BaseModel):
    employees: int
    self_reviews: int
    manager_reviews: int
    complete: int



def _extract_review_text(agent_result: dict) -> str:
    # ✅ Case 1: direct output (new LangChain)
    if isinstance(agent_result, dict) and "output" in agent_result:
        return str(agent_result["output"]).strip()

    # ✅ Case 2: messages (your current logic)
    messages = agent_result.get("messages", [])
    print(messages, "messages getting printed")
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            content = message.content
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, str):
                        text_parts.append(item)
                    elif isinstance(item, dict) and item.get("type") == "text":
                        text_parts.append(item.get("text", ""))
                return "\n".join(part for part in text_parts if part).strip()

    raise ValueError("Agent returned no final review text.")


def _extract_tools_used(agent_result: dict) -> list[str]:
    """Collect tool names from tool messages in the agent state."""
    messages = agent_result.get("messages", [])
    tools_used = []
    for message in messages:
        if isinstance(message, ToolMessage) and getattr(message, "name", None):
            tools_used.append(message.name)
    for step in agent_result.get("intermediate_steps", []):
        action = step[0] if isinstance(step, (tuple, list)) and step else None
        tool_name = getattr(action, "tool", None)
        if tool_name:
            tools_used.append(tool_name)
    return sorted(set(tools_used))


def _build_agent_history(history: list[ChatMessage]) -> list[HumanMessage | AIMessage]:
    messages: list[HumanMessage | AIMessage] = []
    for message in history:
        content = message.content.strip()
        if not content:
            continue
        if message.role == "assistant":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
    return messages


def _load_query_log() -> list[dict]:
    if not LOG_FILE.exists():
        return []
    try:
        return json.loads(LOG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_query_log(entries: list[dict]) -> None:
    LOG_FILE.write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _append_query_log(entry: dict) -> None:
    entries = _load_query_log()
    entries.append(entry)
    _save_query_log(entries[-100:])


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", message="Performance Review Agent is running.")


@router.post("/review", response_model=ReviewResponse)
async def generate_review(request: ReviewRequest):
    """
    Generate a structured performance review for the given employee.
    The agent will fetch data from CSV/Excel files using LangChain tools.
    """
    query = (
        f"Generate a professional annual performance review for employee '{request.employee_name}' "
        f"who works as a '{request.role}'.\n"
        f"You must strictly follow the Performance Review rules outlined in your system prompt.\n"
        f"Please gather all inputs: performance history, self-review, manager feedback, and project data "
        f"from the CSV and Excel data sources before writing the narrative."
    )
    if request.additional_context:
        query += f"Additional context: {request.additional_context}"

    try:
        agent = get_agent()
        result = agent.invoke(
            {
                "input": (
                    "You MUST use CSV_Search or Excel_Search before answering.\n\n"
                    f"User request:\n{query}"
                ),
                "chat_history": [],
            }
        )
        review_text = _extract_review_text(result)
        tools_used = _extract_tools_used(result)

        return ReviewResponse(
            employee_name=request.employee_name,
            role=request.role,
            review=review_text,
            tools_used=tools_used,
            status="success",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_question(request: AnalyzeRequest):
    """Handle a conversational turn for the performance review assistant."""
    thread_id = (request.session_id or "").strip() or f"chat_{uuid.uuid4().hex}"
    chat_history = _build_agent_history(request.chat_history)

    try:
        agent = get_agent()
        result = agent.invoke(
            {
                "input": request.question,
                "chat_history": chat_history,
            }
        )
        answer = _extract_review_text(result)
        tools_used = _extract_tools_used(result)
        timestamp = datetime.now().isoformat(timespec="seconds")

        entry = {
            "timestamp": timestamp,
            "question": request.question,
            "answer": answer,
            "tools_used": tools_used,
            "session_id": thread_id,
        }
        _append_query_log(entry)

        return AnalyzeResponse(
            question=request.question,
            answer=answer,
            tools_used=tools_used,
            status="success",
            timestamp=timestamp,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/upload-data")
async def upload_data_file(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel file to be used as a data source by the agent.
    """
    allowed_extensions = {".csv", ".xlsx", ".xls"}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Allowed: {allowed_extensions}",
        )

    dest = DATA_DIR / file.filename
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": f"File '{file.filename}' uploaded successfully.",
        "path": str(dest),
    }


@router.delete("/data-sources/{filename}")
async def delete_data_file(filename: str):
    """Delete a data source file."""
    file_path = DATA_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        file_path.unlink()
        return {"status": "success", "message": f"File '{filename}' deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-sources")
async def list_data_sources():
    """List all available data source files."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        {
            "name": f.name,
            "type": f.suffix.upper().lstrip("."),
            "size_kb": round(f.stat().st_size / 1024, 2),
        }
        for f in DATA_DIR.iterdir()
        if f.suffix.lower() in {".csv", ".xlsx", ".xls"}
    ]
    return {"data_sources": files, "count": len(files)}


@router.get("/query-log", response_model=QueryLogResponse)
async def get_query_log():
    entries = _load_query_log()
    return QueryLogResponse(entries=entries[::-1], count=len(entries))


@router.get('/stats', response_model=StatsResponse)
async def get_stats():
    from tools.data_tools import _load_employee_directory, _get_reviews_connection
    directory = _load_employee_directory()
    employees_count = len(directory) if not directory.empty else 0
    
    self_count = 0
    mgr_count = 0
    complete_count = 0
    
    try:
        with _get_reviews_connection() as conn:
            row_self = conn.execute('SELECT COUNT(*) FROM self_reviews').fetchone()
            if row_self: self_count = row_self[0]
            
            row_mgr = conn.execute('SELECT COUNT(*) FROM manager_reviews').fetchone()
            if row_mgr: mgr_count = row_mgr[0]
            
            row_comp = conn.execute(
                'SELECT COUNT(*) FROM self_reviews s JOIN manager_reviews m ON s.employee_id = m.employee_id'
            ).fetchone()
            if row_comp: complete_count = row_comp[0]
    except Exception:
        pass
        
    return StatsResponse(
        employees=employees_count,
        self_reviews=self_count,
        manager_reviews=mgr_count,
        complete=complete_count
    )

