from langchain.agents.middleware import AgentMiddleware

class ForceToolMiddleware(AgentMiddleware):
    def before_model(self, state, **kwargs):
        messages = state.get("messages", [])
        if not messages:
            return state
            
        last_message = messages[-1]
        
        # Handle both dict and object representations
        if isinstance(last_message, dict):
            content = last_message.get("content", "")
            if isinstance(content, str) and "sneha" in content.lower():
                last_message["content"] = content + "\n\nYou MUST call a tool first."
        else:
            content = getattr(last_message, "content", "")
            if isinstance(content, str) and "sneha" in content.lower():
                last_message.content = content + "\n\nYou MUST call a tool first."

        return state