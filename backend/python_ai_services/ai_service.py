import os
import time
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv
import google.generativeai as genai


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env.local"))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

AI_PROVIDER = (os.getenv("AI_PROVIDER") or "gemini").lower()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("VITE_OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY") or os.getenv("REACT_APP_GEMINI_API_KEY")

MODELS = {
    "openrouter": {
        "default": os.getenv("OPENROUTER_DEFAULT_MODEL") or "google/gemini-2.0-flash-lite-preview-02-05:free",
        "fast": "openai/gpt-3.5-turbo",
        "powerful": "openai/gpt-4o",
        "claude": "anthropic/claude-3.5-sonnet",
        "gemini": "google/gemini-2.0-flash-lite-preview-02-05:free",
    },
    "gemini": {
        "default": "gemini-flash-latest",
        "powerful": "gemini-pro-latest",
    },
}

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _normalize_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    normalized = []
    for msg in messages:
        role = msg.get("role", "user")
        role = "assistant" if role in ("ai", "model") else role
        content = msg.get("text") or msg.get("content")
        if not content and isinstance(msg.get("parts"), list) and msg["parts"]:
            content = msg["parts"][0].get("text", "")
        normalized.append({"role": role, "content": content or ""})
    return normalized


def generate_with_openrouter(prompt: str, options: Dict[str, Any] | None = None) -> Dict[str, Any]:
    options = options or {}
    model = options.get("model") or MODELS["openrouter"]["default"]
    max_tokens = options.get("maxTokens", 4096)

    if not OPENROUTER_API_KEY:
        raise RuntimeError("OpenRouter API key not configured")

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://gyan-ai.com",
            "X-Title": "GYAN AI",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    if not response.ok:
        detail = response.json().get("error", {}).get("message", response.text)
        raise RuntimeError(f"OpenRouter Error: {detail}")

    data = response.json()
    return {
        "text": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
        "model": data.get("model"),
        "usage": data.get("usage"),
        "provider": "openrouter",
    }


def generate_with_gemini(prompt: str, options: Dict[str, Any] | None = None) -> Dict[str, Any]:
    options = options or {}
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API key not configured")

    model_name = options.get("model") or MODELS["gemini"]["default"]
    generation_config: Dict[str, Any] = {}
    if "temperature" in options:
        generation_config["temperature"] = options["temperature"]
    if "maxTokens" in options:
        generation_config["max_output_tokens"] = options["maxTokens"]
    if options.get("json"):
        generation_config["response_mime_type"] = "application/json"

    model = genai.GenerativeModel(model_name=model_name)
    response = model.generate_content(
        prompt,
        generation_config=generation_config if generation_config else None,
    )
    return {
        "text": response.text,
        "model": model_name,
        "provider": "gemini",
    }


def chat_with_openrouter(messages: List[Dict[str, Any]], options: Dict[str, Any] | None = None) -> Dict[str, Any]:
    options = options or {}
    model = options.get("model") or MODELS["openrouter"]["default"]
    max_tokens = options.get("maxTokens", 4096)

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://gyan-ai.com",
            "X-Title": "GYAN AI Chat",
        },
        json={
            "model": model,
            "messages": _normalize_messages(messages),
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    if not response.ok:
        detail = response.json().get("error", {}).get("message", response.text)
        raise RuntimeError(f"OpenRouter Chat Error: {detail}")

    data = response.json()
    return {
        "text": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
        "model": data.get("model"),
        "usage": data.get("usage"),
        "provider": "openrouter",
    }


def generate(prompt: str, options: Dict[str, Any] | None = None) -> Dict[str, Any]:
    options = options or {}
    requested_provider = (options.get("provider") or AI_PROVIDER or "gemini").lower()

    try:
        if requested_provider == "openrouter" and OPENROUTER_API_KEY:
            return generate_with_openrouter(prompt, options)
        if requested_provider == "gemini" and GEMINI_API_KEY:
            return generate_with_gemini(prompt, options)
        if OPENROUTER_API_KEY:
            return generate_with_openrouter(prompt, options)
        if GEMINI_API_KEY:
            return generate_with_gemini(prompt, options)
        raise RuntimeError("No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY")
    except Exception as error:
        primary_error = str(error)
        if requested_provider == "gemini" and ("503" in primary_error or "overloaded" in primary_error.lower()):
            time.sleep(2)
            try:
                return generate_with_gemini(prompt, options)
            except Exception:
                pass

        if requested_provider == "openrouter" and GEMINI_API_KEY:
            return generate_with_gemini(prompt, {**options, "model": MODELS["gemini"]["default"]})

        if requested_provider == "gemini" and OPENROUTER_API_KEY:
            for model in [
                "google/gemini-2.0-flash-lite-preview-02-05:free",
                "google/gemini-flash-1.5",
                "google/gemini-pro",
                "mistralai/mistral-7b-instruct:free",
                "openai/gpt-3.5-turbo",
            ]:
                try:
                    return generate_with_openrouter(prompt, {**options, "model": model})
                except Exception:
                    continue

        raise RuntimeError(f"Primary AI ({requested_provider}) failed: {primary_error}")


def chat(messages: List[Dict[str, Any]], options: Dict[str, Any] | None = None) -> Dict[str, Any]:
    options = options or {}
    preferred_provider = (options.get("provider") or AI_PROVIDER).lower()

    if preferred_provider == "openrouter" and OPENROUTER_API_KEY:
        return chat_with_openrouter(messages, options)
    if OPENROUTER_API_KEY:
        return chat_with_openrouter(messages, options)

    if GEMINI_API_KEY:
        gemini_model = genai.GenerativeModel(model_name=MODELS["gemini"]["default"])
        history = []
        for msg in messages[:-1]:
            role = "model" if msg.get("role") in ("ai", "model") else "user"
            text = msg.get("text") or msg.get("content") or ""
            history.append({"role": role, "parts": [text]})

        last_message = messages[-1] if messages else {"text": ""}
        last_text = last_message.get("text") or last_message.get("content") or ""
        chat_session = gemini_model.start_chat(history=history)
        response = chat_session.send_message(last_text)
        return {
            "text": response.text,
            "model": MODELS["gemini"]["default"],
            "provider": "gemini",
        }

    raise RuntimeError("No AI provider configured")


def get_available_models() -> List[Dict[str, Any]]:
    if not OPENROUTER_API_KEY:
        return []

    response = requests.get(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
        timeout=30,
    )
    if not response.ok:
        return []
    data = response.json().get("data", [])
    return [
        {
            "id": m.get("id"),
            "name": m.get("name"),
            "context": m.get("context_length"),
            "pricing": m.get("pricing"),
        }
        for m in data
    ]


def get_status() -> Dict[str, Any]:
    return {
        "provider": AI_PROVIDER,
        "openrouter": {
            "configured": bool(OPENROUTER_API_KEY),
            "defaultModel": MODELS["openrouter"]["default"],
        },
        "gemini": {
            "configured": bool(GEMINI_API_KEY),
            "defaultModel": MODELS["gemini"]["default"],
        },
    }
