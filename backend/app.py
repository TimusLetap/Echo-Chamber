import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# The local API endpoint provided by Ollama
OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"

def format_prompt(system_prompt, history):
    """
    Ollama works best with a single, formatted prompt string.
    We will combine the system instructions and the chat history.
    """
    full_prompt = f"System Instruction: {system_prompt}\n\nConversation History:\n"
    for message in history:
        role = "User" if message['role'] == 'user' else "Kai"
        full_prompt += f"{role}: {message['parts'][0]['text']}\n"
    full_prompt += "Kai:" # Prompt Kai for the next response
    return full_prompt

@app.route('/interact', methods=['POST'])
def interact_with_kai():
    """
    This endpoint now receives the history, formats it for our local model,
    and gets a response from Ollama.
    """
    try:
        data = request.get_json()
        conversation_history = data.get('history')
        system_prompt = data.get('system_prompt')

        if not conversation_history or not system_prompt:
            return jsonify({"error": "Missing conversation history or system prompt"}), 400

        # Format the entire conversation into a single prompt string
        prompt_text = format_prompt(system_prompt, conversation_history)

        # The payload for our local Ollama model
        payload = {
            "model": "llama3:8b", # The model we downloaded
            "prompt": prompt_text,
            "stream": False # We want the full response at once
        }

        # Call our local AI model
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        
        ai_response = response.json()
        ai_text = ai_response.get('response', '').strip()

        return jsonify({"aiResponse": ai_text})

    except requests.exceptions.RequestException as e:
        print(f"Ollama Request Error: {e}")
        return jsonify({"error": "Could not connect to the local AI engine. Is Ollama running?"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

