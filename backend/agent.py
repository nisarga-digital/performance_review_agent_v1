"""
LangChain Agent orchestration for the Performance Review Assistant.
Compatible with the installed LangChain create_agent API.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from dotenv import load_dotenv

# Import your existing tools list
from backend.tools.data_tools import TOOLS

load_dotenv()

SYSTEM_PROMPT = """You are a highly specialized Performance Review Assistant Agent.

Your primary responsibility is to answer performance-related questions and generate structured, data-driven analyses using employee data retrieved from CSV and Excel files via tools.

OPERATIONAL PROTOCOL:
1. TOOL USAGE: You MUST call at least one tool (Excel_Search or CSV_Search) before generating any response.
2. SOURCE GROUNDING: Base your answer only on information returned by the tools. Do not invent facts, years, ratings, projects, or trends.
3. ANALYSIS STYLE: When asked analytical questions, explain your reasoning clearly, show extracted evidence, and perform any calculations step by step.
4. RESPONSE FORMAT:
   - Start with a direct answer or short summary.
   - Use markdown headings and bullets where helpful.
   - When useful, include a compact table.
   - End with a short takeaway or recommendation.
5. MISSING DATA: If the available data is incomplete, say exactly what is missing.
6. MEMORY AWARENESS: Treat each user question independently unless prior chat context is explicitly provided.
"""

def build_agent():
    """Construct and return the configured LangChain agent."""
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1,
    )

    agent_executor = create_agent(
        model=model,
        tools=TOOLS,
        system_prompt=SYSTEM_PROMPT,
        debug=True,
        name="performance_review_agent",
    )

    return agent_executor

# Singleton agent instance
_agent = None

def get_agent():
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent
