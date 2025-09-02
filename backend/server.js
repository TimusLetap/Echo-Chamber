// Filename: backend/server.js

// 1. Import necessary libraries
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Use node-fetch for API calls in Node.js

// Load your secret API key from an environment file, not directly in code
require('dotenv').config(); 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 2. Set up the Express server
const app = express();
app.use(cors()); // Allows your frontend to communicate with this server
app.use(express.json()); // Allows the server to understand JSON data

const PORT = 3000;

// 3. Create an API endpoint for your frontend to call
app.post('/interact', async (req, res) => {
    try {
        const { history } = req.body; // Get conversation history from the frontend
        const systemPrompt = `You are Kai, an AI for a short, reflective experience...`; // Your prompt lives here now

        // 4. Securely call the Google AI API from the server
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: history,
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const geminiResult = await geminiResponse.json();
        const aiText = geminiResult.candidates[0].content.parts[0].text;

        // 5. Send the AI's response back to the frontend
        res.json({ aiResponse: aiText });

    } catch (error) {
        console.error("Error in /interact endpoint:", error);
        res.status(500).json({ error: "Failed to get a response from Kai." });
    }
});

// 6. Start the server
app.listen(PORT, () => {
    console.log(`Kai's AI Engine is running on http://localhost:${PORT}`);
});
