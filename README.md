# Browser Podcast Generator

A lightweight web application that generates podcasts from conversation threads directly in your browser.

## Features

- Load message JSON data from any conversation
- Group messages by week
- Organize messages into threaded conversations
- Generate podcast scripts using LLM Foundry API (GPT-4o-mini)
- Create audio for each line in the script using LLM Foundry's text-to-speech API
- Combine audio into a downloadable MP3 podcast
- Dynamic rendering for improved performance

## How to Use

1. Open `index.html` in your browser
2. Upload a JSON file containing messages with the following structure:
   ```json
   [
     {
       "messageId": "123",
       "author": "John",
       "text": "Hello, this is a message",
       "time": "2023-01-01T12:00:00Z",
       "quoteMessageId": null
     },
     {
       "messageId": "124",
       "author": "Jane",
       "text": "This is a reply",
       "time": "2023-01-01T12:05:00Z",
       "quoteMessageId": "123"
     }
   ]
   ```
3. Select a week from the dropdown menu
4. Click "Generate Script" to create a podcast script (requires LLM Foundry access)
5. Click "Generate Audio" to create the podcast audio (requires LLM Foundry access)
6. Download the podcast MP3 file

## API Integration

This application uses the LLM Foundry API for:
- Script generation using `gpt-4o-mini` model
- Audio generation using `gpt-4o-mini-tts` model

You must be logged into LLM Foundry in your browser for these features to work. The app uses browser credentials for authentication with the API.

## Technical Implementation

This application uses:
- Pure JavaScript for message processing and thread organization
- LLM Foundry API for script generation and text-to-speech
- Web Audio API for audio processing and combining
- Bootstrap for a clean, responsive UI
- Dynamic rendering for handling large message threads

## Fallbacks

If the LLM Foundry API is unavailable:
- Script generation falls back to a simple template-based approach
- Audio generation falls back to synthesized tones with different frequencies for different speakers

## Future Improvements

- Implement actual WASM modules for audio processing
- Add support for custom podcast templates
- Integrate with real text-to-speech APIs
- Add advanced audio editing capabilities 