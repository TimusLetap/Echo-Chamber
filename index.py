import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables (for our secret API key)
load_dotenv()

app = Flask(__name__)
# Enable CORS to allow our frontend to talk to this backend
CORS(app)

# Get the secret API key from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={GEMINI_API_KEY}"

@app.route('/interact', methods=['POST'])
def interact_with_kai():
    """
    This is the single endpoint for our application.
    It receives the conversation history from the frontend,
    sends it to the Google AI API, and returns the response.
    """
    try:
        # Get the data sent from our frontend's JavaScript
        data = request.get_json()
        conversation_history = data.get('history')
        system_prompt = data.get('system_prompt')

        if not conversation_history or not system_prompt:
            return jsonify({"error": "Missing conversation history or system prompt"}), 400

        # Construct the payload for the Google AI API
        payload = {
            "contents": conversation_history,
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            }
        }

        # Securely call the Google AI API from our server
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()  # This will raise an error for bad responses (4xx or 5xx)
        
        ai_response = response.json()
        ai_text = ai_response['candidates'][0]['content']['parts'][0]['text']

        # Send the clean text response back to the frontend
        return jsonify({"aiResponse": ai_text})

    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        return jsonify({"error": "Failed to connect to the AI service."}), 500
    except (KeyError, IndexError) as e:
        print(f"Error parsing AI response: {e}")
        return jsonify({"error": "Invalid response from the AI service."}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    # This allows us to run the server locally for testing
    app.run(host='0.0.0.0', port=5001, debug=True)
```

### Step 3: Modify the Frontend

Now, we just need to change one small part of your `frontend/index.html` file. Find the `getAIResponse` function and replace it with this new version that calls *our* backend instead of Google's directly.

```javascript
            // The OLD, insecure function
            /*
            async function getAIResponse() {
                const apiKey = ""; // EXPOSED KEY
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const payload = { contents: conversationHistory, systemInstruction: { parts: [{ text: systemPrompt }] }, };
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
                const result = await response.json();
                return result.candidates[0].content.parts[0].text;
            }
            */

            // The NEW, secure function
            async function getAIResponse() {
                // This URL will be the live URL of your backend on Render.com
                // For local testing, you would use: 'http://127.0.0.1:5001/interact'
                const backendUrl = 'https://YOUR_RENDER_APP_NAME.onrender.com/interact'; 

                const payload = {
                    history: conversationHistory,
                    system_prompt: systemPrompt
                };

                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    // This will catch errors from our own backend
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server Error: ${response.status}`);
                }
                
                const result = await response.json();
                return result.aiResponse;
            }
