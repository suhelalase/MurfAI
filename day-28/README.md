# Day 28: Deploying the Voice Agent to the Cloud

Welcome to Day 28 of the 30 Days of Voice Agents Challenge\! Today, we've taken our agent public by deploying it to a cloud hosting provider, making it accessible to anyone with a web browser.

## 🧠 What We Built

  * **Public Deployment**: We have successfully deployed the agent to Render.com, a cloud platform with a generous free tier. This makes our agent accessible via a public URL.
  * **Live Agent**: Our voice agent is now live and can be accessed and used by anyone, anywhere.

-----

## 🛠 Tech Stack

The tech stack remains the same, but we are now leveraging a cloud platform to host our application.

  * **Backend**: `FastAPI`, `uvicorn`, `requests`, `assemblyai`, `google-generativeai`, `python-dotenv`, `websockets`, `google-search-results`
  * **Frontend**: `HTML`, `Bootstrap`, `JavaScript` (with `AudioContext` and `WebSocket API`)
  * **Deployment**: `Render.com`
  * **AI APIs**:
      * Murf AI (Streaming Text-to-Speech)
      * AssemblyAI (Real-Time Speech-to-Text with Turn Detection)
      * Google Gemini (Streaming LLM with Function Calling)
      * SerpAPI (Real-time Google Search Results)

-----


-----

## 📂 Project Structure

The project structure is optimized for deployment.

```
AI Voice Agent/
├── main.py      # Handles WebSocket connections and API key logic
├── services/
│   ├── llm.py   # Handles interactions with the Gemini LLM
│   ├── stt.py   # Manages real-time speech-to-text
│   └── tts.py   # Manages text-to-speech conversion
├── schemas.py
├── templates/
│   └── index.html # Main UI for the voice agent
├── static/
│   ├── script.js  # Frontend logic for recording and settings
│   └── style.css  # UI styles
├── requirements.txt # Lists all project dependencies for deployment
└── .env           # Stores API keys for local development
```

-----

## ✅ Completed Days

  * **Day 01 - 26**: Foundational work, from setting up the server and integrating AI services to giving the agent a persona and web search capabilities.
  * **Day 27**: Revamped the UI and implemented a settings panel for API key configuration directly in the browser.
  * **Day 28**: Successfully deployed the agent to a public cloud server, making it accessible to all.
