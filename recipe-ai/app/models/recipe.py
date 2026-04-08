from datetime import datetime

from pydantic import BaseModel, Field


class RecipeCreate(BaseModel):
    """Schema for LLM output / recipe creation."""
    title: str = Field(description="Recipe title")
    ingredients: list[str] = Field(description="List of ingredients with quantities, e.g. '2 cups flour'")
    steps: list[str] = Field(description="Ordered cooking steps")
    tags: list[str] = Field(description="Meal type tags: breakfast, lunch, dinner, and/or snacks")


class Recipe(RecipeCreate):
    """Full recipe with id and timestamp."""
    id: str
    created_at: datetime

