// static/script.js

const fallbackVoices = [
  { name: "Natalie", gender: "Female", voiceId: "en-US-natalie" },
  { name: "Aria", gender: "Female", voiceId: "en-US-aria" },
  { name: "Guy", gender: "Male", voiceId: "en-US-guy" },
  { name: "Davis", gender: "Male", voiceId: "en-US-davis" },
  { name: "Sara", gender: "Female", voiceId: "en-US-sara" },
];

// Call history storage
let callHistory = [];

function populateVoiceSelector(voices) {
  const voiceSelector = document.getElementById("voiceSelector");
  voiceSelector.innerHTML = "";
  voices.forEach((v) => {
    voiceSelector.add(new Option(`${v.name} (${v.gender})`, v.voiceId));
  });
}

function addToCallHistory(question, answer) {
  const timestamp = new Date().toLocaleTimeString();
  callHistory.push({
    question: question,
    answer: answer,
    timestamp: timestamp
  });
  renderCallHistory();
}

function renderCallHistory() {
  const historyContainer = document.getElementById("callHistory");
  
  if (callHistory.length === 0) {
    historyContainer.innerHTML = '<div class="text-muted text-center">No conversation history yet</div>';
    return;
  }

  historyContainer.innerHTML = '';
  
  callHistory.forEach((entry, index) => {
    const historyItem = document.createElement('div');
    historyItem.className = 'border-start border-primary border-3 ps-3 mb-3';
    historyItem.innerHTML = `
      <small class="text-muted">${entry.timestamp}</small>
      <div class="fw-bold text-primary">You:</div>
      <div class="mb-2">${entry.question}</div>
      <div class="fw-bold text-success">Agent:</div>
      <div>${entry.answer}</div>
    `;
    historyContainer.appendChild(historyItem);
  });
  
  // Auto-scroll to bottom
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

async function generateTTS() {
  const text = document.getElementById("textInput").value;
  const voiceId = document.getElementById("voiceSelector").value;
  const button = document.getElementById("generateBtn");
  const statusDisplay = document.getElementById("statusDisplay");
  const audioPlayer = document.getElementById("audioPlayer");

  statusDisplay.textContent = "";
  audioPlayer.hidden = true;
  button.disabled = true;
  button.textContent = "Generating...";

  const formData = new FormData();
  formData.append("text", text);
  formData.append("voiceId", voiceId);

  try {
    const response = await fetch("/tts", { method: "POST", body: formData });
    const data = await response.json();

    if (response.ok && data.audio_url) {
      audioPlayer.src = data.audio_url;
      audioPlayer.hidden = false;
      audioPlayer.play();
      statusDisplay.textContent = ""; 
    } else {
      statusDisplay.textContent = `Error: ${data.error || "TTS failed."}`;
    }
  } catch (err) {
    statusDisplay.textContent = "An unexpected error occurred.";
  } finally {
    button.disabled = false;
    button.textContent = "Generate Voice";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // --- SESSION MANAGEMENT ---
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.history.replaceState({}, '', `?session_id=${sessionId}`);
  }

  document.getElementById("generateBtn").addEventListener("click", generateTTS);

  try {
    const res = await fetch("/voices");
    if (!res.ok) throw new Error("Failed to fetch voices from API");
    const data = (await res.json()) || {};
    const voices = data.voices || [];
    populateVoiceSelector(voices.length ? voices : fallbackVoices);
  } catch (e) {
    console.warn("API call for voices failed. Using fallback list.", e);
    populateVoiceSelector(fallbackVoices);
  }

  // --- DAY 10: Conversational Agent Logic ---
  let mediaRecorder = null;
  let recordedChunks = [];

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const statusDisplay = document.getElementById("statusDisplay");
  const audioPlayer = document.getElementById("audioPlayer");

  // When the agent's audio finishes playing, automatically start recording.
  audioPlayer.addEventListener('ended', () => {
      statusDisplay.textContent = "I'm listening... Click Stop to send.";
      startRecording();
  });
  
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Audio recording not supported in this browser.");
      return;
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDisplay.textContent = "Recording... Click Stop when you're done.";
    audioPlayer.hidden = true;
    recordedChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      };

      mediaRecorder.onstop = handleStopRecording;
      mediaRecorder.start();

    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Could not access microphone. Please check permissions.");
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusDisplay.textContent = "Ready to chat!";
    }
  };

  const handleStopRecording = async () => {
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio_file", blob, "recording.webm");

    statusDisplay.textContent = "Thinking...";
    startBtn.disabled = true;
    stopBtn.disabled = true;

    try {
      const currentSessionId = new URLSearchParams(window.location.search).get('session_id');
      if (!currentSessionId) {
          statusDisplay.textContent = "Error: Session ID is missing.";
          startBtn.disabled = false;
          return;
      }

      // Get the transcribed question from the backend response
      const response = await fetch(`/agent/chat/${currentSessionId}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (response.ok && result.audio_url) {
        // We need to get the actual question and answer
        // For now, we'll extract from the response or use placeholders
        // In a real implementation, the backend would return the text
        
        // For demonstration, we'll use the audio URL to infer the response
        // In practice, you'd want the backend to return the actual text
        const question = "User question (audio)";
        const answer = "Agent response (audio)";
        
        addToCallHistory(question, answer);
        
        statusDisplay.textContent = "Here is my response:";
        audioPlayer.src = result.audio_url;
        audioPlayer.hidden = false;
        audioPlayer.play();
      } else {
        statusDisplay.textContent = `Error: ${result.error || "Failed to get response."}`;
        startBtn.disabled = false;
      }
    } catch (error) {
      console.error("Error with conversational agent:", error);
      statusDisplay.textContent = "An error occurred. Please try again.";
      startBtn.disabled = false;
    }
  };

  // The start button now only initiates the very first recording.
  startBtn.addEventListener("click", startRecording);

  stopBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  });
});
