// File: /popup/composePopup.js

console.log("AI Assistant - Compose popup script loaded");

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Compose popup DOM loaded, initializing...");
    
    // Get references to our elements
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const presetButtons = document.querySelectorAll('.preset-button');
    
    if (!promptInput || !generateBtn) {
        console.error("Could not find required elements in compose popup");
        return;
    }
    
    let selectedPreset = null;
    
    // Add click handlers for preset buttons
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            presetButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selected class to clicked button
            button.classList.add('selected');
            
            // Store the selected preset
            selectedPreset = button.dataset.preset;
            
            // Set the prompt input to the preset text
            promptInput.value = selectedPreset;
            
            console.log("Preset selected:", selectedPreset);
        });
    });
    
    // Add click handler for generate button
    generateBtn.addEventListener('click', async () => {
        await handleGenerate();
    });
    
    // Add enter key handler for prompt input
    promptInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            await handleGenerate();
        }
    });
    
    // Handle generate button click
    async function handleGenerate() {
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            console.log("No prompt provided");
            return;
        }
        
        console.log("Generate button clicked with prompt:", prompt);
        
        try {
            // Disable button and show loading state
            generateBtn.disabled = true;
            generateBtn.classList.add('loading');
            generateBtn.textContent = 'Generating...';
            
            // Send message to background script to generate AI reply
            const response = await browser.runtime.sendMessage({
                cmd: "generateComposeReply",
                prompt: prompt
            });
            
            console.log("AI generation response:", response);
            
            if (response && response.success) {
                // Insert the generated text into the compose window
                await insertTextIntoCompose(response.reply);
                
                // Show post-insertion control panel (don't await to avoid context issues)
                showPostInsertionPanel(response.reply, prompt).catch(error => {
                    console.error("Error showing post-insertion panel:", error);
                });
                
                // Close the popup
                window.close();
            } else {
                // Show error
                console.error("AI generation failed:", response?.error);
                alert("Failed to generate reply: " + (response?.error || "Unknown error"));
            }
            
        } catch (error) {
            console.error("Error generating AI reply:", error);
            alert("Error generating reply: " + error.message);
        } finally {
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.classList.remove('loading');
            generateBtn.textContent = 'Generate';
        }
    }
    
    // Insert generated text into the compose window
    async function insertTextIntoCompose(text) {
        try {
            console.log("Inserting text into compose window:", text.substring(0, 100) + "...");
            
            // Get the current compose window
            const tabs = await messenger.tabs.query({ type: "messageCompose" });
            
            if (tabs.length === 0) {
                throw new Error("No compose window found");
            }
            
            const composeTab = tabs[0];
            console.log("Found compose tab:", composeTab.id);
            
            // Get current compose details
            const currentDetails = await messenger.compose.getComposeDetails(composeTab.id);
            console.log("Current compose details:", currentDetails);
            
            // Set the body with the generated text
            // Note: According to Thunderbird docs, the compose window will choose
            // the appropriate format (HTML or plain text) automatically
            await messenger.compose.setComposeDetails(composeTab.id, {
                body: text
            });
            
            console.log("Text inserted successfully");
            
        } catch (error) {
            console.error("Error inserting text into compose window:", error);
            throw error;
        }
    }
    
    // Show post-insertion control panel
    async function showPostInsertionPanel(generatedText, originalPrompt) {
        try {
            console.log("Showing post-insertion control panel");
            
            // Send message to show the floating panel
            await browser.runtime.sendMessage({
                cmd: "showPostInsertionPanel",
                generatedText: generatedText,
                originalPrompt: originalPrompt
            });
            
        } catch (error) {
            console.error("Error showing post-insertion panel:", error);
            // Don't throw here as the text insertion was successful
        }
    }
    
    // Focus the prompt input
    promptInput.focus();
    
    console.log("Compose popup initialized successfully");
});
