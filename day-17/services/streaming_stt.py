# services/streaming_stt.py
import asyncio
import json
import logging
import base64
from fastapi import WebSocket
import assemblyai as aai
from config import ASSEMBLYAI_API_KEY

class StreamingTranscriber:
    """Handles real-time audio transcription using AssemblyAI's Universal Streaming API."""
    
    def __init__(self, websocket: WebSocket, sample_rate: int = 16000):
        self.websocket = websocket
        self.sample_rate = sample_rate
        self.transcriber = None
        self.running = False
        
        # Configure AssemblyAI
        if not ASSEMBLYAI_API_KEY:
            raise Exception("AssemblyAI API key not configured")
        
        aai.settings.api_key = ASSEMBLYAI_API_KEY
    
    async def start(self):
        """Start the streaming transcription session."""
        try:
            # Create transcriber with new Universal Streaming API
            self.transcriber = aai.RealtimeTranscriber(
                on_data=self._on_data,
                on_error=self._on_error,
                on_open=self._on_open,
                on_close=self._on_close,
                sample_rate=self.sample_rate
            )
            
            # Start the transcriber
            self.transcriber.connect()
            self.running = True
            
            logging.info("Connected to AssemblyAI Universal Streaming service")
            
        except Exception as e:
            logging.error(f"Failed to start streaming transcriber: {e}")
            raise
    
    def _on_open(self, session_opened: aai.RealtimeSessionOpened):
        """Handle session opened event."""
        logging.info(f"AssemblyAI session started: {session_opened.session_id}")
    
    def _on_data(self, transcript: aai.RealtimeTranscript):
        """Handle transcription data."""
        if not transcript.text:
            return
            
        if isinstance(transcript, aai.RealtimeFinalTranscript):
            # Handle final transcript
            logging.info(f"🎤 TRANSCRIPTION: {transcript.text}")
            asyncio.create_task(self._send_to_client({
                "type": "transcription",
                "text": transcript.text,
                "is_final": True
            }))
        else:
            # Handle partial transcript
            logging.info(f"🎤 PARTIAL: {transcript.text}")
            asyncio.create_task(self._send_to_client({
                "type": "transcription",
                "text": transcript.text,
                "is_final": False
            }))
    
    def _on_error(self, error: aai.RealtimeError):
        """Handle transcription errors."""
        logging.error(f"AssemblyAI error: {error}")
        asyncio.create_task(self._send_to_client({
            "type": "error",
            "message": str(error)
        }))
    
    def _on_close(self):
        """Handle session close."""
        logging.info("AssemblyAI session closed")
        self.running = False
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to AssemblyAI for transcription."""
        if self.transcriber and self.running:
            try:
                # Send audio data directly to transcriber
                self.transcriber.stream(audio_data)
            except Exception as e:
                logging.error(f"Error sending audio data: {e}")
    
    async def close(self):
        """Close the streaming transcription session."""
        if self.transcriber and self.running:
            try:
                self.running = False
                self.transcriber.close()
                logging.info("Streaming transcriber closed")
            except Exception as e:
                logging.error(f"Error closing transcriber: {e}")
    
    async def _send_to_client(self, message: dict):
        """Send a message to the WebSocket client."""
        try:
            if self.websocket:
                await self.websocket.send_text(json.dumps(message))
        except Exception as e:
            logging.error(f"Failed to send message to client: {e}")
