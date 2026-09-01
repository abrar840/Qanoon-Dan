from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes.chat import router as chat_router

#from appp.routes."file_name" import router as file_name_router


app = FastAPI()
app.include_router(chat_router)
#following same way we need to register all routes here
@app.get("/health")
def health_check():
    return {"status" : "ok"}