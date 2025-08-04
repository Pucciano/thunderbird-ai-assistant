// File: /options/options.js

console.log("Aivi AI Assistant - Options script loaded");

// Default settings
const DEFAULT_SETTINGS = {
    apiKey: '',
    aiModel: 'gpt-3.5-turbo',
    replyTone: 'professional',
    summaryLength: 'medium',
    privacyMode: true,
    dataRetention: false
};

// DOM elements
let form, statusDiv;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Options page DOM loaded, initializing...");
    
    form = document.getElementById('llm-helper-options-form');
    statusDiv = document.getElementById('llm-helper-status');
    
    if (!form || !statusDiv) {
        console.error("Required elements not found");
        return;
    }
    
    // Load saved settings
    await loadSettings();
    
    // Add event listeners
    form.addEventListener('submit', handleSave);
    document.getElementById('llm-helper-reset-button').addEventListener('click', handleReset);
    
    console.log("Options page initialized successfully");
});

// Load settings from storage
async function loadSettings() {
    try {
        console.log("Loading settings from storage...");
        
        const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
        console.log("Loaded settings:", stored);
        
        // Populate form fields
        document.getElementById('llm-helper-api-key').value = stored.apiKey || '';
        document.getElementById('llm-helper-ai-model').value = stored.aiModel || DEFAULT_SETTINGS.aiModel;
        document.getElementById('llm-helper-reply-tone').value = stored.replyTone || DEFAULT_SETTINGS.replyTone;
        document.getElementById('llm-helper-summary-length').value = stored.summaryLength || DEFAULT_SETTINGS.summaryLength;
        document.getElementById('llm-helper-privacy-mode').checked = stored.privacyMode !== undefined ? stored.privacyMode : DEFAULT_SETTINGS.privacyMode;
        document.getElementById('llm-helper-data-retention').checked = stored.dataRetention !== undefined ? stored.dataRetention : DEFAULT_SETTINGS.dataRetention;
        
    } catch (error) {
        console.error("Error loading settings:", error);
        showStatus("Error loading settings", "error");
    }
}

// Save settings to storage
async function saveSettings(settings) {
    try {
        console.log("Saving settings:", settings);
        
        await browser.storage.local.set(settings);
        console.log("Settings saved successfully");
        return true;
        
    } catch (error) {
        console.error("Error saving settings:", error);
        return false;
    }
}

// Handle form submission
async function handleSave(event) {
    event.preventDefault();
    console.log("Save button clicked");
    
    const saveButton = form.querySelector('.llm-helper-save-button');
    const originalText = saveButton.textContent;
    
    try {
        // Disable save button
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        // Collect form data
        const formData = new FormData(form);
        const settings = {
            apiKey: formData.get('apiKey') || '',
            aiModel: formData.get('aiModel') || DEFAULT_SETTINGS.aiModel,
            replyTone: formData.get('replyTone') || DEFAULT_SETTINGS.replyTone,
            summaryLength: formData.get('summaryLength') || DEFAULT_SETTINGS.summaryLength,
            privacyMode: document.getElementById('llm-helper-privacy-mode').checked,
            dataRetention: document.getElementById('llm-helper-data-retention').checked
        };
        
        console.log("Form data collected:", settings);
        
        // Save settings
        const success = await saveSettings(settings);
        
        if (success) {
            showStatus("Settings saved successfully!", "success");
        } else {
            showStatus("Failed to save settings. Please try again.", "error");
        }
        
    } catch (error) {
        console.error("Error in handleSave:", error);
        showStatus("An error occurred while saving settings", "error");
    } finally {
        // Re-enable save button
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

// Handle reset button
async function handleReset() {
    console.log("Reset button clicked");
    
    if (confirm("Are you sure you want to reset all settings to their default values?")) {
        try {
            // Clear stored settings
            await browser.storage.local.clear();
            
            // Reload default settings
            await loadSettings();
            
            showStatus("Settings reset to defaults", "success");
            
        } catch (error) {
            console.error("Error resetting settings:", error);
            showStatus("Failed to reset settings", "error");
        }
    }
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `llm-helper-status ${type}`;
    
    // Hide status after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Listen for storage changes from other parts of the extension
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        console.log("Storage changed, reloading settings:", changes);
        loadSettings();
    }
});
