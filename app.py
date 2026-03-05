from fastapi import FastAPI
import ollama

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Healthcare AI Chatbot Running"}

@app.post("/chat")
def chat(message: str):
    response = ollama.chat(
        model='llama3',
        messages=[
            {"role": "user", "content": message}
        ]
    )

    return {"reply": response['message']['content']}
