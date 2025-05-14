// Main data structures
let allMessages = [];
let messagesByWeek = {};
let currentWeek = null;
let currentScript = "";

// DOM Elements
const elements = {
    messagesFile: document.getElementById('messagesFile'),
    weekSelect: document.getElementById('weekSelect'),
    generateScript: document.getElementById('generateScript'),
    generateAudio: document.getElementById('generateAudio'),
    messagesContent: document.getElementById('messagesContent'),
    scriptContent: document.getElementById('scriptContent'),
    audioContainer: document.getElementById('audioContainer'),
    podcastAudio: document.getElementById('podcastAudio'),
    downloadLink: document.getElementById('downloadLink'),
    messageCount: document.getElementById('messageCount')
};

// Event Listeners
elements.messagesFile.addEventListener('change', handleFileUpload);
elements.weekSelect.addEventListener('change', handleWeekChange);
elements.generateScript.addEventListener('click', generatePodcastScript);
elements.generateAudio.addEventListener('click', generatePodcastAudio);

// File Upload Handler
async function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        elements.messagesContent.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        
        const text = await file.text();
        allMessages = JSON.parse(text).filter(m => m.time && m.text && m.author);
        messagesByWeek = groupByWeek(allMessages);
        populateWeekSelect(Object.keys(messagesByWeek));
        
        elements.weekSelect.disabled = false;
        elements.generateScript.disabled = false;
    } catch (error) {
        console.error('Error processing file:', error);
        elements.messagesContent.innerHTML = '<div class="alert alert-danger">Error loading messages.</div>';
    }
}

// Group messages by ISO week (Monday)
function groupByWeek(messages) {
    const groups = {};
    messages.forEach(message => {
        const dt = new Date(message.time);
        message.dt = dt;
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

// Populate week selection dropdown
function populateWeekSelect(weeks) {
    elements.weekSelect.innerHTML = '<option value="all">All Weeks</option>';
    
    weeks.sort().forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = new Date(week).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        elements.weekSelect.appendChild(option);
    });
    
    if (weeks.length > 0) {
        elements.weekSelect.value = weeks[weeks.length - 1];
        handleWeekChange();
    }
}

// Handle week selection change
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
    
    elements.messagesContent.innerHTML = '';
    if (roots.length === 0) {
        elements.messagesContent.innerHTML = '<div class="alert alert-info">No messages found.</div>';
        return;
    }
    
    renderMessagesInBatches(roots, replies);
    elements.generateScript.disabled = false;
}

// Build message threads
function buildThreads(messages) {
    const byId = {};
    messages.forEach(m => byId[m.messageId] = m);
    
    const replies = {};
    messages.forEach(m => {
        if (m.quoteMessageId && byId[m.quoteMessageId]) {
            replies[m.quoteMessageId] = replies[m.quoteMessageId] || [];
            replies[m.quoteMessageId].push(m);
        }
    });
    
    const roots = messages.filter(m => !m.quoteMessageId || !byId[m.quoteMessageId]);
    roots.sort((a, b) => a.dt - b.dt);
    
    return { replies, roots };
}

// Render messages in batches
function renderMessagesInBatches(roots, replies, startIdx = 0, batchSize = 20) {
    const fragment = document.createDocumentFragment();
    const endIdx = Math.min(startIdx + batchSize, roots.length);
    
    for (let i = startIdx; i < endIdx; i++) {
        renderMessageThreadToDOM(roots[i], replies, fragment);
    }
    
    elements.messagesContent.appendChild(fragment);
    
    if (endIdx < roots.length) {
        setTimeout(() => renderMessagesInBatches(roots, replies, endIdx, batchSize), 10);
    }
}

// Render message thread to DOM
function renderMessageThreadToDOM(message, repliesDict, container, level = 0) {
    const indent = '  '.repeat(level);
    const line = document.createElement('div');
    line.textContent = `${indent}- ${message.author}: ${message.text.replace(/\n/g, ' ')}`;
    
    if (message.reactions) {
        line.textContent += ` [${message.reactions}]`;
    }
    
    container.appendChild(line);
    
    const messageReplies = repliesDict[message.messageId] || [];
    messageReplies
        .sort((a, b) => a.dt - b.dt)
        .forEach(reply => renderMessageThreadToDOM(reply, repliesDict, container, level + 1));
}

// Generate podcast script
async function generatePodcastScript() {
    if (!currentWeek) return;
    
    try {
        const spinnerDiv = createSpinner('Generating script...');
        elements.scriptContent.parentElement.insertBefore(spinnerDiv, elements.scriptContent);
        
        const weekMessages = currentWeek === 'all' ? 
            Object.values(messagesByWeek).flat() : 
            messagesByWeek[currentWeek];
        
        const weekFormatted = currentWeek === 'all' ? 
            'All Available Weeks' : 
            new Date(currentWeek).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        
        const { replies, roots } = buildThreads(weekMessages);
        const messagesText = roots.map(root => renderMessageToText(root, replies, 0)).join('');
        
        const systemPrompt = `You are a podcast script assistant for "The Generative AI Group" on WhatsApp. This episode is ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}.

Your job is to take a threaded WhatsApp transcript formatted as nested lines like "- Author: Message" (with replies indented) and turn it into an engaging, lay-friendly dialogue between two enthusiastic hosts, Alex and Maya.

1. **Show Opener**
   Alex and Maya greet listeners together:
   Alex: "Hello and welcome to The Generative AI Group Digest ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}!"
   Maya: "I'm Maya, and I'm Alex—today we're diving into our Gen AI community chat."

2. **Topic Segments** (5-10 segments covering ALL useful information, in detail)
   For each major thread:
   - **Segment Intro** (Alex): "First up, we're talking about…"
   - **Curious Banter**: Alternate short lines (≤20 words) between Alex and Maya, asking each other light, leading questions.
   - **Excerpt**: Read a 1-2 line quote from the transcript.
   - **Insight & Analysis**: Explain why it matters in plain language, share non-obvious takeaways and practical ideas.
   - **Transition** (Maya): "Next, let's move on to…"

3. **Listener Tip**
   Maya offers a quick, actionable tip inspired by one of the discussions and asks Alex a reflective question:
   Maya: "Here's a pro tip you can try today… Alex, how would you use that?"

4. **Wrap-Up**
   Alex and Maya each share a key takeaway:
   Alex: "Remember…"
   Maya: "Don't forget…"
   Maya: "That's all for this week's digest."
   Alex: "See you next time!"

**Tone & Style**
- Mention tools and libraries by name.
- Mention author names, i.e. WHO said what.
- Warm, conversational, enthusiastic.
- Active voice; simple words; short sentences.
- Explain any technical term in one phrase.
- Focus on main ideas; treat nested replies as context.
- No music cues, jingles, or sponsor breaks.

**Formatting**: Plain text with speaker labels:

Alex: …
Maya: …
Alex: …
Maya: …`;
        
        const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: messagesText }
                ],
                temperature: 0.7
            }),
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const result = await response.json();
        currentScript = result.choices[0].message.content;
        
        spinnerDiv.remove();
        elements.scriptContent.value = currentScript;
        elements.generateAudio.disabled = false;
    } catch (error) {
        console.error('Error generating script:', error);
        const spinnerDiv = elements.scriptContent.parentElement.querySelector('.spinner-border')?.parentElement;
        if (spinnerDiv) spinnerDiv.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mb-2';
        errorDiv.textContent = `Error generating script: ${error.message}`;
        elements.scriptContent.parentElement.insertBefore(errorDiv, elements.scriptContent);
        
        generateSimpleScript();
    }
}

// Helper functions
function createSpinner(text) {
    const div = document.createElement('div');
    div.className = 'd-flex justify-content-center mb-2';
    div.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">${text}</span></div>`;
    return div;
}

function renderMessageToText(message, repliesDict, level) {
    const indent = '  '.repeat(level);
    let text = `${indent}- ${message.author}: ${message.text.replace(/\n/g, ' ')}`;
    if (message.reactions) text += ` [${message.reactions}]`;
    text += '\n';
    
    const messageReplies = repliesDict[message.messageId] || [];
    messageReplies
        .sort((a, b) => a.dt - b.dt)
        .forEach(reply => {
            text += renderMessageToText(reply, repliesDict, level + 1);
        });
    
    return text;
}

function generateSimpleScript() {
    const weekFormatted = currentWeek === 'all' ? 
        'All Available Weeks' : 
        new Date(currentWeek).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    
    currentScript = `Host: Welcome to the weekly podcast ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}.\n\n`;
    currentScript += `Host: Today we'll be discussing the key conversations from our community.\n\n`;
    
    const weekMessages = currentWeek === 'all' ? Object.values(messagesByWeek).flat() : messagesByWeek[currentWeek];
    const authors = [...new Set(weekMessages.map(m => m.author))];
    
    authors.slice(0, 3).forEach(author => {
        currentScript += `Host: Let's hear from ${author} who contributed this week.\n\n`;
        currentScript += `Guest: ${author}'s insights were valuable, especially their points about technology trends.\n\n`;
    });
    
    currentScript += `Host: That's all for this week. Thanks for listening!\n`;
    elements.scriptContent.value = currentScript;
    elements.generateAudio.disabled = false;
}

// Audio generation functions
async function generatePodcastAudio() {
    if (!currentScript) return;
    
    try {
        elements.audioContainer.innerHTML = createSpinner('Generating audio...').outerHTML;
        elements.audioContainer.style.display = 'block';
        
        const sanitizedScript = currentScript
            .replace(/\*\*/g, '')
            .replace(/^---+$/gm, 'SECTION_BREAK: Transitioning to next section')
            .replace(/\[([^\]]+)\]/g, 'SOUND_EFFECT: $1');
        
        const lines = sanitizedScript.split('\n')
            .filter(line => line.trim())
            .map(line => {
                if (line.includes(':')) {
                    const [speaker, ...textParts] = line.split(':');
                    return {
                        speaker: speaker.trim(),
                        text: textParts.join(':').trim()
                    };
                }
                return {
                    speaker: 'Narrator',
                    text: line.trim()
                };
            });
        
        if (lines.length === 0) throw new Error('No valid lines found in script');
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffers = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].text) continue;
            
            try {
                const voice = lines[i].speaker.toLowerCase().includes('alex') ? 'ash' : 'nova';
                const response = await fetch("https://llmfoundry.straive.com/openai/v1/audio/speech", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        model: "gpt-4o-mini-tts",
                        input: lines[i].text,
                        voice: voice,
                        response_format: "opus"
                    }),
                });
                
                if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
                
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers.push(audioBuffer);
            } catch (error) {
                console.error(`Error processing line ${i}:`, error);
                audioBuffers.push(createSimpleAudioBuffer(audioContext, 1.5, lines[i].speaker));
            }
        }
        
        const finalBuffer = await combineAudioBuffers(audioBuffers, audioContext);
        const audioBlob = audioBufferToWav(finalBuffer);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        elements.audioContainer.innerHTML = `
            <h3>Generated Podcast</h3>
            <audio id="podcastAudio" controls class="w-100"></audio>
            <div class="mt-3" id="downloadLinksContainer"></div>
        `;
        
        const podcastAudio = document.getElementById('podcastAudio');
        const downloadLinksContainer = document.getElementById('downloadLinksContainer');
        podcastAudio.src = audioUrl;
        
        if (currentWeek === 'all') {
            const weeks = Object.keys(messagesByWeek).sort();
            for (const week of weeks) {
                const weekDate = new Date(week);
                const weekFormatted = weekDate.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                
                const weekAudioBlob = await generateWeekAudio(messagesByWeek[week], weekFormatted);
                const weekAudioUrl = URL.createObjectURL(weekAudioBlob);
                
                downloadLinksContainer.innerHTML += `
                    <a href="${weekAudioUrl}" class="btn btn-outline-primary me-2 mb-2" download="podcast_${week}.mp3">
                        Download ${weekFormatted}
                    </a>
                `;
            }
        } else {
            downloadLinksContainer.innerHTML = `
                <a href="${audioUrl}" class="btn btn-outline-primary" download="podcast_${currentWeek}.mp3">
                    Download Podcast
                </a>
            `;
        }
    } catch (error) {
        console.error('Error generating audio:', error);
        elements.audioContainer.innerHTML = `<div class="alert alert-danger">Error generating audio: ${error.message}</div>`;
        generateFallbackAudio();
    }
}

// Audio helper functions
function createSimpleAudioBuffer(audioContext, duration, speaker) {
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    const frequencyMultiplier = speaker.toLowerCase().includes('host') ? 0.01 : 0.015;
    
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(i * frequencyMultiplier) * 0.5;
    }
    
    return buffer;
}

async function combineAudioBuffers(buffers, audioContext) {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const result = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
    const resultData = result.getChannelData(0);
    
    let offset = 0;
    buffers.forEach(buffer => {
        resultData.set(buffer.getChannelData(0), offset);
        offset += buffer.length;
    });
    
    return result;
}

function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
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
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        dataView.setInt16(offset, sample * 32767, true);
        offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(dataView, offset, string) {
    for (let i = 0; i < string.length; i++) {
        dataView.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function generateWeekAudio(messages, weekFormatted) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffers = [];
    
    const systemPrompt = `You are a podcast script assistant for "The Generative AI Group" on WhatsApp. This episode is ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}.

Your job is to take a threaded WhatsApp transcript formatted as nested lines like "- Author: Message" (with replies indented) and turn it into an engaging, lay-friendly dialogue between two enthusiastic hosts, Alex and Maya.

1. **Show Opener**
   Alex and Maya greet listeners together:
   Alex: "Hello and welcome to The Generative AI Group Digest ${currentWeek === 'all' ? 'covering all available weeks' : `for the week of ${weekFormatted}`}!"
   Maya: "I'm Maya, and I'm Alex—today we're diving into our Gen AI community chat."

2. **Topic Segments** (5–10 segments covering ALL useful information, in detail)
   For each major thread:
   - **Segment Intro** (Alex): "First up, we're talking about…"
   - **Curious Banter**: Alternate short lines (≤20 words) between Alex and Maya, asking each other light, leading questions.
   - **Excerpt**: Read a 1–2 line quote from the transcript.
   - **Insight & Analysis**: Explain why it matters in plain language, share non-obvious takeaways and practical ideas.
   - **Transition** (Maya): "Next, let's move on to…"

3. **Listener Tip**
   Maya offers a quick, actionable tip inspired by one of the discussions and asks Alex a reflective question:
   Maya: "Here's a pro tip you can try today… Alex, how would you use that?"

4. **Wrap-Up**
   Alex and Maya each share a key takeaway:
   Alex: "Remember…"
   Maya: "Don't forget…"
   Maya: "That's all for this week's digest."
   Alex: "See you next time!"

**Tone & Style**
- Mention tools and libraries by name.
- Mention author names, i.e. WHO said what.
- Warm, conversational, enthusiastic.
- Active voice; simple words; short sentences.
- Explain any technical term in one phrase.
- Focus on main ideas; treat nested replies as context.
- No music cues, jingles, or sponsor breaks.

**Formatting**: Plain text with speaker labels:

Alex: …
Maya: …
Alex: …
Maya: …`;
    
    const { replies, roots } = buildThreads(messages);
    const messagesText = roots.map(root => renderMessageToText(root, replies, 0)).join('');
    
    const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messagesText }
            ],
            temperature: 0.7
        }),
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const result = await response.json();
    const weekScript = result.choices[0].message.content;
    
    const lines = weekScript.split('\n')
        .filter(line => line.trim())
        .map(line => {
            if (line.includes(':')) {
                const [speaker, ...textParts] = line.split(':');
                return {
                    speaker: speaker.trim(),
                    text: textParts.join(':').trim()
                };
            }
            return {
                speaker: 'Narrator',
                text: line.trim()
            };
        });
    
    for (const line of lines) {
        if (!line.text) continue;
        
        try {
            const voice = line.speaker.toLowerCase().includes('alex') ? 'ash' : 'nova';
            const ttsResponse = await fetch("https://llmfoundry.straive.com/openai/v1/audio/speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    input: line.text,
                    voice: voice,
                    response_format: "opus"
                }),
            });
            
            if (!ttsResponse.ok) throw new Error(`TTS API error: ${ttsResponse.status}`);
            
            const arrayBuffer = await ttsResponse.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers.push(audioBuffer);
        } catch (error) {
            console.error('Error processing line:', error);
            audioBuffers.push(createSimpleAudioBuffer(audioContext, 1.5, line.speaker));
        }
    }
    
    const finalBuffer = await combineAudioBuffers(audioBuffers, audioContext);
    return audioBufferToWav(finalBuffer);
}

async function generateFallbackAudio() {
    if (!currentScript) return;
    
    const sanitizedScript = currentScript
        .replace(/\*\*/g, '')
        .replace(/^---+$/gm, 'SECTION_BREAK: Transitioning to next section')
        .replace(/\[(.*?)\]/g, 'SOUND_EFFECT: $1');
    
    const lines = sanitizedScript.split('\n').filter(line => line.trim());
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffers = [];
    
    for (const line of lines) {
        const [speaker, ...textParts] = line.includes(':') ? line.split(':') : ['Narrator', line];
        const text = textParts.join(':').trim();
        if (!text) continue;
        
        const duration = 1 + (text.length / 30);
        audioBuffers.push(createSimpleAudioBuffer(audioContext, duration, speaker));
    }
    
    const finalBuffer = await combineAudioBuffers(audioBuffers, audioContext);
    const audioBlob = audioBufferToWav(finalBuffer);
    const audioUrl = URL.createObjectURL(audioBlob);
    
    elements.podcastAudio.src = audioUrl;
    elements.downloadLink.href = audioUrl;
    elements.audioContainer.style.display = 'block';
}
