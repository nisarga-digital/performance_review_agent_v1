"""
Streamlit Frontend - Performance Review Intelligence
Chat-style UI for asking performance questions and reviewing stored outputs.
"""

from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
import streamlit as st

st.set_page_config(
    page_title="Performance Review Intelligence",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

BACKEND_URL = "http://localhost:8000"
DATA_DIR = Path(__file__).resolve().parent.parent / "backend" / "sample_data"
SAMPLE_QUESTIONS = [
    "Give me a full performance analysis of Sneha Gupta across all available years.",
    "What is the average project rating for Sneha Gupta in 2025? Show your calculation steps.",
    "Evaluate the progression of Sneha Gupta's career by examining ratings, strengths, and improvements.",
    "List the recurring areas for improvement for Sneha Gupta and explain the trend over time.",
]

st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Outfit', sans-serif;
}

.stApp {
    background:
        radial-gradient(circle at top, rgba(87, 181, 255, 0.10), transparent 28%),
        radial-gradient(circle at 20% 20%, rgba(155, 114, 255, 0.10), transparent 24%),
        linear-gradient(180deg, #090b17 0%, #0b1020 100%);
    color: #f3f5ff;
}

section[data-testid="stSidebar"] {
    background: rgba(11, 16, 32, 0.92) !important;
    border-right: 1px solid rgba(137, 157, 255, 0.16);
}

.hero {
    text-align: center;
    padding: 1.5rem 0 0.25rem;
}

.hero-title {
    font-size: 4rem;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
    background: linear-gradient(90deg, #f2d1ff 0%, #b5bdfd 44%, #6be9ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero-subtitle {
    margin-top: 0.85rem;
    color: #61709d;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.95rem;
}

.pill-row {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 1.2rem 0 1.8rem;
}

.pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #aeb8db;
    border-radius: 999px;
    padding: 0.55rem 1rem;
    font-size: 0.95rem;
}

.metric-shell {
    background: rgba(14, 20, 39, 0.88);
    border: 1px solid rgba(140, 160, 255, 0.14);
    border-radius: 20px;
    padding: 1.2rem 1.35rem;
    min-height: 132px;
}

.metric-label {
    color: #c8d2ff;
    opacity: 0.82;
    font-size: 0.9rem;
}

.metric-value {
    margin-top: 0.6rem;
    font-size: 2.7rem;
    line-height: 1;
    font-weight: 700;
    color: #ffffff;
}

.metric-value.ready {
    color: #ecf6ff;
}

.sample-wrap {
    border: 1px solid rgba(134, 157, 255, 0.18);
    border-radius: 16px;
    background: rgba(10, 14, 29, 0.78);
    margin-bottom: 1.4rem;
}

.user-bubble {
    margin: 1rem 0 1.25rem auto;
    max-width: 78%;
    background: linear-gradient(180deg, rgba(41, 31, 77, 0.95), rgba(29, 23, 57, 0.95));
    border: 1px solid rgba(151, 115, 255, 0.38);
    border-radius: 22px;
    padding: 1rem 1.2rem;
    box-shadow: 0 0 28px rgba(132, 85, 255, 0.10);
}

.bubble-meta {
    text-align: right;
    color: #9b90d1;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.45rem;
}

.assistant-shell {
    margin: 1.35rem 0 2rem;
}

.assistant-badge {
    display: inline-flex;
    gap: 0.7rem;
    align-items: center;
    padding: 0.85rem 1rem;
    background: rgba(8, 17, 34, 0.95);
    border: 1px solid rgba(0, 220, 255, 0.28);
    border-radius: 18px;
    color: #6ce7ff;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
}

.assistant-time {
    color: #7380ab;
    font-weight: 400;
    font-size: 0.8rem;
}

.latency-pill {
    border-radius: 999px;
    padding: 0.24rem 0.5rem;
    background: rgba(0, 234, 170, 0.12);
    border: 1px solid rgba(0, 234, 170, 0.24);
    color: #4df6be;
    font-size: 0.74rem;
}

.assistant-answer {
    margin-top: 1rem;
    color: #eff3ff;
    font-size: 1.03rem;
    line-height: 1.75;
}

.tool-chip {
    display: inline-block;
    margin-right: 0.45rem;
    margin-top: 0.7rem;
    border-radius: 999px;
    padding: 0.3rem 0.7rem;
    background: rgba(255, 192, 81, 0.10);
    border: 1px solid rgba(255, 192, 81, 0.24);
    color: #ffcf78;
    font-size: 0.82rem;
}

.empty-state {
    border: 1px dashed rgba(151, 172, 255, 0.18);
    border-radius: 22px;
    padding: 4.4rem 1.5rem;
    text-align: center;
    color: #8a96bd;
    background: rgba(10, 14, 29, 0.45);
}

.composer-note {
    color: #8b97bc;
    font-size: 0.92rem;
}

.stTextArea textarea {
    min-height: 118px !important;
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(151, 172, 255, 0.16) !important;
    color: #eef2ff !important;
    border-radius: 16px !important;
}

.stButton > button {
    border: none !important;
    border-radius: 14px !important;
    font-weight: 700 !important;
}

.stTabs [data-baseweb="tab-list"] {
    gap: 1rem;
}

.stTabs [data-baseweb="tab"] {
    color: #8e9ac4;
    font-size: 1.35rem;
    font-weight: 600;
}

.stTabs [aria-selected="true"] {
    color: #74e7ff !important;
}
</style>
""",
    unsafe_allow_html=True,
)


def init_state() -> None:
    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []
    if "query_log_cache" not in st.session_state:
        st.session_state.query_log_cache = []
    if "question_input" not in st.session_state:
        st.session_state.question_input = ""


def apply_pending_input_updates() -> None:
    """Apply queued text-area updates before the widget is instantiated."""
    
    # ✅ Use .get() to avoid key errors
    if st.session_state.get("_pending_question_input") is not None:
        st.session_state["question_input"] = st.session_state.pop("_pending_question_input")

    # ✅ IMPORTANT FIX: Only set if already exists
    if st.session_state.get("_clear_question_input", False):
        if "question_input" in st.session_state:
            del st.session_state["question_input"]   # 🔥 DELETE instead of assign
        st.session_state["_clear_question_input"] = False


def check_backend() -> bool:
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=3)
        return response.status_code == 200
    except Exception:
        return False


def fetch_data_sources() -> list[dict]:
    try:
        response = requests.get(f"{BACKEND_URL}/api/data-sources", timeout=5)
        if response.status_code == 200:
            return response.json().get("data_sources", [])
    except Exception:
        pass
    return []


def fetch_query_log() -> list[dict]:
    try:
        response = requests.get(f"{BACKEND_URL}/api/query-log", timeout=5)
        if response.status_code == 200:
            return response.json().get("entries", [])
    except Exception:
        pass
    return []


def upload_file(uploaded_file) -> bool:
    try:
        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
        response = requests.post(f"{BACKEND_URL}/api/upload-data", files=files, timeout=30)
        return response.status_code == 200
    except Exception:
        return False


def delete_file(filename: str) -> bool:
    try:
        response = requests.delete(f"{BACKEND_URL}/api/data-sources/{filename}", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def ask_question(question: str, chat_history: list[dict]) -> dict | None:
    payload = {
        "question": question,
        "chat_history": [
            {"role": message["role"], "content": message["content"]}
            for message in chat_history[-6:]
        ],
    }
    try:
        response = requests.post(f"{BACKEND_URL}/api/analyze", json=payload, timeout=180)
        if response.status_code == 200:
            return response.json()
        st.error(f"Backend error {response.status_code}: {response.text}")
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to the backend. Make sure FastAPI is running on port 8000.")
    except requests.exceptions.Timeout:
        st.error("The request timed out. Try a narrower question or check the model response time.")
    except Exception as exc:
        st.error(f"Unexpected error: {exc}")
    return None


def load_preview_dataframe(file_name: str) -> pd.DataFrame | None:
    file_path = DATA_DIR / file_name
    if not file_path.exists():
        return None
    if file_path.suffix.lower() == ".csv":
        return pd.read_csv(file_path)
    if file_path.suffix.lower() in {".xlsx", ".xls"}:
        return pd.read_excel(file_path)
    return None


def render_metrics(index_ready: bool, source_count: int, memory_turns: int, queries_run: int) -> None:
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        value = "Ready ✓" if index_ready else "Offline"
        klass = "ready" if index_ready else ""
        st.markdown(
            f"<div class='metric-shell'><div class='metric-label'>Index Status</div><div class='metric-value {klass}'>{value}</div></div>",
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f"<div class='metric-shell'><div class='metric-label'>Sources Loaded</div><div class='metric-value'>{source_count}</div></div>",
            unsafe_allow_html=True,
        )
    with col3:
        st.markdown(
            f"<div class='metric-shell'><div class='metric-label'>Memory Turns</div><div class='metric-value'>{memory_turns}</div></div>",
            unsafe_allow_html=True,
        )
    with col4:
        st.markdown(
            f"<div class='metric-shell'><div class='metric-label'>Queries Run</div><div class='metric-value'>{queries_run}</div></div>",
            unsafe_allow_html=True,
        )


def render_chat_message(message: dict) -> None:
    if message["role"] == "user":
        st.markdown(
            f"""
<div class="user-bubble">
  <div class="bubble-meta">YOU · {message["time"]}</div>
  <div>{message["content"]}</div>
</div>
""",
            unsafe_allow_html=True,
        )
        return

    tool_html = "".join(
        f"<span class='tool-chip'>🔧 {tool_name}</span>" for tool_name in message.get("tools_used", [])
    )
    latency_html = ""
    if message.get("latency"):
        latency_html = f"<span class='latency-pill'>⚡ {message['latency']}s</span>"

    st.markdown(
        f"""
<div class="assistant-shell">
  <div class="assistant-badge">
    <span>ASSISTANT</span>
    <span class="assistant-time">{message["time"]}</span>
    {latency_html}
  </div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown(f"<div class='assistant-answer'>{message['content']}</div>", unsafe_allow_html=True)
    if tool_html:
        st.markdown(tool_html, unsafe_allow_html=True)


init_state()
apply_pending_input_updates()
backend_ok = check_backend()
sources = fetch_data_sources() if backend_ok else []
st.session_state.query_log_cache = fetch_query_log() if backend_ok else st.session_state.query_log_cache
query_count = len(st.session_state.query_log_cache)
memory_turns = len(st.session_state.chat_messages)

with st.sidebar:
    st.markdown("## System")
    if backend_ok:
        st.success("Backend connected")
    else:
        st.error("Backend offline")

    st.markdown("### Data Sources")
    if sources:
        for src in sources:
            col1, col2 = st.columns([5, 1])
            with col1:
                st.markdown(f"- `{src['name']}` ({src['size_kb']} KB)")
            with col2:
                if st.button("🗑️", key=f"del_{src['name']}", help="Delete data source"):
                    if delete_file(src['name']):
                        st.rerun()
                    else:
                        st.error("Delete failed")
    else:
        st.caption("No data files found.")

    uploaded = st.file_uploader("Upload CSV or Excel", type=["csv", "xlsx", "xls"])
    if uploaded:
        with st.spinner("Uploading file..."):
            if upload_file(uploaded):
                st.success(f"{uploaded.name} uploaded")
                st.rerun()
            else:
                st.error("Upload failed")

    st.markdown("### Stored Outputs")
    if st.session_state.query_log_cache:
        for entry in st.session_state.query_log_cache[:5]:
            st.markdown(f"- `{entry['timestamp'][11:19]}` {entry['question'][:52]}...")
    else:
        st.caption("No saved answers yet.")

st.markdown(
    """
<div class="hero">
  <h1 class="hero-title">Performance Review Intelligence</h1>
  <div class="hero-subtitle">AI-powered · conversational memory · CSV & Excel analysis</div>
</div>
<div class="pill-row">
  <span class="pill">✦ RAG</span>
  <span class="pill">🧠 Memory</span>
  <span class="pill">📄 PDF + CSV</span>
  <span class="pill">⚡ Gemini 2.5 Flash</span>
</div>
""",
    unsafe_allow_html=True,
)

render_metrics(backend_ok, len(sources), memory_turns, query_count)
st.markdown("<div style='height: 1.4rem;'></div>", unsafe_allow_html=True)

chat_tab, csv_tab, export_tab = st.tabs(["💬 Chat & Analysis", "📊 CSV Preview", "🗂 Export Log"])

with chat_tab:
    with st.expander("✦ Sample Questions — click to use", expanded=False):
        sample_cols = st.columns(2)
        for index, question in enumerate(SAMPLE_QUESTIONS):
            with sample_cols[index % 2]:
                if st.button(question, key=f"sample_{index}", width="stretch"):
                    st.session_state._pending_question_input = question
                    st.rerun()

    if st.session_state.chat_messages:
        for message in st.session_state.chat_messages:
            render_chat_message(message)
    else:
        st.markdown(
            """
<div class="empty-state">
  <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
  <div style="font-size: 1.35rem; color: #d8e2ff; margin-bottom: 0.5rem;">Ask a performance question</div>
  <div>Try questions about yearly trends, average ratings, strengths, improvements, goals, or employee summaries.</div>
</div>
""",
            unsafe_allow_html=True,
        )

    st.markdown("<hr>", unsafe_allow_html=True)
    question = st.text_area(
        "Ask a question",
        key="question_input",
        placeholder="e.g. Give me a full performance analysis of Sneha Gupta across all available years...",
        label_visibility="collapsed",
    )
    st.caption("Ask free-form questions. Every response is stored and visible in the export log.")

    action_col1, action_col2 = st.columns([3, 1])
    with action_col1:
        ask_clicked = st.button("Generate Analysis", width="stretch", disabled=not backend_ok)
    with action_col2:
        clear_clicked = st.button("Clear Chat", width="stretch")

    if clear_clicked:
        st.session_state.chat_messages = []
        st.session_state._clear_question_input = True
        st.rerun()

    if ask_clicked:
        trimmed_question = question.strip()
        if not trimmed_question:
            st.warning("Enter a question before running the analysis.")
        else:
            started_at = datetime.now()
            user_message = {
                "role": "user",
                "content": trimmed_question,
                "time": started_at.strftime("%H:%M:%S"),
            }
            st.session_state.chat_messages.append(user_message)

            with st.spinner("Analyzing performance data..."):
                result = ask_question(trimmed_question, st.session_state.chat_messages[:-1])

            if result:
                completed_at = datetime.now()
                latency = round((completed_at - started_at).total_seconds(), 1)
                assistant_message = {
                    "role": "assistant",
                    "content": result["answer"],
                    "time": completed_at.strftime("%H:%M:%S"),
                    "latency": latency,
                    "tools_used": result.get("tools_used", []),
                }
                st.session_state.chat_messages.append(assistant_message)
                st.session_state.query_log_cache = fetch_query_log()
                st.session_state._clear_question_input = True
                st.rerun()
            else:
                st.session_state.chat_messages.pop()

with csv_tab:
    st.markdown("### Source Preview")
    if not sources:
        st.info("Upload a CSV or Excel file to preview the source data here.")
    else:
        selected_file = st.selectbox(
            "Choose a source file",
            options=[src["name"] for src in sources],
        )
        preview_df = load_preview_dataframe(selected_file)
        if preview_df is not None:
            st.dataframe(preview_df, width="stretch", hide_index=True)
        else:
            st.warning("Preview is available for locally accessible CSV/Excel files only.")

with export_tab:
    st.markdown("### Stored Query Log")
    log_entries = st.session_state.query_log_cache
    if log_entries:
        export_df = pd.DataFrame(log_entries)
        st.dataframe(export_df, width="stretch", hide_index=True)
        st.download_button(
            label="Download query log as CSV",
            data=export_df.to_csv(index=False).encode("utf-8"),
            file_name="performance_query_log.csv",
            mime="text/csv",
            width="stretch",
        )
        for idx, entry in enumerate(log_entries[:10]):
            with st.expander(f"{entry['timestamp']} · {entry['question']}"):
                st.markdown(entry["answer"])
                if entry.get("tools_used"):
                    chips = " ".join([f"`{tool}`" for tool in entry["tools_used"]])
                    st.caption(f"Tools used: {chips}")
    else:
        st.info("No stored outputs yet. Ask a question in Chat & Analysis to build the log.")
