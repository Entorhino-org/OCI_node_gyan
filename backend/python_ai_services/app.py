from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel, Field

from ai_service import chat, generate, get_status
from gemini_socket_proxy import proxy_gemini_stream


app = FastAPI(title="GYAN Backend AI Services (Python)", version="1.0.0")


class GenerateRequest(BaseModel):
    prompt: str
    options: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    options: Dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health():
    return {"status": "ok", "service": "python-ai-services"}


@app.get("/status")
def status():
    return get_status()


@app.post("/generate")
def generate_endpoint(body: GenerateRequest):
    try:
        return generate(body.prompt, body.options)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat")
def chat_endpoint(body: ChatRequest):
    try:
        return chat(body.messages, body.options)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.websocket("/gemini-stream")
async def gemini_stream(websocket: WebSocket):
    await proxy_gemini_stream(websocket)
