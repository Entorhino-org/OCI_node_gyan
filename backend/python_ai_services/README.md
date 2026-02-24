# Python AI Services (Gemini + OpenRouter fallback)

This folder contains a Python conversion of backend AI services that were previously implemented in Node.js:

- `backend/ai-service.js` → `backend/python_ai_services/ai_service.py`
- `backend/sockets/GeminiSocket.js` → `backend/python_ai_services/gemini_socket_proxy.py`

## Endpoints

- `GET /health`
- `GET /status`
- `POST /generate`
- `POST /chat`
- `WS /gemini-stream`

## Run locally

```bash
cd backend/python_ai_services
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5001 --reload
```

The service loads `.env.local` and `.env` from the project root and expects:

- `GEMINI_API_KEY` (or `GEMINI_AUDIO_API_KEY` for websocket audio)
- Optional: `OPENROUTER_API_KEY`
