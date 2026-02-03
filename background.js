// background.js - Udemy + Gemini Automation Background
console.log("Udemy Assistant Background Loaded");

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Keep empty listener for potential future expansion or other message types
    // Currently no message handling needed for pure API summarization
});
