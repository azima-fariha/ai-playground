import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.models import Recipe, RecipeCreate

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"
RECIPES_FILE = DATA_DIR / "recipes.json"


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_recipes() -> list[dict]:
    _ensure_data_dir()
    if not RECIPES_FILE.exists():
        return []
    with open(RECIPES_FILE) as f:
        return json.load(f)


def _save_recipes(recipes: list[dict]):
    _ensure_data_dir()
    with open(RECIPES_FILE, "w") as f:
        json.dump(recipes, f, indent=2)


def list_recipes() -> list[Recipe]:
    data = _load_recipes()
    return [Recipe(**r) for r in data]


def add_recipe(recipe: RecipeCreate) -> Recipe:
    full = Recipe(
        id=str(uuid.uuid4()),
        created_at=datetime.utcnow(),
        **recipe.model_dump(),
    )
    data = _load_recipes()
    data.append(full.model_dump(mode="json"))
    _save_recipes(data)
    return full


def get_recipe(recipe_id: str) -> Optional[Recipe]:
    for r in list_recipes():
        if r.id == recipe_id:
            return r
    return None
