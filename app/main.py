from fastapi import FastApi 
from appp.routes."file_name" import router as file_name_router


app = FastApi()
app.include_router(chat_router)
#following same way we need to register all routes here
@app.get("/health")
def health_check():
    return {"status" : "ok"}