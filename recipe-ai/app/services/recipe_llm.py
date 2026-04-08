import json
import os
import re

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from app.models import RecipeCreate

MAX_TRANSCRIPT_LENGTH = 5000

# Reused across requests (avoids recreating on every call)
_llm = None
_prompt = None


def _get_llm():
    global _llm
    if _llm is None:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        model = os.getenv("OLLAMA_MODEL", "llama3.2")
        _llm = ChatOllama(base_url=base_url, model=model, temperature=0.2)
    return _llm


FORMAT_INSTRUCTIONS = """Output ONLY valid JSON with these keys:
- title (string)
- ingredients (array of strings, e.g. ["2 cups flour", "1 tbsp butter"])
- steps (array of strings, ordered)
- tags (array of: breakfast, lunch, dinner, snacks)

No markdown, no extra text. Only the JSON object."""


def _get_prompt():
    global _prompt
    if _prompt is None:
        _prompt = ChatPromptTemplate.from_messages([
            ("system", "You extract structured recipes. Reply with JSON only, no markdown or extra text."),
            ("human", """Convert this into a recipe:
- title: clear recipe name
- ingredients: each with quantity (e.g. "2 cups flour")
- steps: ordered cooking instructions
- tags: breakfast, lunch, dinner, snacks (one or more)

Text:
{transcript}

{format_instructions}"""),
        ])
    return _prompt


def _extract_json(text: str) -> str:
    """Extract JSON from LLM output, handling markdown code blocks."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def transcript_to_recipe(transcript: str) -> RecipeCreate:
    """Use Ollama to convert a voice transcript into a structured recipe."""
    if len(transcript) > MAX_TRANSCRIPT_LENGTH:
        raise ValueError(f"Transcript too long (max {MAX_TRANSCRIPT_LENGTH} characters)")
    llm = _get_llm()
    prompt = _get_prompt()
    chain = prompt | llm
    response = chain.invoke({"transcript": transcript, "format_instructions": FORMAT_INSTRUCTIONS})
    raw = response.content if hasattr(response, "content") else str(response)
    json_str = _extract_json(raw)
    data = json.loads(json_str)
    recipe = RecipeCreate(**data)
    return recipe
