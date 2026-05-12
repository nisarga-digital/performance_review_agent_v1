# Quick Integration Guide

## How to Use the Workflow Engine in Your Agent

### 1. Initialize the Engine

```python
from engine.workflow_engine import load_workflow_config

# At app startup (e.g., in main.py or agent.py)
engine = load_workflow_config("backend/workflows/review_workflows.json")
```

### 2. Start a Review Session

```python
# When user starts a review
session = engine.session_manager.create_session(
    employee_id="EMP001",
    role="employee"  # or "manager"
)
engine.save_session(session)

# Get first question
current_q = engine.get_current_question(session)
question_text = current_q["question"]
```

### 3. Handle User Responses

```python
# User provides an answer
user_answer = "My answer here"

# The engine validates AND progresses the workflow
is_valid, message, updated_session = engine.process_answer(session, user_answer)

if not is_valid:
    # Invalid - ask user to revise
    print(f"Please revise: {message}")
else:
    # Valid - engine automatically moved to next step
    engine.save_session(updated_session)
    
    if engine.is_workflow_complete(updated_session):
        print("Review complete!")
        summary = engine.get_workflow_summary(updated_session)
    else:
        next_q = engine.get_current_question(updated_session)
        print(f"Next question: {next_q['question']}")
```

### 4. Handle Navigation

```python
# User wants to go back
if engine.can_go_back(session):
    success, message, updated_session = engine.go_to_previous_step(session)
    engine.save_session(updated_session)
    prev_q = engine.get_current_question(updated_session)
```

## Integration Checklist

- [ ] Copy `engine/`, `prompts/`, `workflows/` directories to your backend
- [ ] Update `agent.py` to initialize the engine
- [ ] Use workflow engine instead of prompt-only orchestration
- [ ] Update system prompt to use `EMPLOYEE_REVIEW_SYSTEM_PROMPT` or `MANAGER_REVIEW_SYSTEM_PROMPT`
- [ ] Add workflow API routes (use `routers/workflow_integration.py` as template)
- [ ] Update frontend to call workflow endpoints
- [ ] Test with `example_usage.py`

## Common Patterns

### Pattern 1: Workflow in a Loop

```python
def run_review_workflow(employee_id):
    # Create session
    session = engine.session_manager.create_session(employee_id)
    engine.save_session(session)
    
    while not engine.is_workflow_complete(session):
        # Get current question
        current_q = engine.get_current_question(session)
        print(current_q["question"])
        
        # Get user input (from API, CLI, etc.)
        answer = get_user_input()
        
        # Process (validates + progresses)
        is_valid, msg, session = engine.process_answer(session, answer)
        
        if not is_valid:
            print(f"Invalid: {msg}")
            continue
        
        engine.save_session(session)
    
    # Generate report
    summary = engine.get_workflow_summary(session)
    return summary
```

### Pattern 2: Resume Previous Session

```python
def resume_review(session_id):
    # Load existing session
    session = engine.load_session(session_id)
    
    if not session:
        return "Session not found"
    
    current_q = engine.get_current_question(session)
    progress = engine.get_progress(session)
    
    print(f"Resuming at step {progress['current_step']} of {progress['total_steps']}")
    print(current_q["question"])
    
    # Continue from where they left off
    answer = get_user_input()
    is_valid, msg, session = engine.process_answer(session, answer)
    engine.save_session(session)
```

### Pattern 3: Batch Processing Multiple Employees

```python
def process_all_employees(employee_ids):
    results = []
    
    for emp_id in employee_ids:
        session = engine.session_manager.create_session(emp_id)
        
        # Auto-fill answers (if coming from pre-filled data)
        answers = load_pre_filled_answers(emp_id)
        
        for answer_data in answers:
            is_valid, msg, session = engine.process_answer(
                session, 
                answer_data
            )
            if not is_valid:
                print(f"Validation error for {emp_id}: {msg}")
                break
        
        engine.save_session(session)
        results.append(engine.get_workflow_summary(session))
    
    return results
```

## Key Differences from Prompt-Only Approach

### Before (Problematic)

```python
# Everything in prompt - hard to control
response = llm.chat([
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_input}
])
# LLM might lose track of steps, skip validation, etc.
```

### After (Robust)

```python
# Clear separation of concerns
current_q = engine.get_current_question(session)  # Step control
is_valid, msg, session = engine.process_answer(session, user_input)  # Validation
# LLM only handles conversation tone and clarification
```

## Testing Your Integration

```python
from engine.workflow_engine import ReviewFlowEngine

def test_workflow():
    # Create engine
    engine = load_workflow_config("backend/workflows/review_workflows.json")
    
    # Test step 1
    session = engine.session_manager.create_session("TEST001")
    assert session["current_step"] == 0
    assert len(engine.steps) > 0
    
    # Test validation
    is_valid, _ = engine.validate_answer("6", engine.steps[0])
    assert not is_valid  # Should fail (max is 5)
    
    is_valid, _ = engine.validate_answer("4", engine.steps[0])
    assert is_valid  # Should pass
    
    # Test answer processing
    is_valid, msg, session = engine.process_answer(session, "4")
    assert is_valid
    assert session["current_step"] == 1
    assert session["answers"]["self_rating"] == "4"
    
    print("All tests passed!")
```

## Troubleshooting

**Problem**: Session not found  
**Solution**: Check session directory path, ensure `save_session()` was called

**Problem**: Questions out of order  
**Solution**: Check `order` field in workflow JSON, reload config

**Problem**: Validation always passes/fails  
**Solution**: Verify step `type` and validation rules (min/max/length) in config

**Problem**: LLM making workflow decisions  
**Solution**: Update system prompt to clarify LLM's role - see `prompts/system_prompts.py`

## Next Steps

1. **Integrate into agent.py**: Use engine instead of manual orchestration
2. **Add to API routes**: Create endpoints that call engine methods
3. **Update frontend**: Have frontend call workflow endpoints
4. **Add logging**: Log all answers and validation for analytics
5. **Add reporting**: Generate PDF/email reports from summaries
