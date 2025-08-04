// File: /popup/popup.js

console.log("Aivi AI Assistant - Popup script loaded");

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Popup DOM loaded, initializing...");
    
    // Get references to our buttons
    const replyButton = document.getElementById('llm-helper-reply-btn');
    const summaryButton = document.getElementById('llm-helper-summary-btn');
    
    if (!replyButton || !summaryButton) {
        console.error("Could not find required buttons in popup");
        return;
    }
    
    // Add click handlers for the buttons
    replyButton.addEventListener('click', async () => {
        console.log("Reply button clicked");
        try {
            // Disable button while processing
            replyButton.disabled = true;
            replyButton.textContent = "Loading...";
            
            // Send message to background script to show reply UI
            const response = await browser.runtime.sendMessage({
                cmd: "showReplyUI"
            });
            
            console.log("Reply UI command response:", response);
            
            // Close popup after sending command
            window.close();
            
        } catch (error) {
            console.error("Error sending showReplyUI command:", error);
            replyButton.disabled = false;
            replyButton.textContent = "Generate Reply";
        }
    });
    
    summaryButton.addEventListener('click', async () => {
        console.log("Summary button clicked");
        try {
            // Disable button while processing
            summaryButton.disabled = true;
            summaryButton.textContent = "Loading...";
            
            // Send message to background script to show summary UI
            const response = await browser.runtime.sendMessage({
                cmd: "showSummaryUI"
            });
            
            console.log("Summary UI command response:", response);
            
            // Close popup after sending command
            window.close();
            
        } catch (error) {
            console.error("Error sending showSummaryUI command:", error);
            summaryButton.disabled = false;
            summaryButton.textContent = "Generate Summary";
        }
    });
    
    console.log("Popup initialized successfully");
});
