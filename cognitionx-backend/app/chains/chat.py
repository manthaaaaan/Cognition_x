from pydantic import BaseModel
from typing import List, Optional
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

class ChatChain:
    def __init__(self):
        # We use the same Vertex AI configuration for the chat assistant
        self.llm = ChatVertexAI(
            model_name="gemma2-9b-it",
            temperature=0.3 # Slightly higher temperature for conversational tone
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", 
             "You are a highly capable and empathetic Medical Assistant AI. "
             "Your primary goal is to answer questions about the patient's condition, dietary requirements, "
             "medication safety, and timings based STRICTLY on the provided clinical SOAP note and diagnosis context.\n\n"
             "PATIENT CONTEXT (SOAP NOTE):\n{context}\n\n"
             "Guidelines:\n"
             "1. Always remain professional but empathetic.\n"
             "2. Base your dietary and safety advice on standard medical best practices related to the diagnosis and medications mentioned.\n"
             "3. If a user asks about medicine timings, reference the 'plan' section of the context.\n"
             "4. Do not contradict the doctor's plan. Support it."
            ),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{question}")
        ])
        
        self.chain = self.prompt | self.llm

    async def chat(self, context: dict, question: str, history: List[dict] = None) -> str:
        formatted_history = []
        if history:
            for msg in history:
                if msg.get("role") == "user":
                    formatted_history.append(HumanMessage(content=msg.get("content")))
                elif msg.get("role") == "assistant":
                    formatted_history.append(AIMessage(content=msg.get("content")))
                    
        # Ensure context is a formatted string
        import json
        context_str = json.dumps(context, indent=2) if isinstance(context, dict) else str(context)
        
        response = await self.chain.ainvoke({
            "context": context_str,
            "history": formatted_history,
            "question": question
        })
        
        return response.content
