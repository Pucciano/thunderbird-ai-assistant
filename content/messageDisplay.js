// File: /content/messageDisplay.js

console.log("AI Assistant - Message display script loaded");

// Global reference to the current panel
let currentPanel = null;

// Listen for messages from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    
    if (message && message.hasOwnProperty("cmd")) {
        handleCommand(message);
    }
    
    return false;
});

// Handle commands from background script
function handleCommand(message) {
    const { cmd } = message;
    
    switch (cmd) {
        case "showReplyUI":
            showAIPanel("reply");
            break;
        case "showSummaryUI":
            showAIPanel("summary");
            break;
        default:
            console.warn("Unknown command in content script:", cmd);
    }
}

// Show the AI assistant panel
function showAIPanel(mode) {
    console.log("Showing AI panel for mode:", mode);
    
    // Remove existing panel if present
    if (currentPanel) {
        currentPanel.remove();
        currentPanel = null;
    }
    
    // Create the panel container
    const panel = document.createElement('div');
    panel.className = 'llm-helper-panel';
    panel.id = `llm-helper-panel-${mode}`;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'llm-helper-panel-header';
    
    const title = document.createElement('h3');
    title.className = 'llm-helper-panel-title';
    title.textContent = mode === 'reply' ? 'Generate AI Reply' : 'Generate AI Summary';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'llm-helper-panel-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', () => {
        panel.remove();
        currentPanel = null;
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'llm-helper-panel-content';
    
    // Create textarea for prompt input
    const textarea = document.createElement('textarea');
    textarea.className = 'llm-helper-textarea';
    textarea.id = `llm-helper-textarea-${mode}`;
    textarea.placeholder = mode === 'reply' 
        ? 'Enter additional context or instructions for your reply...'
        : 'Enter specific aspects you want summarized...';
    
    // Create button group
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'llm-helper-button-group';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'llm-helper-cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        panel.remove();
        currentPanel = null;
    });
    
    const generateButton = document.createElement('button');
    generateButton.className = 'llm-helper-generate-button';
    generateButton.id = `llm-helper-generate-${mode}`;
    generateButton.textContent = 'Generate';
    generateButton.addEventListener('click', () => handleGenerate(mode, textarea, panel));
    
    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(generateButton);
    
    // Assemble the content
    content.appendChild(textarea);
    content.appendChild(buttonGroup);
    
    // Assemble the panel
    panel.appendChild(header);
    panel.appendChild(content);
    
    // Add to document
    document.body.appendChild(panel);
    currentPanel = panel;
    
    // Focus the textarea
    textarea.focus();
    
    console.log("AI panel created and added to document");
}

// Handle generate button click
async function handleGenerate(mode, textarea, panel) {
    console.log("Generate button clicked for mode:", mode);
    
    const prompt = textarea.value.trim();
    const generateButton = panel.querySelector(`#llm-helper-generate-${mode}`);
    const content = panel.querySelector('.llm-helper-panel-content');
    
    // Disable the generate button and show loading state
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    
    // Remove any existing result area
    const existingResult = panel.querySelector('.llm-helper-result-area');
    if (existingResult) {
        existingResult.remove();
    }
    
    // Create result area
    const resultArea = document.createElement('div');
    resultArea.className = 'llm-helper-result-area llm-helper-loading';
    resultArea.textContent = 'Generating AI response...';
    content.appendChild(resultArea);
    
    try {
        // Send message to background script to generate AI response
        const command = mode === 'reply' ? 'generateReply' : 'generateSummary';
        const response = await browser.runtime.sendMessage({
            cmd: command,
            prompt: prompt
        });
        
        console.log("AI generation response:", response);
        
        // Update result area with response
        resultArea.className = 'llm-helper-result-area';
        
        if (response && response.success) {
            const result = mode === 'reply' ? response.reply : response.summary;
            resultArea.textContent = result;
        } else {
            resultArea.className = 'llm-helper-result-area llm-helper-error';
            resultArea.textContent = response && response.error 
                ? `Error: ${response.error}`
                : 'Failed to generate AI response. Please try again.';
        }
        
    } catch (error) {
        console.error("Error generating AI response:", error);
        resultArea.className = 'llm-helper-result-area llm-helper-error';
        resultArea.textContent = `Error: ${error.message}`;
    } finally {
        // Re-enable the generate button
        generateButton.disabled = false;
        generateButton.textContent = 'Generate';
    }
}

// Close panel when clicking outside of it
document.addEventListener('click', (event) => {
    if (currentPanel && !currentPanel.contains(event.target)) {
        // Check if the click is on the popup or any extension UI
        const isExtensionUI = event.target.closest('[id^="llm-helper-"]') || 
                             event.target.closest('.llm-helper-panel');
        
        if (!isExtensionUI) {
            currentPanel.remove();
            currentPanel = null;
        }
    }
});

// Close panel on escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentPanel) {
        currentPanel.remove();
        currentPanel = null;
    }
});

console.log("Aivi AI Assistant - Message display script initialized");
