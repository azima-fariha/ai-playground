import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.models import Recipe, RecipeCreate

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "recipes.db"


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_connection():
    _ensure_data_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Run once at startup. Creates table and index."""
    conn = _get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                ingredients TEXT NOT NULL,
                steps TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC)")
        conn.commit()
    finally:
        conn.close()


def _row_to_recipe(row: sqlite3.Row) -> Recipe:
    return Recipe(
        id=row["id"],
        title=row["title"],
        ingredients=json.loads(row["ingredients"]),
        steps=json.loads(row["steps"]),
        tags=json.loads(row["tags"]),
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def list_recipes() -> list[Recipe]:
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "SELECT id, title, ingredients, steps, tags, created_at FROM recipes ORDER BY created_at DESC"
        )
        return [_row_to_recipe(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def add_recipe(recipe: RecipeCreate) -> Recipe:
    full = Recipe(
        id=str(uuid.uuid4()),
        created_at=datetime.utcnow(),
        **recipe.model_dump(),
    )
    conn = _get_connection()
    try:
        conn.execute(
            "INSERT INTO recipes (id, title, ingredients, steps, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                full.id,
                full.title,
                json.dumps(full.ingredients),
                json.dumps(full.steps),
                json.dumps(full.tags),
                full.created_at.isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return full


def get_recipe(recipe_id: str) -> Optional[Recipe]:
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "SELECT id, title, ingredients, steps, tags, created_at FROM recipes WHERE id = ?",
            (recipe_id,),
        )
        row = cursor.fetchone()
        return _row_to_recipe(row) if row else None
    finally:
        conn.close()


def update_recipe(recipe_id: str, recipe: RecipeCreate) -> Optional[Recipe]:
    """Update a recipe. Returns updated recipe or None if not found."""
    existing = get_recipe(recipe_id)
    if not existing:
        return None
    conn = _get_connection()
    try:
        conn.execute(
            "UPDATE recipes SET title = ?, ingredients = ?, steps = ?, tags = ? WHERE id = ?",
            (
                recipe.title,
                json.dumps(recipe.ingredients),
                json.dumps(recipe.steps),
                json.dumps(recipe.tags),
                recipe_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return get_recipe(recipe_id)


def delete_recipe(recipe_id: str) -> bool:
    """Delete a recipe. Returns True if deleted, False if not found."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
