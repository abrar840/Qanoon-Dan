from pydantic import BaseModel, Field
from typing import Literal, Optional


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

    provider: Literal["gemini", "groq"] = "groq"

    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Temperature for response generation",
    )

    stream: bool = Field(
        default=False,
        description="Whether to stream the response",
    )

    system_prompt: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Prompt to guide the model",
    )


class ChatResponse(BaseModel):
   reply:str
   model:str
   provider:Optional[str]=None 
   
   
class RetrievedChunk(BaseModel):
    ref: str
    source_name: str
    content: str
    distance: float      # cosine distance from the SQL function, smaller = closer
