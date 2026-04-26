from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.chains.chat import ChatChain

router = APIRouter(prefix="/api/chat", tags=["chat"])
chat_chain = ChatChain()

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    context: Dict[str, Any]
    history: Optional[List[ChatMessage]] = []

@router.post("/")
async def chat_with_assistant(request: ChatRequest):
    try:
        # Convert Pydantic history to dict
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
        
        reply = await chat_chain.chat(
            context=request.context,
            question=request.question,
            history=history_dicts
        )
        
        return {"reply": reply}
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
