import streamlit as st
import uuid
import sys
import os

# Ensure the root project directory is discoverable so 'backend' module imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend.agent import get_agent, DB_PATH
from langchain_core.messages import AIMessageChunk, ToolMessage

st.set_page_config(page_title="Performance Review AI", layout="wide", page_icon="🤖")

st.markdown("""
<style>
    .stChatFloatingInputContainer { bottom: 0px; }
</style>
""", unsafe_allow_html=True)

st.title("🤖 Performance Review Assistant")
st.caption("Ask questions about employee performance, find trends, or review individual goals.")

# Sidebar
with st.sidebar:
    st.header("Session & Memory")
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())
    
    st.write(f"**Session ID:** `{st.session_state.session_id}`")
    
    st.write("LangGraph's `SqliteSaver` persists this chat history. Even if you restart the server, the agent remembers this session!")
    
    st.divider()
    if st.button("🧹 Clear Chat History & Start Over"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.messages = []
        st.rerun()

if "messages" not in st.session_state:
    st.session_state.messages = []

# Re-render history
for msg in st.session_state.messages:
    if msg["role"] == "user":
        with st.chat_message("user"):
            st.write(msg["content"])
    elif msg["role"] == "assistant":
        with st.chat_message("assistant"):
            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    with st.status(f"✅ Tool Complete: {tc['name']}", state="complete"):
                        st.code(tc.get("result", ""), language="text")
            if msg["content"]:
                st.markdown(msg["content"])

prompt = st.chat_input("Ask a performance-related question...")
if prompt:
    # Append to UI list
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    with st.chat_message("assistant"):
        agent = get_agent()
        config = {"configurable": {"thread_id": st.session_state.session_id}}
        
        message_placeholder = st.empty()
        full_response = ""
        current_tool_status = None
        tool_calls_info = []

        try:
            # LangGraph stream_mode="messages" yields (MessageChunk, Metadata)
            for chunk, metadata in agent.stream(
                {"messages": [("user", prompt)]}, 
                config=config, 
                stream_mode="messages"
            ):
                # 1. Catch AI Token Stream & Tool Triggers
                if isinstance(chunk, AIMessageChunk):
                    # Check if the AI just triggered a tool
                    if chunk.tool_call_chunks:
                        for tc in chunk.tool_call_chunks:
                            name = tc.get("name")
                            if name:
                                current_tool_status = st.status(f"🛠️ Executing Tool: {name}...", state="running")
                                tool_calls_info.append({"name": name, "result": ""})
                    
                    if chunk.content:
                        full_response += chunk.content
                        message_placeholder.markdown(full_response + "▌")
                        
                # 2. Catch Tool Result Stream
                elif isinstance(chunk, ToolMessage):
                    if current_tool_status:
                        # Displaying first 1500 chars to avoid UI lag for huge logs
                        display_text = chunk.content[:1500] + ("..." if len(chunk.content) > 1500 else "")
                        current_tool_status.code(display_text, language="text")
                        current_tool_status.update(label=f"✅ Tool Complete: {chunk.name}", state="complete")
                        if tool_calls_info:
                            tool_calls_info[-1]["result"] = display_text
                        current_tool_status = None

            message_placeholder.markdown(full_response)
            
            # Save for UI persistence across rerenders
            st.session_state.messages.append({
                "role": "assistant",
                "content": full_response,
                "tool_calls": tool_calls_info
            })
            
        except Exception as e:
            st.error(f"Error thinking: {str(e)}")
