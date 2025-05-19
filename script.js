// Library URLs
const LIBRARIES = {
    PDF_JS: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    PDF_WORKER: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    MAMMOTH: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
};

// Voice config and data structures
const VOICE_CONFIG = {ash:'',nova:'',alloy:'',echo:'',fable:'',onyx:'',shimmer:''};
let PODCAST_FORMAT = '', allMessages = [], messagesByWeek = {}, currentWeek = null, currentScript = "", 
    activeVoice = 'alex', host1Name = 'Host 1', host2Name = 'Host 2';

// DOM Elements - simplified using an object literal
const elements = {};
['messagesFile','weekSelect','generateScript','generateAudio','messagesContent','scriptContent',
 'audioContainer','podcastAudio','downloadLink','messageCount','userContext','alexVoiceSelect',
 'mayaVoiceSelect','editAlexBtn','editMayaBtn','activeVoiceLabel','voiceInstructions']
 .forEach(id => elements[id] = document.getElementById(id));

// Event Listeners
elements.messagesFile.addEventListener('change', handleFileUpload);
elements.weekSelect.addEventListener('change', handleWeekChange);
elements.generateScript.addEventListener('click', generatePodcastScript);
elements.generateAudio.addEventListener('click', generatePodcastAudio);
elements.alexVoiceSelect.addEventListener('change', handleAlexVoiceChange);
elements.mayaVoiceSelect.addEventListener('change', handleMayaVoiceChange);
elements.editAlexBtn.addEventListener('click', () => setActiveVoice('alex'));
elements.editMayaBtn.addEventListener('click', () => setActiveVoice('maya'));

// Load scripts dynamically - simplified
function loadScript(url, callback) {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) return callback();
    
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    script.onerror = error => {
        console.error(`Failed to load script: ${url}`, error);
        elements.messagesContent.innerHTML = `<div class="alert alert-danger">Failed to load required library: ${url.split('/').pop()}</div>`;
    };
    document.head.appendChild(script);
}

// Preload PDF library
function preloadLibraries() {
    if (typeof pdfjsLib === 'undefined') {
        loadScript(LIBRARIES.PDF_JS, () => {
            if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = LIBRARIES.PDF_WORKER;
        });
    }
}

// Create spinner helper
const createSpinner = text => `<div class="d-flex justify-content-center mb-2">
    <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">${text}</span>
    </div>
</div>`;

// Format date helper
const formatDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// File Upload Handler - simplified
async function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        elements.messagesContent.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        
        const fileType = file.name.split('.').pop().toLowerCase();
        let content;
        
        try {
            content = await processFile(file, fileType);
            if (!content || content.length === 0) throw new Error("No content could be extracted from the file");
            processContent(content);
        } catch (processingError) {
            console.error('Error processing file content:', processingError);
            elements.messagesContent.innerHTML = `<div class="alert alert-danger"><strong>Error processing ${fileType.toUpperCase()} file:</strong> ${processingError.message}</div>`;
        }
    } catch (error) {
        console.error('Fatal error handling file:', error);
        elements.messagesContent.innerHTML = `<div class="alert alert-danger">Error loading content from file: ${error.message}</div>`;
    }
}

// Process different file types with a unified approach - simplified
async function processFile(file, fileType) {
    switch (fileType) {
        case 'json':
            const text = await file.text();
            return JSON.parse(text).filter(m => m.time && m.text && m.author);
            
        case 'pdf':
            return new Promise((resolve, reject) => {
                if (typeof pdfjsLib === 'undefined') {
                    loadScript(LIBRARIES.PDF_JS, () => {
                        if (typeof pdfjsLib === 'undefined') return reject(new Error("PDF.js library failed to load"));
                        pdfjsLib.GlobalWorkerOptions.workerSrc = LIBRARIES.PDF_WORKER;
                        setTimeout(() => extractPdfContent(file, resolve, reject), 100);
                    });
                } else {
                    extractPdfContent(file, resolve, reject);
                }
            });
            
        case 'docx':
            return extractDocxContent(file);
            
        case 'txt':
        default:
            return extractTxtContent(file);
    }
}

// Extract content from PDF
function extractPdfContent(file, resolve, reject) {
    const reader = new FileReader();
    
    reader.onload = async function(event) {
        try {
            const pdf = await pdfjsLib.getDocument({
                data: new Uint8Array(event.target.result),
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
                cMapPacked: true,
            }).promise;
            
            let allText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                let lastY, text = '';
                
                for (const item of textContent.items) {
                    if (lastY !== item.transform[5] && text.length > 0) text += '\n';
                    else if (text.length > 0 && !text.endsWith(' ')) text += ' ';
                    text += item.str;
                    lastY = item.transform[5];
                }
                
                allText += text + '\n\n';
            }
            
            // Process text into paragraphs
            const paragraphs = allText.split(/\n\s*\n/).filter(p => p.trim());
            const messages = paragraphs.length > 0 ? 
                paragraphs.map((paragraph, index) => ({
                    messageId: 'pdf-para-' + index,
                    author: 'Document',
                    text: paragraph.trim(),
                    time: new Date().toISOString()
                })).filter(m => m.text.length > 5) : 
                [{
                    messageId: 'pdf-empty-1',
                    author: 'Document',
                    text: "The PDF appears to be empty or contains only images. Please add context in the 'Additional Context' field.",
                    time: new Date().toISOString()
                }];
            
            resolve(messages);
        } catch (error) {
            console.error("Error extracting PDF content:", error);
            reject(error);
        }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
}

// Extract content from DOCX
function extractDocxContent(file) {
    return new Promise((resolve, reject) => {
        const processDocx = (arrayBuffer) => {
            mammoth.extractRawText({ arrayBuffer })
                .then(result => {
                    const paragraphs = result.value.split(/\n\s*\n/);
                    resolve(paragraphs
                        .filter(para => para.trim())
                        .map((paragraph, index) => ({
                            messageId: 'docx-' + index,
                            author: 'Document Author',
                            text: paragraph.trim(),
                            time: new Date().toISOString()
                        }))
                    );
                })
                .catch(reject);
        };

        if (typeof mammoth === 'undefined') {
            loadScript(LIBRARIES.MAMMOTH, () => {
                if (typeof mammoth === 'undefined') return reject(new Error("Mammoth library failed to load"));
                const reader = new FileReader();
                reader.onload = e => processDocx(e.target.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        } else {
            const reader = new FileReader();
            reader.onload = e => processDocx(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        }
    });
}

// Extract content from TXT
async function extractTxtContent(file) {
    const textContent = await file.text();
    const lines = textContent.split(/\n/);
    
    const messages = [];
    let currentParagraph = '';
    
    lines.forEach((line) => {
        if (line.trim()) {
            currentParagraph += line + ' ';
        } else if (currentParagraph) {
            messages.push({
                messageId: 'txt-' + messages.length,
                author: 'Document Author',
                text: currentParagraph.trim(),
                time: new Date().toISOString()
            });
            currentParagraph = '';
        }
    });
    
    if (currentParagraph) {
        messages.push({
            messageId: 'txt-' + messages.length,
            author: 'Document Author',
            text: currentParagraph.trim(),
            time: new Date().toISOString()
        });
    }
    
    return messages;
}

// Process content and prepare UI - simplified
function processContent(content) {
    allMessages = content;
    
    // Add user context if provided
    if (elements.userContext?.value.trim()) {
        allMessages.unshift({
            messageId: 'context-1',
            author: 'User',
            text: elements.userContext.value.trim(),
            time: new Date().toISOString()
        });
    }
    
    // Add time attribute as Date object
    allMessages.forEach(message => {
        message.dt = typeof message.time === 'string' ? new Date(message.time) : new Date();
        if (!message.time) message.time = message.dt.toISOString();
    });
    
    messagesByWeek = groupByWeek(allMessages);
    populateWeekSelect(Object.keys(messagesByWeek));
    
    elements.weekSelect.disabled = false;
    elements.generateScript.disabled = false;
}

// Group messages by week - simplified
function groupByWeek(messages) {
    const groups = {};
    messages.forEach(message => {
        const dt = message.dt;
        const dayOfWeek = dt.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];
        groups[weekKey] = groups[weekKey] || [];
        groups[weekKey].push(message);
    });
    return groups;
}

// UI helpers
function populateWeekSelect(weeks) {
    elements.weekSelect.innerHTML = '<option value="all">All Weeks</option>';
    
    weeks.sort().forEach(week => {
        elements.weekSelect.innerHTML += `<option value="${week}">${formatDate(new Date(week))}</option>`;
    });
    
    if (weeks.length > 0) {
        elements.weekSelect.value = weeks[weeks.length - 1];
        handleWeekChange();
    }
}

function handleWeekChange() {
    currentWeek = elements.weekSelect.value;
    if (!currentWeek) {
        elements.messagesContent.innerHTML = '';
        elements.messageCount.innerHTML = '0';
        return;
    }
    
    const weekMessages = currentWeek === 'all' ? 
        Object.values(messagesByWeek).flat() : 
        messagesByWeek[currentWeek];
    
    elements.messageCount.innerHTML = weekMessages.length.toString();
    const { replies, roots } = buildThreads(weekMessages);
    
    elements.messagesContent.innerHTML = roots.length === 0 ? 
        '<div class="alert alert-info">No messages found.</div>' : '';
    
    if (roots.length > 0) {
        renderMessagesInBatches(roots, replies);
        elements.generateScript.disabled = false;
    }
}

// Build threads from messages - simplified
function buildThreads(messages) {
    const byId = Object.fromEntries(messages.map(m => [m.messageId, m]));
    
    const replies = {};
    messages.forEach(m => {
        if (m.quoteMessageId && byId[m.quoteMessageId]) {
            replies[m.quoteMessageId] = replies[m.quoteMessageId] || [];
            replies[m.quoteMessageId].push(m);
        }
    });
    
    const roots = messages
        .filter(m => !m.quoteMessageId || !byId[m.quoteMessageId])
        .sort((a, b) => a.dt - b.dt);
    
    return { replies, roots };
}

// Render messages efficiently - simplified using innerHTML
function renderMessagesInBatches(roots, replies, startIdx = 0, batchSize = 20) {
    const endIdx = Math.min(startIdx + batchSize, roots.length);
    let html = '';
    
    for (let i = startIdx; i < endIdx; i++) {
        html += renderMessageThreadToHTML(roots[i], replies);
    }
    
    // Append to existing content
    elements.messagesContent.innerHTML += html;
    
    if (endIdx < roots.length) {
        setTimeout(() => renderMessagesInBatches(roots, replies, endIdx, batchSize), 10);
    }
}

// Render message thread to HTML string
function renderMessageThreadToHTML(message, repliesDict, level = 0) {
    const indent = '  '.repeat(level);
    let html = `<div>${indent}- ${message.author}: ${message.text.replace(/\n/g, ' ')}`;
    
    if (message.reactions) {
        html += ` [${message.reactions}]`;
    }
    
    html += '</div>';
    
    (repliesDict[message.messageId] || [])
        .sort((a, b) => a.dt - b.dt)
        .forEach(reply => {
            html += renderMessageThreadToHTML(reply, repliesDict, level + 1);
        });
    
    return html;
}

// Helper to render message to plain text (for API calls)
function renderMessageToText(message, repliesDict, level = 0) {
    const indent = '  '.repeat(level);
    let text = `${indent}- ${message.author}: ${message.text.replace(/\n/g, ' ')}`;
    if (message.reactions) text += ` [${message.reactions}]`;
    text += '\n';
    
    (repliesDict[message.messageId] || [])
        .sort((a, b) => a.dt - b.dt)
        .forEach(reply => {
            text += renderMessageToText(reply, repliesDict, level + 1);
        });
    
    return text;
}

// Script generation
function getSystemPrompt(weekFormatted) {
    const alexVoice = elements.alexVoiceSelect.value || 'ash';
    const mayaVoice = elements.mayaVoiceSelect.value || 'nova';
    
    // Combine voice instructions
    const voiceInstructions = [
        VOICE_CONFIG[alexVoice] ? `\n\n${host1Name}'s voice characteristics:\n${VOICE_CONFIG[alexVoice]}` : '',
        VOICE_CONFIG[mayaVoice] ? `\n\n${host2Name}'s voice characteristics:\n${VOICE_CONFIG[mayaVoice]}` : '',
        activeVoice === 'alex' && elements.voiceInstructions.value ? 
            `\n\nCustom voice instructions for ${host1Name}:\n${elements.voiceInstructions.value}` : 
            activeVoice === 'maya' && elements.voiceInstructions.value ? 
            `\n\nCustom voice instructions for ${host2Name}:\n${elements.voiceInstructions.value}` : ''
    ].join('');

    return PODCAST_FORMAT.replace(/\$WEEK/g, currentWeek === 'all' ? 'all available weeks' : weekFormatted) + voiceInstructions;
}

// API helper
async function callOpenAI(endpoint, data) {
    const response = await fetch(`https://llmfoundry.straive.com/openai/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
}

async function generatePodcastScript() {
    if (!currentWeek) return;
    
    // Clear previous errors and add spinner
    elements.scriptContent.parentElement.querySelectorAll('.spinner-container, .alert').forEach(el => el.remove());
    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'spinner-container mb-2';
    spinnerContainer.innerHTML = createSpinner('Generating script...');
    elements.scriptContent.parentElement.insertBefore(spinnerContainer, elements.scriptContent);
    
    try {
        const weekMessages = currentWeek === 'all' ? Object.values(messagesByWeek).flat() : messagesByWeek[currentWeek];
        const weekFormatted = currentWeek === 'all' ? 'All Available Weeks' : formatDate(new Date(currentWeek));
        
        const { replies, roots } = buildThreads(weekMessages);
        const messagesText = roots.map(root => renderMessageToText(root, replies, 0)).join('');
        
        try {
            // Call API to generate script
            const result = await callOpenAI('chat/completions', {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: getSystemPrompt(weekFormatted) },
                    { role: "user", content: messagesText }
                ],
                temperature: 0.7
            });
            
            currentScript = result.choices[0].message.content;
        } catch (error) {
            console.error('Error with API:', error);
            currentScript = generateSimpleScript(weekFormatted, weekMessages);
        }
        
        elements.scriptContent.value = currentScript;
        elements.generateAudio.disabled = false;
    } catch (error) {
        console.error('Error generating script:', error);
        elements.scriptContent.parentElement.insertAdjacentHTML('beforebegin', 
            `<div class="alert alert-danger mb-2">Error generating script: ${error.message}</div>`);
        generateSimpleScript();
    } finally {
        spinnerContainer.remove();
    }
}

function generateSimpleScript(weekFormatted = null, weekMessages = null) {
    weekFormatted = weekFormatted || (currentWeek === 'all' ? 'All Available Weeks' : formatDate(new Date(currentWeek)));
    weekMessages = weekMessages || (currentWeek === 'all' ? Object.values(messagesByWeek).flat() : messagesByWeek[currentWeek]);
    
    // Create a simple script template with top 3 authors
    const authors = [...new Set(weekMessages.map(m => m.author))];
    let script = `Host: Welcome to the weekly podcast ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}.\n\n` +
                 `Host: Today we'll be discussing the key conversations from our community.\n\n`;
    
    authors.slice(0, 3).forEach(author => {
        script += `Host: Let's hear from ${author} who contributed this week.\n\n` +
                 `Guest: ${author}'s insights were valuable, especially their points about technology trends.\n\n`;
    });
    
    script += `Host: That's all for this week. Thanks for listening!\n`;
    elements.scriptContent.value = script;
    elements.generateAudio.disabled = false;
    
    return script;
}

// Audio processing - simplified and combined functions
async function generatePodcastAudio() {
    if (!currentScript) return;
    
    elements.audioContainer.innerHTML = createSpinner('Generating audio...');
    elements.audioContainer.style.display = 'block';
    
    try {
        // Sanitize script for audio processing
        const sanitizedScript = currentScript
            .replace(/\*\*/g, '')
            .replace(/^---+$/gm, 'SECTION_BREAK: Transitioning to next section')
            .replace(/\[([^\]]+)\]/g, 'SOUND_EFFECT: $1');
        
        // Split into lines by speaker
        const lines = sanitizedScript
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                if (line.includes(':')) {
                    const [speaker, ...textParts] = line.split(':');
                    return { speaker: speaker.trim(), text: textParts.join(':').trim() };
                }
                return { speaker: 'Narrator', text: line.trim() };
            })
            .filter(line => line.text);
        
        if (lines.length === 0) throw new Error('No valid lines found in script');
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBlob = await generateAudioFromLines(lines, audioContext);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        updateAudioPlayer(audioUrl);
        
        // Process individual weeks if needed
        if (currentWeek === 'all') {
            const weekProgressElement = document.createElement('div');
            weekProgressElement.className = 'progress-indicator mt-3 mb-3';
            weekProgressElement.innerHTML = createSpinner('Processing individual weeks...');
            document.getElementById('downloadLinksContainer').appendChild(weekProgressElement);
            
            await generateWeekAudios();
            weekProgressElement.remove();
        }
    } catch (error) {
        console.error('Error generating audio:', error);
        elements.audioContainer.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error generating audio:</strong> ${error.message}
                <hr>
                <p>Please try again or check your browser console for more details.</p>
            </div>`;
    }
}

async function generateAudioFromLines(lines, audioContext) {
    const audioBuffers = [], errors = [];
    
    for (const line of lines) {
        try {
            // Determine which voice to use based on the speaker
            const isHost1 = line.speaker.toLowerCase().includes('alex') || 
                        line.speaker.toLowerCase().includes(host1Name.toLowerCase());
            
            const voice = isHost1 ? elements.alexVoiceSelect.value || 'ash' : elements.mayaVoiceSelect.value || 'nova';
            const useCustomInstructions = isHost1 ? activeVoice === 'alex' : activeVoice === 'maya';
            const instructions = useCustomInstructions ? 
                elements.voiceInstructions.value || VOICE_CONFIG[voice] || '' : 
                VOICE_CONFIG[voice] || '';
            
            // Call the API
            const response = await fetch("https://llmfoundry.straive.com/openai/v1/audio/speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    input: line.text,
                    voice: voice,
                    voice_instructions: instructions.length > 0 ? instructions : undefined,
                    response_format: "opus"
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                throw new Error(`TTS API error (${response.status}): ${errorText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers.push(audioBuffer);
        } catch (error) {
            console.error(`Error processing line: "${line.text.substring(0, 30)}..."`, error);
            errors.push(`Failed to process "${line.speaker}" line: ${error.message}`);
            // Throw error if too many lines fail
            if (errors.length > Math.min(3, Math.floor(lines.length / 3))) {
                throw new Error(`Too many errors generating audio. Details: ${errors.join("; ")}`);
            }
        }
    }
    
    if (audioBuffers.length === 0) throw new Error("Failed to generate any audio from the script");
    
    // Combine audio buffers
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const result = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
    const resultData = result.getChannelData(0);
    
    let offset = 0;
    audioBuffers.forEach(buffer => {
        resultData.set(buffer.getChannelData(0), offset);
        offset += buffer.length;
    });
    
    return createWavBlob(result);
}

// Create WAV blob from audio buffer - simplified
function createWavBlob(buffer) {
    const numChannels = 1, sampleRate = buffer.sampleRate, bitDepth = 16;
    const dataLength = buffer.length * numChannels * (bitDepth / 8);
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    
    const arrayBuffer = new ArrayBuffer(totalLength);
    const dataView = new DataView(arrayBuffer);
    
    // WAV header
    writeString(dataView, 0, 'RIFF');
    dataView.setUint32(4, totalLength - 8, true);
    writeString(dataView, 8, 'WAVE');
    writeString(dataView, 12, 'fmt ');
    dataView.setUint32(16, 16, true);
    dataView.setUint16(20, 1, true);
    dataView.setUint16(22, numChannels, true);
    dataView.setUint32(24, sampleRate, true);
    dataView.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    dataView.setUint16(32, numChannels * (bitDepth / 8), true);
    dataView.setUint16(34, bitDepth, true);
    writeString(dataView, 36, 'data');
    dataView.setUint32(40, dataLength, true);
    
    // Audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
        dataView.setInt16(offset, Math.max(-1, Math.min(1, channelData[i])) * 32767, true);
        offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(dataView, offset, string) {
    for (let i = 0; i < string.length; i++) {
        dataView.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Update audio player with download links
function updateAudioPlayer(audioUrl) {
    elements.audioContainer.innerHTML = `
        <h3>Generated Podcast</h3>
        <audio id="podcastAudio" controls class="w-100"></audio>
        <div class="mt-3" id="downloadLinksContainer">
            <a href="${audioUrl}" class="btn btn-outline-primary" download="podcast_${currentWeek}.mp3">
                Download Podcast
            </a>
        </div>
    `;
    
    // Set the audio source directly to ensure it's properly loaded
    const podcastAudio = document.getElementById('podcastAudio');
    podcastAudio.src = audioUrl;
    podcastAudio.load(); // Force the audio to load
}

// Generate individual week audio files
async function generateWeekAudios() {
    if (currentWeek !== 'all') return;
    
    const downloadLinksContainer = document.getElementById('downloadLinksContainer');
    const weeks = Object.keys(messagesByWeek).sort();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create status indicators for all weeks
    const weekStatusElements = {};
    weeks.forEach(week => {
        const weekFormatted = formatDate(new Date(week));
        const statusElement = document.createElement('div');
        statusElement.className = 'week-status me-2 mb-2 d-inline-block';
        statusElement.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Processing ${weekFormatted}...</span>
            </div>
            <span class="ms-1">${weekFormatted}</span>
        `;
        downloadLinksContainer.appendChild(statusElement);
        weekStatusElements[week] = statusElement;
    });
    
    for (const week of weeks) {
        try {
            const weekFormatted = formatDate(new Date(week));
            const weekMessages = messagesByWeek[week];
            const { replies, roots } = buildThreads(weekMessages);
            const messagesText = roots.map(root => renderMessageToText(root, replies, 0)).join('');
            
            // Generate script for this week
            let weekScript;
            try {
                const result = await callOpenAI('chat/completions', {
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: getSystemPrompt(weekFormatted) },
                        { role: "user", content: messagesText }
                    ],
                    temperature: 0.7
                });
                weekScript = result.choices[0].message.content;
            } catch (error) {
                console.error(`Error with API for week ${week}:`, error);
                weekScript = generateSimpleScript(weekFormatted, weekMessages);
            }
            
            // Process script for audio
            const sanitizedScript = weekScript
                .replace(/\*\*/g, '')
                .replace(/^---+$/gm, 'SECTION_BREAK: Transitioning to next section')
                .replace(/\[([^\]]+)\]/g, 'SOUND_EFFECT: $1');
            
            const lines = sanitizedScript
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    if (line.includes(':')) {
                        const [speaker, ...textParts] = line.split(':');
                        return { speaker: speaker.trim(), text: textParts.join(':').trim() };
                    }
                    return { speaker: 'Narrator', text: line.trim() };
                })
                .filter(line => line.text);
            
            // Generate audio
            const audioBlob = await generateAudioFromLines(lines, audioContext);
            const weekAudioUrl = URL.createObjectURL(audioBlob);
            
            // Update UI with download link
            if (weekStatusElements[week]) {
                weekStatusElements[week].outerHTML = `
                    <a href="${weekAudioUrl}" class="btn btn-outline-primary me-2 mb-2" download="podcast_${week}.mp3">
                        Download ${weekFormatted}
                    </a>
                `;
            }
        } catch (error) {
            console.error(`Error generating audio for week ${week}:`, error);
            // Show error in UI
            if (weekStatusElements[week]) {
                weekStatusElements[week].outerHTML = `
                    <div class="alert alert-warning me-2 mb-2 d-inline-block">
                        Failed to generate audio for ${formatDate(new Date(week))}
                    </div>
                `;
            }
        }
    }
}

// Load voice config from config.toml
async function loadVoiceConfig() {
    try {
        const response = await fetch('config.toml');
        const toml = await response.text();
        
        // Extract podcast format and voices
        const podcastMatch = toml.match(/podcast\s*=\s*'''([\s\S]*?)'''/);
        if (podcastMatch && podcastMatch[1]) PODCAST_FORMAT = podcastMatch[1].trim();
        
        // Extract all voice configs
        const voiceMatches = toml.match(/\[(.*?)\]\s*voice\s*=\s*"(.*?)"\s*instructions\s*=\s*'''([\s\S]*?)'''/g);
        if (!voiceMatches) return;
        
        const voices = voiceMatches.map(section => {
            const nameMatch = section.match(/\[(.*?)\]/);
            const voiceMatch = section.match(/voice\s*=\s*"(.*?)"/);
            const instructionsMatch = section.match(/instructions\s*=\s*'''([\s\S]*?)'''/);
            
            if (nameMatch && voiceMatch && instructionsMatch) {
                const name = nameMatch[1];
                const voiceId = voiceMatch[1];
                const instructions = instructionsMatch[1].trim();
                
                VOICE_CONFIG[voiceId] = instructions;
                return { name, voiceId, instructions };
            }
            return null;
        }).filter(Boolean);
        
        populateVoiceDropdowns(voices);
        updateVoiceInstructions();
        elements.voiceInstructions.placeholder = "Custom voice instructions for the selected voice";
    } catch (error) {
        console.error('Error loading voice config:', error);
    }
}

// Populate voice dropdowns from config
function populateVoiceDropdowns(voices) {
    if (!voices || voices.length === 0) return;
    
    // Clear existing options
    elements.alexVoiceSelect.innerHTML = elements.mayaVoiceSelect.innerHTML = '';
    
    // Define host configurations
    const hosts = [
        { id: 'alex', defaultVoice: 'ash', defaultName: 'Host 1', voiceName: 'Alex', selectElement: elements.alexVoiceSelect, btnElement: elements.editAlexBtn },
        { id: 'maya', defaultVoice: 'nova', defaultName: 'Host 2', voiceName: 'Maya', selectElement: elements.mayaVoiceSelect, btnElement: elements.editMayaBtn }
    ];
    
    // Process each host
    hosts.forEach(host => {
        const voiceData = voices.find(v => v.name === host.voiceName);
        const defaultVoice = voiceData?.voiceId || host.defaultVoice;
        const hostName = voiceData?.name || host.defaultName;
        
        // Set global variable based on id
        if (host.id === 'alex') host1Name = hostName;
        else if (host.id === 'maya') host2Name = hostName;
        
        // Update button text
        host.btnElement.textContent = hostName;
        
        // Populate dropdown
        voices.forEach(voice => {
            host.selectElement.innerHTML += `
                <option value="${voice.voiceId}" ${voice.voiceId === defaultVoice ? 'selected' : ''}>
                    ${voice.voiceId}${voice.name === host.voiceName ? ' (default)' : ''}
                </option>
            `;
        });
    });
    
    updateActiveVoiceLabel();
}

// Voice UI update functions combined
function updateVoiceInstructions() {
    const voiceId = activeVoice === 'alex' ? elements.alexVoiceSelect.value : elements.mayaVoiceSelect.value;
    elements.voiceInstructions.value = VOICE_CONFIG[voiceId] || '';
    updateActiveVoiceLabel();
}

function handleAlexVoiceChange() {
    host1Name = getNameFromVoiceId(elements.alexVoiceSelect.value) || 'Host 1';
    elements.editAlexBtn.textContent = host1Name;
    if (activeVoice === 'alex') updateVoiceInstructions();
    updateActiveVoiceLabel();
}

function handleMayaVoiceChange() {
    host2Name = getNameFromVoiceId(elements.mayaVoiceSelect.value) || 'Host 2';
    elements.editMayaBtn.textContent = host2Name;
    if (activeVoice === 'maya') updateVoiceInstructions();
    updateActiveVoiceLabel();
}

function getNameFromVoiceId(voiceId) {
    const option = Array.from(elements.alexVoiceSelect.options)
        .find(opt => opt.value === voiceId && opt.textContent.includes('(default)'));
    return option ? option.textContent.split(' (')[0] : voiceId;
}

function setActiveVoice(voice) {
    activeVoice = voice;
    
    // Update buttons
    elements.editAlexBtn.classList.toggle('active', voice === 'alex');
    elements.editMayaBtn.classList.toggle('active', voice === 'maya');
    
    // Update label
    const hostName = voice === 'alex' ? host1Name : host2Name;
    const voiceId = voice === 'alex' ? elements.alexVoiceSelect.value : elements.mayaVoiceSelect.value;
    elements.activeVoiceLabel.textContent = `Editing: ${hostName} (${voiceId})`;
    
    updateVoiceInstructions();
}

function updateActiveVoiceLabel() {
    const hostName = activeVoice === 'alex' ? host1Name : host2Name;
    const voiceId = activeVoice === 'alex' ? elements.alexVoiceSelect.value : elements.mayaVoiceSelect.value;
    elements.activeVoiceLabel.textContent = `Editing: ${hostName} (${voiceId})`;
}

// Initialize
preloadLibraries();
loadVoiceConfig();
