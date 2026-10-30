import os 
import openai

client = openai.OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1")

def ask_groq(message:str,system_prompt:str|None=None,temperature:float=0.7)->str:
    messages = []
    if system_prompt:
        messages.append({"role":"system","content":system_prompt})
    messages.append({"role":"user","content":message})
    response=client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=messages,
        temperature=temperature,

    )
    #return responses.output_text
    return response.choices[0].message.content

        