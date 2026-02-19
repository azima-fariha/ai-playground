# Personal Recipe Website (Phased)

## Overview

A personal recipe **website**: **Phase 1** captures voice input and sends it to a Python backend (echo). **Phase 2** adds LLM-based recipe structuring and storage.

---

## Phase 1: Voice input → Python backend (echo)

**Goal:** Website captures voice, sends transcript to Python backend; backend receives and echoes (or logs) it.

### 1.1 Backend (Python)

- **Stack:** FastAPI, uvicorn.
- **Project layout (minimal):**
  ```
  recipe-ai/
  ├── requirements.txt   # fastapi, uvicorn
  ├── app/
  │   ├── __init__.py
  │   └── main.py        # FastAPI app, one route
  ```
- **Endpoint:** `POST /api/voice`  
  - Body: `{ "transcript": "string" }`  
  - Response: `{ "received": true, "transcript": "<echo>" }` (and optionally log transcript server-side).

### 1.2 Frontend (website)

- **Served by:** FastAPI static files (e.g. mount a `static/` folder, serve `index.html` at `/`).
- **Static files:**
  - `static/index.html` – one page with a “Start voice” / “Stop” button and an area to show status and transcript.
  - `static/app.js` – use Web Speech API (`SpeechRecognition`) to capture voice → get final transcript → `fetch("POST", "/api/voice", { transcript })` → show echoed response (and/or show transcript).
  - `static/styles.css` – basic layout and styling.

### 1.3 Flow

1. User clicks “Start voice” → browser starts listening (Web Speech API).
2. User speaks → browser produces transcript.
3. User clicks “Stop” (or recording stops) → frontend sends `{ "transcript": "..." }` to `POST /api/voice`.
4. Python backend receives, logs (optional), returns `{ "received": true, "transcript": "..." }`.
5. Frontend displays the echoed transcript (and/or “Received” message).

### 1.4 Deliverables (Phase 1)

- FastAPI app with `POST /api/voice` and static file serving.
- Single-page UI with voice capture and “send to backend.”
- Backend echoes (and optionally logs) the transcript.
- README: how to run (`uvicorn app.main:app --reload`) and use.

---

## Phase 2: Recipe structuring + storage

**Goal:** Same voice flow, but backend uses an LLM to turn the transcript into a structured recipe (title, ingredients, steps, tags) and stores it.

### 2.1 Recipe model (Pydantic)

- `title`, `ingredients: list[str]`, `steps: list[str]`, `tags: list[str]` (e.g. breakfast, lunch, dinner, snacks).
- Optional: `id`, `created_at`.

### 2.2 LLM service (LangChain + open-source LLM)

- **Use an open-source LLM** (no paid API). Default: **Ollama** (run models like Llama 3, Mistral, Phi locally). LangChain’s `ChatOllama` talks to a local Ollama server.
- Input: transcript string from Phase 1.
- Prompt: extract recipe title, ingredients (with quantities), ordered cooking steps, and tags (breakfast/lunch/dinner/snacks).
- Output: structured recipe (Pydantic) via LangChain structured output (e.g. `with_structured_output(RecipeModel)`).
- Config: `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (e.g. `llama3.2`, `mistral`, `phi`). **Alternatives:** Hugging Face (`HuggingFaceHub`), or any OpenAI-compatible local server (LM Studio, vLLM) by setting `base_url` and using `ChatOpenAI`—no API key needed for local.

### 2.3 Storage

- Simple persistence: e.g. JSON file or SQLite.
- Functions: `list_recipes()`, `add_recipe(recipe)` (and optionally `get_recipe(id)`).

### 2.4 API changes

- `POST /api/recipes/from-voice`: body `{ "transcript": "..." }` → call LLM → save recipe → return new recipe.
- `GET /api/recipes`: return list of saved recipes (optional: `GET /api/recipes/{id}`).

### 2.5 Frontend updates

- After “Stop” / send: call `POST /api/recipes/from-voice` instead of (or in addition to) `POST /api/voice`.
- Display the returned recipe (title, ingredients, steps, tags) and/or append to a recipe list on the page.

### 2.6 Config and docs

- `.env.example`: `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.2` (or another Ollama model name). Optional storage path or DB path.
- README: add Phase 2 setup (install and run Ollama, pull a model, set env, run app, voice → recipe flow).

---

## Tech summary

| Layer        | Phase 1              | Phase 2                                  |
|-------------|----------------------|------------------------------------------|
| Backend     | FastAPI + echo       | + LangChain + open-source LLM + storage  |
| LLM         | —                    | Ollama (local; e.g. Llama, Mistral, Phi) |
| Frontend    | HTML/JS + Web Speech | + recipe display / list                  |
| Storage     | None                 | JSON file or SQLite                      |
| Env         | None                 | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`        |

---

## Implementation order

1. **Phase 1:** Backend scaffold → `POST /api/voice` → static frontend → voice capture → send transcript → echo back.
2. **Phase 2:** Recipe model → LLM service → storage → new routes → frontend recipe UI.
