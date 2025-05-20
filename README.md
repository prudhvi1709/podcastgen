# Browser Podcast Generator

A web application that transforms document conversations into engaging podcasts directly in your browser. Built with modern web technologies and powered by OpenAI's API capabilities through LLM Foundry.

## 🌟 Features

- **Document Processing**
  - Support for multiple file formats:
    - JSON: Structured conversation data
    - PDF: Document text extraction
    - DOCX: Word document processing
    - TXT: Plain text content
  - User-provided context input
  - Intelligent content threading and organization
  - Dynamic content rendering with batch processing

- **AI-Powered Script Generation**
  - Intelligent script creation using LLMs
  - Contextual understanding of document content
  - Professional podcast format with host interactions
  - Support for multiple speakers and narrative styles
  - Customizable podcast format template
  - Real-time streaming response

- **High-Quality Audio Generation**
  - Text-to-speech conversion using GPT-4o-mini-tts model
  - Multiple voice options:
    - ash: Default voice for Host 1
    - nova: Default voice for Host 2
    - alloy, echo, fable, onyx, shimmer: Additional voice options
  - Custom voice instructions per speaker
  - Professional audio processing
  - WAV format output
  - Progress tracking during generation

- **User Interface**
  - Clean, responsive Bootstrap-based design
  - Interactive content visualization
  - Downloadable podcast files
  - Voice configuration interface
  - Custom voice instruction editor

## 🚀 Getting Started

1. Open the application in a modern web browser
2. Upload your document (JSON, PDF, DOCX, or TXT)
3. Add optional context information
4. Configure voice settings for hosts
5. Generate script from your content
6. Generate and download your podcast audio

## 📋 Supported File Formats

### JSON Format
```json
[
  {
    "messageId": "123",
    "author": "John",
    "text": "Hello, this is a message",
    "time": "2023-01-01T12:00:00Z",
    "quoteMessageId": null,
    "reactions": "👍"
  },
  {
    "messageId": "124",
    "author": "Jane",
    "text": "This is a reply",
    "time": "2023-01-01T12:05:00Z",
    "quoteMessageId": "123",
    "reactions": null
  }
]
```

### Other Formats
- **PDF**: Text extracted from PDF documents
- **DOCX**: Content from Word documents
- **TXT**: Plain text files with paragraphs separated by blank lines

## 🔧 Technical Implementation

### Frontend Technologies
- Pure JavaScript for message processing
- Bootstrap for responsive UI
- Web Audio API for audio processing
- Dynamic rendering for performance

### AI Integration
- LLM Foundry API for script generation
- GPT-4.1-mini model for content creation
- GPT-4o-mini-tts model for voice synthesis
- asyncLLM for streaming responses
- Fallback mechanisms for error handling

### Audio Processing
- Web Audio API for audio manipulation
- WAV format encoding
- Multi-channel audio support
- Batch processing for large content
- Progress tracking and visual feedback

### Voice Configuration
- TOML-based configuration file
- Custom voice instructions per speaker
- Multiple voice options
- Voice characteristic customization
- Switching between different host voices

## 🔒 Security

- Browser-based authentication with LLM Foundry
- Client-side processing
- Secure API interactions

## 🎯 Future Enhancements

- Custom podcast templates
- Multiple audio format support
- Background music support
- Voice preview functionality
- Batch processing improvements

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- LLM Foundry for AI capabilities
- Bootstrap for UI components
- Gramex for dark theme support

