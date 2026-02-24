import asyncio
import json
import os
from urllib.parse import parse_qs, urlparse

import websockets
from fastapi import WebSocket


MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
HOST = "generativelanguage.googleapis.com"


def build_setup_message(grade: str, subject: str) -> str:
    system_instruction = (
        f"You are a friendly AI tutor for a {grade} student studying {subject}. "
        "Engage the student in conversation to check their understanding. "
        "IMPORTANT: If you detect the student clearly misunderstands a concept, or is struggling, "
        "or at the END of the conversation, you MUST call the 'report_gaps' tool with a summary "
        "of the gaps. Make the feedback student friendly for lower classes and deeper for upper classes."
    )

    payload = {
        "setup": {
            "model": f"models/{MODEL}",
            "generation_config": {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {"prebuilt_voice_config": {"voice_name": "Puck"}}
                },
            },
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "tools": [
                {
                    "function_declarations": [
                        {
                            "name": "report_gaps",
                            "description": "Report detected learning gaps to the system.",
                            "parameters": {
                                "type": "OBJECT",
                                "properties": {
                                    "gaps": {
                                        "type": "ARRAY",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "topic": {"type": "STRING"},
                                                "gapType": {
                                                    "type": "STRING",
                                                    "enum": ["Conceptual", "Factual", "Procedural"],
                                                },
                                                "reason": {"type": "STRING"},
                                                "recommendation": {"type": "STRING"},
                                            },
                                        },
                                    }
                                },
                                "required": ["gaps"],
                            },
                        }
                    ]
                }
            ],
        }
    }
    return json.dumps(payload)


async def proxy_gemini_stream(websocket: WebSocket):
    api_key = os.getenv("GEMINI_AUDIO_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        await websocket.close(code=1011, reason="Missing GEMINI_API_KEY")
        return

    await websocket.accept()

    parsed = urlparse(str(websocket.url))
    query = parse_qs(parsed.query)
    grade = query.get("grade", ["Grade 10"])[0]
    subject = query.get("subject", ["General Knowledge"])[0]

    uri = (
        "wss://"
        f"{HOST}/ws/google.ai.generativelanguage.v1beta."
        f"GenerativeService.BidiGenerateContent?key={api_key}"
    )

    async with websockets.connect(uri, max_size=None) as upstream:
        await upstream.send(build_setup_message(grade, subject))

        async def client_to_upstream():
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                payload = message.get("bytes") or message.get("text")
                if payload is not None:
                    await upstream.send(payload)

        async def upstream_to_client():
            async for message in upstream:
                if isinstance(message, bytes):
                    await websocket.send_bytes(message)
                else:
                    await websocket.send_text(message)

        done, pending = await asyncio.wait(
            [asyncio.create_task(client_to_upstream()), asyncio.create_task(upstream_to_client())],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in done:
            _ = task.exception()
