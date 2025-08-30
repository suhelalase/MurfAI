// static/script.js - Updated for new UI

document.addEventListener("DOMContentLoaded", async () => {
    // --- SESSION MANAGEMENT ---
    const urlParams = new URLSearchParams(window.location.search);
    let sessionId = urlParams.get('session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        window.history.replaceState({}, '', `?session_id=${sessionId}`);
    }

    // --- WebSocket and Recording Logic ---
    let audioContext = null;
    let source = null;
    let processor = null;
    let isRecording = false;
    let socket = null;

    // Track processed transcriptions to prevent UI duplicates
    let processedTranscripts = new Set();
    let lastTranscriptTime = 0;

    // New UI elements
    const recordBtn = document.getElementById("recordBtn");
    const statusDisplay = document.getElementById("statusDisplay");
    const messagesContainer = document.getElementById("messagesContainer");
    const clearBtn = document.getElementById("clearBtn");
    const connectionDot = document.getElementById("connectionDot");
    const connectionStatus = document.getElementById("connectionStatus");

    // Add typing indicator element
    let typingIndicator = null;

    // Function to add message to chat
    const addMessage = (text, isUser = false, timestamp = new Date()) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        
        const avatar = document.createElement("div");
        avatar.className = 'avatar';
        avatar.innerHTML = `<i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>`;
        
        const messageContent = document.createElement("div");
        messageContent.className = 'message-content';
        
        const messageText = document.createElement("p");
        messageText.textContent = text;
        
        const timeStamp = document.createElement("div");
        timeStamp.className = 'timestamp';
        timeStamp.textContent = timestamp.toLocaleTimeString();
        
        messageContent.appendChild(messageText);
        messageContent.appendChild(timeStamp);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    };

    // Function to show typing indicator
    const showTypingIndicator = () => {
        if (typingIndicator) return;
        
        typingIndicator = document.createElement("div");
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // Function to hide typing indicator
    const hideTypingIndicator = () => {
        if (typingIndicator) {
            typingIndicator.remove();
            typingIndicator = null;
        }
    };

    // Clear chat function
    const clearChat = () => {
        // Keep only the first welcome message
        const welcomeMessage = messagesContainer.querySelector('.message.ai:first-child');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        } else {
            // Add welcome message if not present
            addMessage("Hello! I'm your AI assistant. Click the microphone button to start a conversation with me.", false);
        }
        processedTranscripts.clear();
    };

    // Update connection status
    const updateConnectionStatus = (connected, message = '') => {
        if (connected) {
            connectionDot.classList.add('connected');
            connectionStatus.textContent = message || 'Connected';
            connectionStatus.style.color = 'var(--success-color)';
        } else {
            connectionDot.classList.remove('connected');
            connectionStatus.textContent = message || 'Disconnected';
            connectionStatus.style.color = 'var(--text-secondary)';
        }
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Audio recording not supported in this browser.");
            return;
        }

        isRecording = true;
        recordBtn.classList.add("recording");
        statusDisplay.textContent = "Listening... Speak now.";
        statusDisplay.classList.add("recording");

        // Reset duplicate tracking for new recording session
        processedTranscripts.clear();
        lastTranscriptTime = 0;

        try {
            // Establish WebSocket connection
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

            socket.onopen = async () => {
                console.log("WebSocket connection established for streaming transcription with turn detection.");
                statusDisplay.textContent = "Connected. Speak now - I'll detect when you stop talking.";
                updateConnectionStatus(true, "Connected to service");

                try {
                    // Get microphone access
                    const stream = await极速赛车开奖结果 navigator.mediaDevices.getUserMedia({ audio: true });
                    
                    // Create AudioContext with 16kHz sample rate (required by AssemblyAI)
                    audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                        sampleRate: 16000 
                    });
                    
                    source = audioContext.createMediaStreamSource(stream);
                    
                    // Create ScriptProcessorNode for processing audio chunks
                    processor = audioContext.createScriptProcessor(4096, 1, 1); // Mono, 4096 buffer size

                    processor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        
                        // Convert float32 (-1.0 to 1.0) to 16-bit PCM
                        const pcmData = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const sample = Math.max(-1, Math.min(1, inputData[i]));
                            pcm极速赛车开奖结果Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                        }
                        
                        // Send PCM data to server if WebSocket is open
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(pcmData.buffer);
                        }
                    };

                    // Connect the audio nodes
                    source.connect(processor);
                    processor.connect(audioContext.destination);

                    // Store the stream for cleanup
                    recordBtn.mediaStream = stream;

                } catch (micError) {
                    console.error("Error accessing microphone:", micError);
                    alert("Could not access microphone. Please check permissions.");
                    stopRecording();
                }
            };

            // Handle messages from the WebSocket (transcription updates and turn detection)
            socket.onmessage = (event) => {
                console.log("Received WebSocket message:", event.data);
                try {
                    const data = JSON.parse(event.data);
                    console.log("Parsed message data:", data);
                    
                    if (data.type === "transcription" && data.end_of_turn) {
                        // Display transcription only at end of turn
                        console.log(`End of turn transcription: ${data.text}`);
                        
                        // Normalize transcript for duplicate detection (same as backend)
                        const normalizedText = data.text.toLowerCase().replace(/\s+/g, ' ').trim();
                        const currentTime = Date.now();
                        
                        // Check for duplicates (same logic as backend)
                        if (data.text.length > 3 && 
                            !processedTranscripts.has(normalizedText) && 
                            currentTime - lastTranscriptTime > 2000) { // 2 second gap
                            
                            // Mark as processed
                            processedTranscripts.add(normalizedText);
                            lastTranscriptTime = currentTime;
                            
                            // Add user message to chat
                            addMessage(data.text, true);
                            
                            // Show typing indicator for AI response
                            showTypingIndicator();
                            
                            // Update status
                            statusDisplay.textContent = "Processing your message...";
                        }
                        
                    } else if (data.type === "turn_end") {
                        console.log("Turn end detected:", data.message);
                        statusDisplay.textContent = "Processing your message...";
                        
                    } else if (data.type === "error") {
                        console.error("Transcription error:", data.message);
                        statusDisplay.textContent = `Error: ${data.message}`;
                        statusDisplay.classList.add("error");
                        hideTypingIndicator();
                    } else if (data.type === "status") {
                        console.log("Status message:", data.message);
                        statusDisplay.textContent = data.message;
                    }
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err, "Raw data:", event.data);
                }
            };

            socket.onclose = () => {
                console.log("极速赛车开奖结果WebSocket connection closed.");
                statusDisplay.textContent = "Transcription session ended.";
                statusDisplay.classList.remove("recording", "error");
                updateConnectionStatus(false, "Disconnected");
                hideTypingIndicator();
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                statusDisplay.textContent = "Connection error occurred.";
                statusDisplay.classList.add("error");
                updateConnectionStatus(false, "Connection error");
                hideTypingIndicator();
            };

        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Failed to start recording session.");
            stopRecording();
        }
    };

    const stopRecording = () => {
        if (!isRecording) return;

        isRecording = false;
        recordBtn.classList.remove("recording");
        statusDisplay.textContent = "Stopping recording...";
        statusDisplay.classList.remove("recording", "error");

        // Clean up audio processing
        if (processor) {
            processor.disconnect();
            processor = null;
        }
        
        if (source) {
            source.disconnect();
            source = null;
        }
        
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        // Stop media stream tracks
        if (recordBtn.mediaStream) {
            recordBtn.mediaStream.getTracks().forEach(track => track.stop());
            recordBtn.mediaStream = null;
        }

        // Send EOF and close WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send("EOF");
            socket.close();
        }
        socket = null;

        statusDisplay.textContent = "Ready to chat";
        updateConnectionStatus(false, "Disconnected");
        hideTypingIndicator();
    };

    // Event listeners
    recordBtn.addEventListener("click", () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    clearBtn.addEventListener("click", clearChat);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (isRecording) {
            stopRecording();
        }
    });

    // Initial connection status
    updateConnectionStatus(false);
});
