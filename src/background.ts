import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Enable communication between popup and content script
browser.runtime.onMessage.addListener((message, sender) => {
    console.log('Background received message:', message);
    return true;
}); 