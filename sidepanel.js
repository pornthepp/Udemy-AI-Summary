document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const apiKeyInput = document.getElementById('api-key');
    const modelNameInput = document.getElementById('model-name');
    const checkModelsBtn = document.getElementById('check-models-btn');
    const modelListDiv = document.getElementById('model-list');
    const saveKeyBtn = document.getElementById('save-key');
    const summarizeBtn = document.getElementById('summarize-btn');
    const fetchSubtitlesBtn = document.getElementById('fetch-subtitles-btn');
    const reanalyzeBtn = document.getElementById('reanalyze-btn');
    const regenerateFooterBtn = document.getElementById('regenerate-footer-btn');
    const copyBtn = document.getElementById('copy-btn');
    const fullpageBtn = document.getElementById('fullpage-btn');
    const resetBtn = document.getElementById('reset-btn');
    const retryBtn = document.getElementById('retry-btn');

    const initialView = document.getElementById('initial-view');
    const loadingView = document.getElementById('loading-view');
    const resultView = document.getElementById('result-view');
    const errorView = document.getElementById('error-view');

    const summaryContent = document.getElementById('summary-content');
    const errorMsg = document.getElementById('error-msg');
    const loadingText = document.getElementById('loading-text');

    let currentSummaryRaw = ''; // Store raw text for copying

    // Load Settings
    chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        } else {
            toggleSettings();
        }
        // Auto-fix for "latest" which is known to fail sometimes
        if (result.geminiModel && !result.geminiModel.includes('latest')) {
            modelNameInput.value = result.geminiModel;
        } else {
            modelNameInput.value = 'gemini-1.5-flash';
        }
    });

    // Event Listeners
    settingsBtn.addEventListener('click', toggleSettings);
    saveKeyBtn.addEventListener('click', saveSettings);
    checkModelsBtn.addEventListener('click', checkModels);
    summarizeBtn.addEventListener('click', startSummarization);
    fetchSubtitlesBtn.addEventListener('click', fetchSubtitles);
    reanalyzeBtn.addEventListener('click', startSummarization);
    if (regenerateFooterBtn) {
        regenerateFooterBtn.addEventListener('click', startSummarization);
    }
    copyBtn.addEventListener('click', copyToClipboard);
    fullpageBtn.addEventListener('click', openFullPage);
    resetBtn.addEventListener('click', resetView);
    retryBtn.addEventListener('click', resetView);

    function toggleSettings() {
        settingsPanel.classList.toggle('hidden');
        modelListDiv.classList.add('hidden'); // query fresh on new open
    }

    async function checkModels() {
        const key = apiKeyInput.value.trim();
        if (!key) {
            modelListDiv.textContent = 'Please enter API Key first.';
            modelListDiv.classList.remove('hidden');
            return;
        }

        modelListDiv.textContent = 'Loading models...';
        modelListDiv.classList.remove('hidden');

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Failed to fetch models');
            }
            const data = await response.json();
            const models = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''))
                .sort();

            if (models.length === 0) {
                modelListDiv.textContent = 'No generateContent models found.';
            } else {
                modelListDiv.innerHTML = '';
                models.forEach(m => {
                    const div = document.createElement('div');
                    div.style.cursor = 'pointer';
                    div.style.padding = '2px 0';
                    div.textContent = m;
                    div.title = 'Click to use this model';
                    div.onclick = () => {
                        modelNameInput.value = m;
                        modelListDiv.classList.add('hidden');
                    };
                    div.onmouseover = () => div.style.color = '#3b82f6';
                    div.onmouseout = () => div.style.color = 'var(--text-primary)';
                    modelListDiv.appendChild(div);
                });
            }
        } catch (e) {
            modelListDiv.textContent = 'Error: ' + e.message;
        }
    }

    function saveSettings() {
        const key = apiKeyInput.value.trim();
        let model = modelNameInput.value.trim() || 'gemini-1.5-flash';

        // Remove 'models/' prefix if present
        if (model.startsWith('models/')) {
            model = model.replace(/^models\//, '');
            modelNameInput.value = model;
        }

        if (key) {
            chrome.storage.sync.set({
                geminiApiKey: key,
                geminiModel: model
            }, () => {
                toggleSettings();
            });
        }
    }

    function resetView() {
        initialView.classList.remove('hidden');
        loadingView.classList.add('hidden');
        resultView.classList.add('hidden');
        errorView.classList.add('hidden');
    }

    function showError(msg) {
        initialView.classList.add('hidden');
        loadingView.classList.add('hidden');
        resultView.classList.add('hidden');
        errorView.classList.remove('hidden');
        errorMsg.textContent = msg;
    }

    function showLoading(text) {
        initialView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        resultView.classList.add('hidden');
        errorView.classList.add('hidden');
        loadingText.textContent = text;
    }

    function showResult(text) {
        initialView.classList.add('hidden');
        loadingView.classList.add('hidden');
        resultView.classList.remove('hidden');

        currentSummaryRaw = text; // Store raw markdown

        // Use markdown parser
        summaryContent.innerHTML = parseMarkdown(text);

        // Add listeners to new copy code buttons
        addCodeCopyListeners();
    }

    function parseMarkdown(text) {
        if (!text) return '';

        // 1. Extract and protect code blocks
        const codeBlocks = [];
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/```([\s\S]*?)```/g, (match, code) => {
                const id = `CODEBLOCK_${codeBlocks.length}`;
                codeBlocks.push(`<div class="code-block-container">
                    <button class="copy-code-btn">Copy</button>
                    <pre><code>${code.trim()}</code></pre>
                </div>`);
                return id;
            });

        // 2. Simple Markdown replacements
        html = html
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\s*[\*\-] (.*$)/gm, '<li>$1</li>');

        // 3. Wrap lists in <ul>
        // This is a simple regex that finds consecutive <li> tags
        html = html.replace(/(<li>.*<\/li>(?:\s*<li>.*<\/li>)*)/g, '<ul>$1</ul>');

        // 4. Handle Paragraphs and Line breaks
        html = html
            .split(/\n\n+/)
            .map(p => {
                const trimmed = p.trim();
                if (!trimmed) return '';
                // If it starts with a block tag, don't wrap in <p>
                if (/^<(h\d|ul|ol|li|pre|div)/i.test(trimmed)) return trimmed;
                return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
            })
            .join('');

        // 5. Restore code blocks
        codeBlocks.forEach((block, i) => {
            html = html.replace(`CODEBLOCK_${i}`, block);
        });

        // 6. Final cleanup: remove empty paragraphs or multiple br
        html = html
            .replace(/<p><\/p>/g, '')
            .replace(/(<br>\s*)+<\/li>/g, '</li>')
            .replace(/<\/h(\d)>\s*<br>/g, '</h$1>');

        return `<div class="markdown-body">${html}</div>`;
    }

    function addCodeCopyListeners() {
        const buttons = summaryContent.querySelectorAll('.copy-code-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.nextElementSibling.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    }

    async function startSummarization() {
        const key = apiKeyInput.value.trim();
        const model = modelNameInput.value.trim() || 'gemini-1.5-flash';

        if (!key) {
            toggleSettings();
            return;
        }

        showLoading('Accessing Udemy tab...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('udemy.com')) {
                throw new Error('Please open a Udemy course page.');
            }

            // MODIFIED: Use auto-open helper
            showLoading('Scraping transcript...');
            const transcript = await getTranscriptWithAutoOpen(tab.id);

            if (!transcript) {
                throw new Error('Could not find transcript. Please ensure the course has subtitles and I can open the Transcript panel.');
            }

            showLoading(`Generating summary with ${model}...`);
            const summary = await callGemini(key, model, transcript);

            showResult(summary);
        } catch (err) {
            console.error(err);
            showError(err.message || 'An error occurred.');
        }
    }

    async function fetchSubtitles() {
        showLoading('Accessing Udemy tab...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('udemy.com')) {
                throw new Error('Please open a Udemy course page.');
            }

            // MODIFIED: Use auto-open helper
            showLoading('Scraping transcript...');
            const transcript = await getTranscriptWithAutoOpen(tab.id);

            if (!transcript) {
                throw new Error('Could not find transcript. Please ensure the course has subtitles and I can open the Transcript panel.');
            }

            showResult(transcript);

            // Auto copy to clipboard
            await navigator.clipboard.writeText(transcript);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        } catch (err) {
            console.error(err);
            showError(err.message || 'An error occurred.');
        }
    }

    // MODIFIED: Helper function to get transcript, opening panel if needed
    async function getTranscriptWithAutoOpen(tabId) {
        // First try
        let transcript = await getTranscriptFromDOM(tabId);

        if (transcript) {
            return transcript;
        }

        // If not found, try to click the button
        showLoading('Attempting to open Transcript panel...');
        const opened = await tryOpenTranscript(tabId);

        if (opened) {
            // specific delay to allow UI to settle
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Second try
            transcript = await getTranscriptFromDOM(tabId);
        }

        return transcript;
    }

    // MODIFIED: Tries to find and click the transcript button
    async function tryOpenTranscript(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Try to find the button
                    let btn = null;

                    // Strategy 1: Search by the specific icon ID the user mentioned
                    const svgUse = document.querySelector('use[href="#icon-transcript"], use[xlink\\:href="#icon-transcript"]');
                    if (svgUse) {
                        btn = svgUse.closest('button');
                    }

                    // Strategy 2: Common data attribs
                    if (!btn) {
                        btn = document.querySelector('button[data-purpose="transcript-toggle"]');
                    }

                    // Strategy 3: Aria labels (Thai and English)
                    if (!btn) {
                        btn = document.querySelector('button[aria-label*="Transcript"], button[aria-label*="ถอดความ"]');
                    }

                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                }
            });

            if (results && results[0] && results[0].result === true) {
                return true;
            }
        } catch (err) {
            console.error('Failed to toggle transcript:', err);
        }
        return false;
    }

    function getTranscriptFromDOM(tabId) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Select all elements with data-purpose="cue-text"
                    const cues = document.querySelectorAll('[data-purpose="cue-text"]');
                    if (!cues || cues.length === 0) {
                        return null;
                    }
                    // specific to the HTML structure user provided, text is inside the span
                    return Array.from(cues)
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 0)
                        .join(' ');
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (results && results[0]) {
                    resolve(results[0].result);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async function callGemini(apiKey, model, text) {
        // Load config from json file
        let config = {};
        try {
            const response = await fetch(chrome.runtime.getURL('config.json'));
            if (response.ok) {
                config = await response.json();
            }
        } catch (e) {
            console.warn('Failed to load config.json, using defaults', e);
        }

        // Construct URL with dynamic model
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Truncate if too long (approx char count logic)
        const maxLength = 100000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '... (truncated)';
        }

        const systemPrompt = config.systemPrompt || "สรุปเนื้อหาสำคัญจากคำบรรยายนี้ให้เป็นภาษาไทยที่เข้าใจง่าย:\n" +
            "1. สรุปใจความสำคัญหลัก (Key Idea) ใน 1-2 ประโยค\n" +
            "2. อธิบายประเด็นสำคัญเป็นข้อๆ (Bullet points) 3-5 ข้อ\n" +
            "3. คำศัพท์เทคนิคที่ควรรู้ (ถ้ามี) พร้อมคำแปลและความหมายสั้นๆ\n" +
            "4. ใช้ภาษาที่เป็นกันเองและใช้ Emoji ประกอบให้น่าอ่าน";

        // Use config params if available (optional enhancement)
        // const temperature = config.temperature || 0.7;

        const payload = {
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nTranscript:\n${text}`
                }]
            }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Gemini API Error');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    function copyToClipboard() {
        const textToCopy = currentSummaryRaw || summaryContent.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
        });
    }

    function openFullPage() {
        const content = summaryContent.innerHTML;
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Summary - Full View</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #333;
            color: #f8fafc;
            font-family: 'Inter', sans-serif;
            padding: 40px;
            display: flex;
            justify-content: center;
            line-height: 1.6;
            margin: 0;
        }
        .container {
            max-width: 900px;
            width: 100%;
            background-color: #1e293b;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            border: 1px solid #334155;
        }
        /* Markdown Styling - Reused from sidepanel.css */
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
            margin-top: 24px;
            margin-bottom: 12px;
            color: #fff;
        }
        .markdown-body h1 { border-bottom: 2px solid #334155; padding-bottom: 10px; font-size: 2em; }
        .markdown-body p { margin-bottom: 16px; font-size: 1.1em; }
        .markdown-body ul { margin-bottom: 16px; padding-left: 25px; }
        .markdown-body li { margin-bottom: 6px; }
        .markdown-body code {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
        .markdown-body pre {
            background-color: #0f172a;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #334155;
            position: relative;
        }
        .code-block-container { position: relative; }
        .copy-code-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #94a3b8;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
        }
        @media print {
            body { background: white; color: black; padding: 0; }
            .container { box-shadow: none; border: none; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="markdown-body">
            ${content}
        </div>
    </div>
    <script>
        // Re-add copy listeners for the new page
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.nextElementSibling.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    const original = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = original, 2000);
                });
            });
        });
    </script>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
});

// --- Shopee Port: Batch Logic ---


