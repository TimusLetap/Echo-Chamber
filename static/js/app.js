document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const chatLog = document.getElementById('chat-log');
    const chatInputArea = document.getElementById('chat-input-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const choiceContainer = document.getElementById('choice-container');
    const fills = {
        Logic: document.getElementById('logic-fill'),
        Empathy: document.getElementById('empathy-fill'),
        Conflict: document.getElementById('conflict-fill')
    };
    const musicToggleButton = document.getElementById('music-toggle-button');
    const assessmentOverlay = document.getElementById('assessment-overlay');
    const assessmentResult = document.getElementById('assessment-result');
    const assessmentSummary = document.getElementById('assessment-summary');
    const restartButton = document.getElementById('restart-button');
    
    // --- KAI'S PROFILE (Ported from JSON for frontend-only build) ---
    const kaiProfile = {
        feedback: {
            LOGIC: { 
                icon: "🧠", 
                title: "The Analyst", 
                profile: "Your responses show a strong preference for structure, reason, and problem-solving. You seek to understand the world by deconstructing it into logical patterns, making you a natural strategist.", 
                scenarios: "Situations that require clear-headed decision-making under pressure, such as planning a complex project, debugging a technical issue, or navigating negotiations where emotion could be a distraction." 
            },
            EMPATHY: { 
                icon: "❤️", 
                title: "The Connector", 
                profile: "You consistently navigated the conversation with a focus on feeling, connection, and understanding. Your approach indicates a high degree of emotional intelligence and a desire to build rapport.", 
                scenarios: "Roles that involve mentoring, resolving interpersonal conflicts, or providing support to others. You are well-equipped to handle emotionally charged situations that require patience and understanding." 
            },
            CONFLICT: { 
                icon: "⚔️", 
                title: "The Challenger", 
                profile: "Your choices indicate a willingness to confront difficult topics and challenge established ideas. You are not afraid of dissonance and are motivated to push against boundaries to find a resolution.", 
                scenarios: "Environments that require advocacy, driving change, or holding a firm position on important matters. You are prepared to tackle difficult conversations that others might avoid." 
            },
            NEUTRAL: { 
                icon: "🧭", 
                title: "The Observer", 
                profile: "Your approach was balanced and adaptable, showing a blend of logic and empathy without leaning heavily in one direction. This suggests you are open-minded, flexible, and prefer to gather information before committing to a stance.", 
                scenarios: "Situations that require impartiality and a holistic view, such as mediating a discussion, exploring a new creative idea without prejudice, or adapting to rapidly changing circumstances." 
            }
        }
    };

    // --- State Variables ---
    const playerModel = { Logic: 1, Empathy: 1, Conflict: 1 };
    const conversationHistory = [];
    const MAX_TURNS = 7;
    let turnCount = 0;
    const systemPrompt = `You are Kai, an AI for a short, reflective experience. Guide the user through a 6-turn conversation. On your 6th response, provide a concluding thought and end with the specific token [END_SESSION]. Sometimes, offer choices in the format [CHOICE: Option 1 | Option 2].`;

    // --- Audio State ---
    let audioContext, musicGain, sfxGain;
    let isMusicPlaying = false, isAudioInitialized = false;
    let currentMode = 'neutral', musicLoopTimeout;

    // --- Core Logic ---
    function startSession() {
        turnCount = 0;
        Object.keys(playerModel).forEach(k => playerModel[k] = 1);
        conversationHistory.length = 0;
        
        assessmentOverlay.style.display = 'none';
        chatLog.innerHTML = '';
        toggleInput(true, true);
        
        const opener = `The data streams are open for our reflection. It's Monday evening here in Eastvale. Please, share a thought to start our story.`;
        
        appendMessage('ai', opener);
        conversationHistory.push({ role: "model", parts: [{ text: opener }] });
        updateUIState('NEUTRAL');
        updateStatGauges();
    }

    async function handleUserInput(text) {
        if (text.trim() === '') return;
        
        if (!isAudioInitialized) initAudio();
        if (!isMusicPlaying) toggleMusic();
        
        playInputSound();
        appendMessage('user', text);
        userInput.value = '';
        conversationHistory.push({ role: 'user', parts: [{ text }] });
        turnCount++;

        toggleInput(false);
        appendTypingIndicator();

        analyzeAndModelPlayerInput(text);
        updateStatGauges(getDominantStat());

        try {
            const responseText = await getAIResponse();
            conversationHistory.push({ role: 'model', parts: [{ text: responseText }] });
            processAIResponse(responseText);
        } catch (error) {
            console.error("API Error:", error);
            appendMessage('ai', "My thoughts are... scattered. The connection is unstable. Please ensure your API key is correct in the app.js file.");
            toggleInput(true);
        } finally {
            removeTypingIndicator();
        }
    }
    
    async function getAIResponse() {
        // --- SECURITY WARNING ---
        // For a real application, this key should be on a backend server.
        // It is exposed here only because we are deploying on GitHub Pages.
        const apiKey = ""; // PASTE YOUR GEMINI API KEY HERE
        if (!apiKey) {
            throw new Error("API key is missing.");
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = { 
            contents: conversationHistory, 
            systemInstruction: { parts: [{ text: systemPrompt }] }, 
            // Adding safety settings for a better user experience
            safetySettings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH" }
            ]
        };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
        const result = await response.json();
        
        if (!result.candidates || result.candidates.length === 0) {
             throw new Error("Invalid response from AI. The content may have been blocked due to safety settings.");
        }
        return result.candidates[0].content.parts[0].text;
    }

    function processAIResponse(text) {
        if (text.includes('[END_SESSION]') || turnCount >= MAX_TURNS) {
            const cleanText = text.replace('[END_SESSION]', '').trim();
            if (cleanText) appendMessage('ai', cleanText);
            endSession();
            return;
        }

        const choiceRegex = /\[CHOICE:\s*(.*?)\s*\]/;
        const match = text.match(choiceRegex);

        if (match) {
            const mainText = text.replace(choiceRegex, '').trim();
            if (mainText) appendMessage('ai', mainText);
            const choices = match[1].split('|').map(c => c.trim());
            displayChoices(choices);
        } else {
            appendMessage('ai', text);
            toggleInput(true);
        }
    }

    function displayChoices(choices) {
        choiceContainer.innerHTML = '';
        choices.forEach(choiceText => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = choiceText;
            button.onclick = () => handleUserInput(choiceText);
            choiceContainer.appendChild(button);
        });
        toggleInput(false, false, true);
    }
    
    function endSession() {
        toggleInput(false);
        setTimeout(showAssessment, 2000);
    }

    function showAssessment() {
        const dominantStat = getDominantStat();
        const feedback = kaiProfile.feedback[dominantStat];
        assessmentResult.innerHTML = `${feedback.icon} Your Dominant Trait: <strong>${feedback.title}</strong>`;
        assessmentSummary.innerHTML = `<strong>Psychological Profile:</strong> ${feedback.profile}<br><br><strong>You are prepared for:</strong> ${feedback.scenarios}`;
        assessmentOverlay.style.display = 'flex';
    }

    function analyzeAndModelPlayerInput(text) {
        const lowerText = text.toLowerCase();
        let increasedStat = 'NEUTRAL';
        if (lowerText.includes("think") || lowerText.includes("reason") || lowerText.includes("logic")) increasedStat = 'Logic';
        if (lowerText.includes("feel") || lowerText.includes("sad") || lowerText.includes("happy")) increasedStat = 'Empathy';
        if (lowerText.includes("fight") || lowerText.includes("attack") || lowerText.includes("argue")) increasedStat = 'Conflict';
        
        if (increasedStat !== 'NEUTRAL') {
            playerModel[increasedStat] += 1.5;
            Object.keys(playerModel).forEach(key => {
                if (key !== increasedStat) playerModel[key] = Math.max(0.5, playerModel[key] - 0.75);
            });
        }
    }
    
    function getDominantStat() {
        return Object.keys(playerModel).reduce((a, b) => playerModel[a] > playerModel[b] ? a : b).toUpperCase();
    }

    function updateUIState(state) {
        const oldMode = currentMode;
        body.className = `state-${state.toLowerCase()}`;
        currentMode = state.toLowerCase();

        if (oldMode !== currentMode && isMusicPlaying) {
            clearTimeout(musicLoopTimeout);
            playMusicLoop();
        }
    }

    function updateStatGauges(updatedStat) {
        const total = Math.max(1, Object.values(playerModel).reduce((a, b) => a + b, 0));
        fills.Logic.style.width = `${(playerModel.Logic / total) * 100}%`;
        fills.Empathy.style.width = `${(playerModel.Empathy / total) * 100}%`;
        fills.Conflict.style.width = `${(playerModel.Conflict / total) * 100}%`;

        if (updatedStat && fills[updatedStat]) {
            const gauge = fills[updatedStat].parentElement;
            gauge.classList.add('flash');
            setTimeout(() => gauge.classList.remove('flash'), 500);
        }
    }
    
    function initAudio() { if (!isAudioInitialized) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); musicGain = audioContext.createGain(); musicGain.gain.setValueAtTime(0.08, audioContext.currentTime); musicGain.connect(audioContext.destination); sfxGain = audioContext.createGain(); sfxGain.gain.setValueAtTime(0.3, audioContext.currentTime); sfxGain.connect(audioContext.destination); isAudioInitialized = true; } }
    function playInputSound() { if (!audioContext) return; const now = audioContext.currentTime; const osc = audioContext.createOscillator(); const gainNode = audioContext.createGain(); osc.connect(gainNode).connect(sfxGain); switch (currentMode) { case 'conflict': osc.type = 'square'; osc.frequency.setValueAtTime(100, now); gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(now); osc.stop(now + 0.1); break; case 'empathy': osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3); osc.start(now); osc.stop(now + 0.3); break; default: osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, now); gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); osc.stop(now + 0.05); break; } }
    function playNote(frequency, startTime, duration) { const oscillator = audioContext.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, startTime); const noteGain = audioContext.createGain(); noteGain.gain.setValueAtTime(0, startTime); noteGain.gain.linearRampToValueAtTime(0.5, startTime + 0.1); noteGain.gain.linearRampToValueAtTime(0, startTime + duration); oscillator.connect(noteGain).connect(musicGain); oscillator.start(startTime); oscillator.stop(startTime + duration); }
    function playMusicLoop() { if (!isMusicPlaying || !audioContext || currentMode === 'logic') return; const now = audioContext.currentTime; let noteDuration = 1.0; let sequence = [130.81, 155.56, 196.00, 233.08]; switch (currentMode) { case 'empathy': noteDuration = 1.5; sequence = [130.81, 164.81, 196.00, 164.81]; break; case 'conflict': noteDuration = 2.0; sequence = [65.41, 69.30, 65.41, 73.42]; break; } for (let i = 0; i < sequence.length; i++) { playNote(sequence[i], now + i * noteDuration, noteDuration * 0.9); } musicLoopTimeout = setTimeout(playMusicLoop, noteDuration * sequence.length * 1000); }
    function toggleMusic() { if (!isAudioInitialized) initAudio(); isMusicPlaying = !isMusicPlaying; if (isMusicPlaying) { if (audioContext.state === 'suspended') audioContext.resume(); musicToggleButton.classList.add('playing'); clearTimeout(musicLoopTimeout); playMusicLoop(); } else { musicToggleButton.classList.remove('playing'); clearTimeout(musicLoopTimeout); } }
    function appendMessage(sender, text) { const messageDiv = document.createElement('div'); messageDiv.className = `message ${sender}-message`; if (sender === 'ai') { const mask = document.createElement('div'); mask.className = 'kai-mask'; messageDiv.appendChild(mask); } const textSpan = document.createElement('span'); textSpan.textContent = text; messageDiv.appendChild(textSpan); chatLog.appendChild(messageDiv); chatLog.scrollTop = chatLog.scrollHeight; }
    function appendTypingIndicator() { const indicator = document.createElement('div'); indicator.id = 'typing-indicator'; indicator.className = 'message ai-message'; indicator.innerHTML = `<div class="kai-mask"></div><div class="typing-indicator"><span></span><span></span><span></span></div>`; chatLog.appendChild(indicator); chatLog.scrollTop = chatLog.scrollHeight; }
    function removeTypingIndicator() { const indicator = document.getElementById('typing-indicator'); if (indicator) indicator.remove(); }
    function toggleInput(enabled, isTextInput = true, isChoiceInput = false) { userInput.disabled = !enabled; sendButton.disabled = !enabled; chatInputArea.style.display = isTextInput ? 'flex' : 'none'; choiceContainer.style.display = isChoiceInput ? 'flex' : 'none'; if (enabled && isTextInput) userInput.focus(); }

    sendButton.addEventListener('click', () => handleUserInput(userInput.value));
    userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUserInput(userInput.value); });
    musicToggleButton.addEventListener('click', toggleMusic);
    restartButton.addEventListener('click', startSession);

    startSession();
});

const backendUrl = 'https://5001-your-workspace-name.gitpod.io/interact';
