import os
import requests
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

# We import the functions we created in our other file
from database import init_db, save_summary

# --- App Setup ---
# Initialize the Flask web server application
app = Flask(__name__)
# A security feature to allow our frontend to talk to this backend
CORS(app) 
# Create the database file on the first run
init_db() 

# --- Local AI (Ollama) Configuration ---
# This is the standard address Ollama uses to serve the local AI model
OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"

def format_prompt_for_ollama(system_prompt, history):
    """
    Local models like Llama 3 work best with a single, continuous prompt.
    This function builds that prompt from our system instructions and chat history.
    """
    full_prompt = f"System Instruction: {system_prompt}\n\nConversation History:\n"
    for message in history:
        role = "User" if message['role'] == 'user' else "Kai"
        full_prompt += f"{role}: {message['parts'][0]['text']}\n"
    # This prompts the model to generate Kai's next response
    full_prompt += "Kai:"
    return full_prompt

# --- API Endpoints ---
@app.route('/api/interact', methods=['POST'])
def interact_with_kai():
    """Endpoint to handle chat interactions. It calls the local Ollama model."""
    data = request.get_json()
    history = data.get('history')
    system_prompt = data.get('system_prompt')
    
    prompt = format_prompt_for_ollama(system_prompt, history)
    
    try:
        # The payload we send to our local AI
        payload = {"model": "llama3:8b", "prompt": prompt, "stream": False}
        
        # We send the request to the Ollama server
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status() # Check for any errors
        ai_text = response.json().get('response', '').strip()
        
        # We send the AI's clean text response back to the frontend
        return jsonify({"aiResponse": ai_text})
    except requests.exceptions.RequestException:
        # This is a fallback. If the app can't connect to Ollama, it will send this
        # message instead of crashing. This is useful for testing the UI.
        print("Warning: Could not connect to local Ollama. Using fallback response.")
        return jsonify({"aiResponse": "The local connection is quiet... How does that make you feel? [CHOICE: Calm | Anxious]"})

@app.route('/api/log_summary', methods=['POST'])
def log_summary():
    """Receives the final summary from the frontend and saves it to the database."""
    data = request.get_json()
    dominant_trait = data.get('dominantTrait')
    scores = data.get('scores')
    # Generate a unique ID for this session so we can track it
    session_id = str(uuid.uuid4()) 
    
    try:
        # We call the function from our database.py script
        save_summary(session_id, dominant_trait, scores)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        print(f"Database Error: {e}")
        return jsonify({"status": "error", "message": "Could not save summary."}), 500

if __name__ == '__main__':
    # This starts the server when we run "python app.py" in the terminal
    app.run(port=5001)


