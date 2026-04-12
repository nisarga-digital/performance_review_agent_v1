"""
LangGraph Agent orchestration for the Performance Review Assistant.
"""

import os
import sqlite3
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from langgraph.checkpoint.sqlite import SqliteSaver
from dotenv import load_dotenv
from middleware.force_tool_middleware import ForceToolMiddleware

# Import your existing tools list
from tools.data_tools import TOOLS

load_dotenv()

SYSTEM_PROMPT = """You are a highly specialized Performance Review Assistant Agent.

Your primary responsibility is to answer performance-related questions and generate structured, data-driven analyses using employee data retrieved from CSV and Excel files via tools.

OPERATIONAL PROTOCOL:
1. TOOL USAGE: You MUST call at least one tool (Excel_Search or CSV_Search) before generating any response.
2. SOURCE GROUNDING: Base your answer only on information returned by the tools. Do not invent facts, years, ratings, projects, or trends.
3. MISSING DATA: If available data is missing required sections, say exactly what is missing.
4. MEMORY AWARENESS: Treat each user question independently unless prior chat context is explicitly provided.

*** IMPORTANT: WHEN ASKED TO GENERATE A PERFORMANCE REVIEW ***
If the user asks you to write, generate, or create a performance review, you MUST strictly follow these rules:
- Tone: Professional manager tone. Formal, constructive, realistic (like a real appraisal document). 
- Do NOT just summarize or list data. Combine inputs (history, ratings, self-review, manager feedback, projects) into a cohesive single narrative.
- Provide a balanced evaluation (positive + constructive feedback).
- Format: Paragraph-based (NO tables, NO raw data dumps).
- Structure: You MUST use exactly these clear headers:
  1. Overall Performance Summary
  2. Strengths and Contributions
  3. Areas for Improvement
  4. Growth and Progression
  5. Final Evaluation

*** WHEN ASKED ANALYTICAL/OTHER QUESTIONS ***
- Stay analytical. Use markdown headings, bullets, and compact tables where helpful.
- Explain reasoning clearly, show extracted evidence, and perform calculations step by step.
"""

# Setup SqliteSaver for persistent chat memory
DB_PATH = os.path.join(os.path.dirname(__file__), "memory.sqlite")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
memory = SqliteSaver(conn)

def build_agent():
    """Construct and return the configured LangGraph agent."""

    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1,
    )

    agent_executor = create_agent(
    model=model,
    tools=TOOLS,
    system_prompt=SYSTEM_PROMPT,
    middleware=[ForceToolMiddleware()],  # noqa: F821
    checkpointer=memory,   # ✅ still works
    debug=True,            # 🔥 VERY IMPORTANT (tool tracing)
    )

    return agent_executor

# Singleton agent instance
_agent = None

def get_agent():
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent
