# Personal Recipe Website

A website that converts voice input into structured recipes (ingredients, steps, tags) using a local LLM (Ollama) and stores them.

## Prerequisites

1. **Ollama** – Install from [ollama.ai](https://ollama.ai), then run and pull a model:
   ```bash
   ollama pull llama3.2
   ```
   Other models: `mistral`, `phi`, `qwen2:7b`, etc.

## Setup

From the `recipe-ai` directory:

```bash
cd recipe-ai
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional: copy `.env.example` to `.env` and adjust:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## Run

```bash
uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser (Chrome or Edge recommended for Web Speech API).

## Use

1. Click **Start voice** and allow microphone access.
2. Speak your recipe (ingredients, steps, etc.).
3. Click **Stop** when done.
4. Click **Create recipe** to send the transcript to the LLM. A structured recipe (title, ingredients, steps, tags like breakfast/lunch/dinner/snacks) is created and saved.
5. Recipes appear in the list below and persist in `data/recipes.json`.
