# Browser Podcast Generator

A sophisticated web application that transforms various document formats into engaging podcasts directly in your browser. Built with modern web technologies and powered by LLM Foundry's AI capabilities.

## 🌟 Features

- **Document Processing**
  - Support for multiple file formats:
    - JSON: Structured conversation data
    - PDF: Document text extraction
    - DOCX: Word document processing
    - TXT: Plain text content
  - User-provided context input
  - Intelligent content threading and organization
  - Week-based content filtering and grouping
  - Dynamic content rendering with batch processing

- **AI-Powered Script Generation**
  - Intelligent script creation using LLM Foundry's GPT-4o-mini model
  - Contextual understanding of document content
  - Professional podcast format with host interactions
  - Automatic topic segmentation and transitions
  - Support for multiple speakers and narrative styles

- **High-Quality Audio Generation**
  - Text-to-speech conversion using LLM Foundry's GPT-4o-mini-tts model
  - Multiple voice support for different speakers
  - Professional audio processing and mixing
  - WAV format output with high-quality encoding
  - Fallback audio generation for offline use

- **User Interface**
  - Clean, responsive Bootstrap-based design
  - Dark/light theme support
  - Real-time progress indicators
  - Interactive content visualization
  - Downloadable podcast files

## 🚀 Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Upload your document (JSON, PDF, DOCX, or TXT)
4. Add optional context information
5. Select the desired week or all weeks
6. Generate and download your podcast

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
- Bootstrap 5.3.3 for responsive UI
- Web Audio API for audio processing
- Dynamic rendering for performance
- Dark theme support via Gramex UI

### AI Integration
- LLM Foundry API for script generation
- GPT-4o-mini model for content creation
- GPT-4o-mini-tts model for voice synthesis
- Browser-based authentication
- Fallback mechanisms for offline use

### Audio Processing
- Web Audio API for audio manipulation
- WAV format encoding
- Multi-channel audio support
- Batch processing for large files
- Fallback tone generation

## ⚠️ Current Limitations

- Fixed podcast template structure
- WAV-only audio format support
- No cost tracking for API usage
- No intermediate file saving
- No configuration file support
- No ID3 tag support

## 🔒 Security

- Browser-based authentication with LLM Foundry
- No API keys stored in code
- Secure credential handling
- Client-side processing

## 🎯 Future Enhancements

- Custom podcast templates
- Multiple audio format support
- API usage tracking
- Intermediate file saving
- Configuration file support
- ID3 tag support
- Custom voice selection
- Background music support

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- LLM Foundry for AI capabilities
- Bootstrap for UI components
- Gramex for dark theme support

