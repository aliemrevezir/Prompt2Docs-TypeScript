import { ConversationItem, Settings, DEFAULT_SETTINGS, Metadata } from './types';
import browser from 'webextension-polyfill';
import Toastify from 'toastify-js';

let currentSettings: Settings = DEFAULT_SETTINGS;
let selectedConversations: ConversationItem[] = [];
let hasSettingsChanged = false; // Track if settings have changed

// Notification functions
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const backgroundColor = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
    }[type];

    Toastify({
        text: message,
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor,
        stopOnFocus: true,
        className: `notification-${type}`,
    }).showToast();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    const requiredElements = {
        extractBtn: document.getElementById('extractBtn') as HTMLButtonElement,
        selectAllBtn: document.getElementById('selectAllBtn') as HTMLButtonElement,
        downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
        settingsBtn: document.getElementById('settingsBtn') as HTMLButtonElement,
        closeSettingsBtn: document.getElementById('closeSettingsBtn') as HTMLButtonElement,
        settingsPanel: document.getElementById('settingsPanel') as HTMLDivElement,
        settingsOverlay: document.getElementById('settingsOverlay') as HTMLDivElement,
        status: document.getElementById('status') as HTMLDivElement,
        result: document.getElementById('result') as HTMLDivElement,
        conversations: document.getElementById('conversations') as HTMLDivElement,
        selectedCount: document.getElementById('selectedCount') as HTMLDivElement,
        container: document.querySelector('.container') as HTMLDivElement
    };

    // Validate required elements
    if (Object.values(requiredElements).some(element => !element)) {
        console.error('Required elements not found');
        return;
    }

    // Load settings
    currentSettings = await loadSettings();
    updateSettingsUI(currentSettings);

    // Event listeners
    requiredElements.extractBtn.addEventListener('click', async () => {
        try {
            requiredElements.extractBtn.disabled = true;
            showNotification('Extracting conversations...', 'info');

            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error('No active tab found');

            const response = await browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA' });
            if (!response || !Array.isArray(response)) {
                throw new Error('Invalid response from content script');
            }

            selectedConversations = response;
            displayConversations(response, requiredElements);

            showNotification(`Found ${response.length} conversation${response.length === 1 ? '' : 's'}`, 'success');
            requiredElements.selectAllBtn.disabled = false;
        } catch (error) {
            console.error('Error:', error);
            showNotification(error instanceof Error ? error.message : 'An error occurred', 'error');
        } finally {
            requiredElements.extractBtn.disabled = false;
        }
    });

    requiredElements.selectAllBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.conversation-item');
        const allSelected = Array.from(items).every(item => item.classList.contains('selected'));
        
        items.forEach(item => {
            if (allSelected) {
                item.classList.remove('selected');
            } else {
                item.classList.add('selected');
            }
        });
        
        updateSelectedCount();
    });

    requiredElements.downloadBtn.addEventListener('click', async () => {
        try {
            const selectedItems = document.querySelectorAll('.conversation-item.selected');
            const selectedIndices = Array.from(selectedItems).map(item => 
                parseInt(item.getAttribute('data-index') || '0', 10));
            
            const selectedData = selectedIndices.map(index => selectedConversations[index]);
            const formattedData = await formatConversationData(selectedData);
            
            downloadJSON(formattedData);
            
            showNotification('Conversations exported successfully', 'success');
        } catch (error) {
            console.error('Error downloading:', error);
            showNotification('Failed to export conversations', 'error');
        }
    });

    // Settings panel event listeners
    requiredElements.settingsBtn.addEventListener('click', () => {
        requiredElements.settingsPanel.classList.add('active');
        requiredElements.settingsOverlay.style.display = 'block';
        requiredElements.container.style.filter = 'blur(2px)';
        hasSettingsChanged = false; // Reset the change tracker when opening settings
    });

    requiredElements.closeSettingsBtn.addEventListener('click', async () => {
        requiredElements.settingsPanel.classList.remove('active');
        requiredElements.settingsOverlay.style.display = 'none';
        requiredElements.container.style.filter = 'none';
        
        // Only show notification if settings were actually changed
        if (hasSettingsChanged) {
            showNotification('Settings saved successfully', 'success');
            hasSettingsChanged = false; // Reset the change tracker
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && requiredElements.settingsPanel.classList.contains('active')) {
            requiredElements.closeSettingsBtn.click();
        }
    });

    // Settings change listeners
    document.querySelectorAll('.setting-item input, .setting-item select').forEach(element => {
        element.addEventListener('change', async (event) => {
            try {
                const target = event.target as HTMLInputElement | HTMLSelectElement;
                const newSettings = { ...currentSettings };
                const settingKey = target.id as keyof Settings;
                let valueChanged = false;

                if (target instanceof HTMLInputElement) {
                    if (target.type === 'checkbox') {
                        valueChanged = (newSettings[settingKey] as boolean) !== target.checked;
                        (newSettings[settingKey] as boolean) = target.checked;
                    } else {
                        valueChanged = (newSettings[settingKey] as string) !== target.value;
                        (newSettings[settingKey] as string) = target.value;
                    }
                } else if (target instanceof HTMLSelectElement) {
                    valueChanged = (newSettings[settingKey] as string) !== target.value;
                    (newSettings[settingKey] as string) = target.value;
                }

                if (valueChanged) {
                    hasSettingsChanged = true;
                    currentSettings = newSettings;
                    await saveSettings(currentSettings);
                }
            } catch (error) {
                showNotification('Failed to save settings', 'error');
            }
        });
    });
});

async function formatConversationData(conversations: ConversationItem[]): Promise<any> {
    const formattedData: any = {};
    
    // Add metadata if enabled
    if (currentSettings.includeMetadata) {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const metadata: Metadata = {
            timestamp: getCurrentDateTime(),
            url: tab.url || 'unknown',
            platform: currentSettings.platform,
            version: '1.0.1',
            exportedBy: 'Prompt2Docs'
        };
        formattedData.metadata = metadata;
    }
    
    // Add conversations
    formattedData.conversations = conversations.map(conversation => {
        const formattedConversation: any = {};
        
        if (currentSettings.includePrompts) {
            formattedConversation[currentSettings.promptLabel] = currentSettings.preserveLineBreaks ? 
                conversation.prompt : conversation.prompt.replace(/\n/g, ' ');
        }
        
        if (currentSettings.includeResponses) {
            formattedConversation[currentSettings.responseLabel] = currentSettings.preserveLineBreaks ? 
                conversation.answer : conversation.answer.replace(/\n/g, ' ');
        }
        
        if (conversation.images && conversation.images.length > 0) {
            formattedConversation.images = conversation.images;
        }

        return formattedConversation;
    });

    return formattedData;
}

function downloadJSON(data: any) {
    const jsonString = currentSettings.prettyPrintJSON ? 
        JSON.stringify(data, null, 2) : JSON.stringify(data);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const filename = currentSettings.autoGenerateFilename ? 
        `conversations_${getCurrentDateTime().replace(/[: ]/g, '_')}.json` : 
        'conversations.json';
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function displayConversations(conversations: ConversationItem[], elements: any) {
    elements.conversations.innerHTML = '';
    
    conversations.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.setAttribute('data-index', index.toString());
        
        const header = document.createElement('div');
        header.className = 'conversation-header';
        
        const number = document.createElement('span');
        number.className = 'conversation-number';
        number.textContent = `Conversation ${index + 1}`;
        
        const content = document.createElement('div');
        content.className = 'conversation-content';
        content.textContent = truncateText(item.prompt, 100);
        
        header.appendChild(number);
        div.appendChild(header);
        div.appendChild(content);
        
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            updateSelectedCount();
        });
        
        elements.conversations.appendChild(div);
    });
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function updateSelectedCount() {
    const selectedItems = document.querySelectorAll('.conversation-item.selected');
    const selectedCount = document.getElementById('selectedCount');
    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    
    if (selectedCount && downloadBtn) {
        const count = selectedItems.length;
        selectedCount.textContent = `${count} conversation${count === 1 ? '' : 's'} selected`;
        selectedCount.className = count > 0 ? 'selected-count visible' : 'selected-count';
        downloadBtn.disabled = count === 0;
    }
}

function getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Load settings from storage
async function loadSettings(): Promise<Settings> {
    try {
        const result = await browser.storage.local.get('settings');
        return result.settings || DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

// Save settings to storage
async function saveSettings(settings: Settings): Promise<void> {
    try {
        await browser.storage.local.set({ settings });
        console.log('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Update UI with current settings
function updateSettingsUI(settings: Settings): void {
    document.querySelectorAll('.setting-item input, .setting-item select').forEach(element => {
        const input = element as HTMLInputElement | HTMLSelectElement;
        const key = input.id as keyof Settings;
        
        if (input instanceof HTMLInputElement) {
            if (input.type === 'checkbox') {
                input.checked = settings[key] as boolean;
            } else {
                input.value = settings[key] as string;
            }
        } else if (input instanceof HTMLSelectElement) {
            input.value = settings[key] as string;
        }
    });
} 