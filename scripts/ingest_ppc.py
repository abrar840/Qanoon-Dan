from pydantic import BaseModel, Failed
from typing import Literal, Optional


class ChatRequest(BaseModel):
    message:str=Field(...,min_length=1,max_length=2000)
    provider:Literal["gemini","groq"]="groq"
    temprature:float = Field(default=0.7, ge=0.0, le=1.0, description="Temperature for response generation")
    stream:bool = Field(default=False, description="Whether to stream the response")
    system_prompt: Optional[str] = Field(
        default=None,
        max_length=2000,
        descritpion="Optional system prompt to guide model"
    )





class ChatResponse(BaseModel):
    reply:str
    provider:str
    model: Optional[str] = None
    