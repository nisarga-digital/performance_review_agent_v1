"""
FastAPI router: /api/review endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, ToolMessage
import shutil
import json
from pathlib import Path
from datetime import datetime

from agent import get_agent

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
        description="Natural-language performance analytics question",
        alias="query",
    )
    chat_history: list[ChatMessage] = Field(default_factory=list, alias="history")
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


def _extract_review_text(agent_result: dict) -> str:
    # ✅ Case 1: direct output (new LangChain)
    if isinstance(agent_result, dict) and "output" in agent_result:
        return str(agent_result["output"]).strip()

    # ✅ Case 2: messages (your current logic)
    messages = agent_result.get("messages", [])
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            content = message.content
            if isinstance(content, str):
                return content
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
    return sorted(set(tools_used))


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
                "messages": [
                    {
                        "role": "user",
                        "content": f"""
                        You MUST use CSV_Search or Excel_Search before answering.

                        User request:
                        {query}
                        """,
                    }
                ]
            },
            config={"configurable": {"thread_id": "default_api_session"}}
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
    """Answer a free-form question about employee performance data."""
    prompt_lines = [
        "Answer the following performance analysis question using the available CSV and Excel data.",
        "Always search the data first before answering.",
        f"Question: {request.question}",
    ]

    if request.chat_history:
        prompt_lines.append("Relevant prior conversation:")
        for message in request.chat_history[-6:]:
            prompt_lines.append(f"{message.role}: {message.content}")

    prompt = "\n".join(prompt_lines)

    try:
        agent = get_agent()
        result = agent.invoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config={"configurable": {"thread_id": "default_api_session"}}
        )
        answer = _extract_review_text(result)
        tools_used = _extract_tools_used(result)
        timestamp = datetime.now().isoformat(timespec="seconds")

        entry = {
            "timestamp": timestamp,
            "question": request.question,
            "answer": answer,
            "tools_used": tools_used,
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
