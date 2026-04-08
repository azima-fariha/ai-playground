import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import logging

from app.models import Recipe, RecipeCreate
from app.storage import init_db, list_recipes, add_recipe, get_recipe, update_recipe, delete_recipe
from app.services import transcript_to_recipe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory containing this file (app/main.py) -> project root is parent of "app"
ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Personal Recipe Website", lifespan=lifespan)


@app.get("/health")
def health():
    """Health check for deployments."""
    return {"status": "ok"}



class VoiceBody(BaseModel):
    transcript: str


@app.post("/api/recipes/from-voice")
async def api_recipes_from_voice(body: VoiceBody) -> Recipe:
    """Convert voice transcript to structured recipe via Ollama and save."""
    logger.info("Received transcript.")  # Log first 100 chars
    transcript = body.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")
    try:
        recipe_create = await asyncio.to_thread(transcript_to_recipe, transcript)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
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


@app.put("/api/recipes/{recipe_id}")
def api_recipe_update(recipe_id: str, body: RecipeCreate) -> Recipe:
    """Update a recipe."""
    recipe = update_recipe(recipe_id, body)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@app.delete("/api/recipes/{recipe_id}")
def api_recipe_delete(recipe_id: str):
    """Delete a recipe."""
    if not delete_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"deleted": True}


# Serve static files: index.html at /, assets from /static
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")
