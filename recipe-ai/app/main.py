from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import logging

from app.models import Recipe
from app.storage import list_recipes, add_recipe, get_recipe
from app.services import transcript_to_recipe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory containing this file (app/main.py) -> project root is parent of "app"
APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
STATIC_DIR = ROOT_DIR / "static"

app = FastAPI(title="Personal Recipe Website")


class VoiceBody(BaseModel):
    transcript: str


@app.post("/api/voice")
def api_voice(body: VoiceBody):
    """Receive voice transcript from frontend and echo it back."""
    logger.info("Received transcript: %s", body.transcript[:100] + "..." if len(body.transcript) > 100 else body.transcript)
    return {"received": True, "transcript": body.transcript}


@app.post("/api/recipes/from-voice")
def api_recipes_from_voice(body: VoiceBody) -> Recipe:
    """Convert voice transcript to structured recipe via Ollama and save."""
    transcript = body.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")
    try:
        recipe_create = transcript_to_recipe(transcript)
    except Exception as e:
        logger.exception("LLM failed to parse recipe")
        raise HTTPException(status_code=500, detail=f"Failed to parse recipe: {e}") from e
    recipe = add_recipe(recipe_create)
    return recipe


@app.get("/api/recipes")
def api_recipes_list() -> list[Recipe]:
    """List all saved recipes."""
    return list_recipes()


@app.get("/api/recipes/{recipe_id}")
def api_recipe_get(recipe_id: str) -> Recipe:
    """Get a single recipe by id."""
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


# Serve static files: index.html at /, assets from /static
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")
