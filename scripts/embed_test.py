from dotenv import load_dotenv
load_dotenv()

import os
from google import genai     
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])   # connect to Gemini with your key
res = client.models.embed_content(                            # ask for embeddings
    model="gemini-embedding-001",                             # the embedding model (not a chat model)
    contents=["Whoever commits qatl-e-amd shall be punished"], # a LIST of texts: one or many
    config=types.EmbedContentConfig(output_dimensionality=768), # ask for 768 numbers per text
)
print(len(res.embeddings[0].values)) 