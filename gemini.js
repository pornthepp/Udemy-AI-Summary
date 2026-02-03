
// gemini.js - Gemini Automation Script
console.log("Gemini Automation Script Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "process_item") {
        processItem(request.data, request.mode)
            .then(() => sendResponse({ status: "completed" }))
            .catch(err => sendResponse({ status: "error", message: err.toString() }));
        return true; // Keep channel open for async response
    }
});

function dataURLtoFile(dataurl, filename) {
    try {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        console.error("Conversion failed", e);
        return null;
    }
}

function getSendButton() {
    // 1. Try ARIA Label (Standard)
    let btn = document.querySelector('button[aria-label="Send message"]');
    if (btn) return btn;

    // 2. Try by Icon (User provided)
    // <mat-icon ... data-mat-icon-name="send"></mat-icon>
    const icon = document.querySelector('mat-icon[data-mat-icon-name="send"]');
    if (icon) {
        return icon.closest('button');
    }

    // 3. Fallback: Google Symbols font ligatures match "send" text in mat-icon
    // <mat-icon>send</mat-icon> or similar
    const icons = document.querySelectorAll('mat-icon');
    for (const i of icons) {
        if (i.textContent.trim() === 'send') return i.closest('button');
    }

    return null;
}

async function processItem(item, mode) {
    console.log("Processing Item:", item.name);

    const inputSelector = 'div[contenteditable="true"]';

    // 1. Focus Input
    const input = document.querySelector(inputSelector);
    if (!input) throw new Error("Input box not found");
    input.focus();

    // 2. Paste Images
    if (item.imagesBase64 && item.imagesBase64.length > 0) {
        const dt = new DataTransfer();
        let hasImage = false;

        item.imagesBase64.forEach((b64, index) => {
            const file = dataURLtoFile(b64, `image_${index}.png`);
            if (file) {
                dt.items.add(file);
                hasImage = true;
            }
        });

        if (hasImage) {
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(pasteEvent);
            console.log("Images pasted");
            // Wait for upload preview
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // 3. Type Text (Prompt) - SKIPPED per user request
    // User wants to send only images.

    // Capture existing images to avoid duplicates
    // We use src as unique identifier. Filter for significant images.
    const getExistingImages = () => {
        return new Set(
            Array.from(document.querySelectorAll('img'))
                .filter(img => img.naturalWidth > 200 && img.naturalHeight > 200)
                .map(img => img.src)
        );
    };
    const existingSrcs = getExistingImages();

    // 4. Click Send (Single Attempt)
    // Wait for button availability
    let sendBtn = null;
    for (let attempt = 0; attempt < 30; attempt++) { // 15 seconds max wait for button
        sendBtn = getSendButton();
        if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') break;
        await new Promise(r => setTimeout(r, 500));
    }

    if (!sendBtn) {
        throw new Error("Send button unavailable (timeout).");
    }

    console.log("Clicking Send...");
    sendBtn.click();

    // Verify Start (Wait for UI to react)
    // We wait up to 15 seconds for the Stop button to appear or Send button to vanish
    // This confirms the click worked.
    let generationStarted = false;
    for (let check = 0; check < 30; check++) { // 15 seconds check
        await new Promise(r => setTimeout(r, 500));

        const currentSendBtn = getSendButton();
        const stopBtn = document.querySelector('button[aria-label="Stop generating"]') ||
            document.querySelector('mat-icon[data-mat-icon-name="stop"]')?.closest('button');

        // Success Criteria: Stop button appears OR Send button goes away/disabled
        if (stopBtn || !currentSendBtn || (currentSendBtn && currentSendBtn.disabled)) {
            generationStarted = true;
            console.log("UI confirmed generation started.");
            break;
        }
    }

    // We don't throw here if generationStarted is false, because waitForGeneration below has its own Phase 1 verify.
    // carrying on...

    // 5. Wait for Generation "Stop" -> "Send" cycle
    await waitForGeneration();

    // 6. Process New Images - REMOVED TELEGRAM SENDING
    console.log("Item processing cycle complete.");
}

async function waitForGeneration() {
    console.log("Waiting for generation to START...");

    // Phase 1: Confirm generation started
    let generationStarted = false;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));

        const stopBtn = document.querySelector('button[aria-label="Stop generating"]') ||
            document.querySelector('mat-icon[data-mat-icon-name="stop"]')?.closest('button');

        if (stopBtn) {
            generationStarted = true;
            console.log("Generation started (Stop button appeared).");
            break;
        }

        // Also check if Send button is disabled or gone
        const sendBtn = getSendButton();
        if (!sendBtn || (sendBtn && sendBtn.disabled)) {
            generationStarted = true;
            console.log("Generation started (Send button disabled/gone).");
            break;
        }
    }

    if (!generationStarted) {
        console.warn("Could not detect generation start. Continuing...");
    }

    console.log("Waiting for generation to FINISH (Stop -> Send)...");

    // Phase 2: Wait for Stop to vanish and Send to appear
    return new Promise(resolve => {
        const interval = setInterval(() => {
            // 1. Check for STOP button
            const stopBtn = document.querySelector('button[aria-label="Stop generating"]') ||
                document.querySelector('mat-icon[data-mat-icon-name="stop"]')?.closest('button');

            if (stopBtn) {
                // Still generating
                return;
            }

            // 2. Check for SEND Icon (Specific User Request)
            const sendIcon = document.querySelector('mat-icon[data-mat-icon-name="send"]') ||
                document.querySelector('mat-icon[fonticon="send"]');

            if (sendIcon) {
                const sendBtn = sendIcon.closest('button');
                if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
                    // Ready!
                    clearInterval(interval);
                    console.log("Generation Complete (Strict Send icon detected).");
                    resolve();
                }
            }
        }, 1000);
    });
}
