// File: /background/background.js

console.log("Aivi AI Assistant - Background script loaded");

// Register the message display script for Thunderbird message contexts
try {
    await messenger.messageDisplayScripts.register({
        js: [{ file: "/content/messageDisplay.js" }],
        css: [{ file: "/content/messageDisplay.css" }]
    });
    console.log("Message display scripts registered successfully");
} catch (error) {
    console.error("Failed to register message display scripts:", error);
}

// Handle runtime messages from popup and content scripts
messenger.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);
    
    // Check if this is a command we should handle
    if (message && message.hasOwnProperty("cmd")) {
        return handleCommand(message, sender);
    }
    
    // Return false if the message was not handled by this listener
    return false;
});

// Helper function to forward commands to content script
async function forwardToContentScript(cmd, sender) {
    try {
        // Get all tabs and debug their info
        let allTabs = await messenger.tabs.query({});
        console.log("All available tabs:", allTabs.map(tab => ({
            id: tab.id,
            type: tab.type,
            url: tab.url,
            title: tab.title
        })));
        
        // Look for message display or mail tabs
        let messageTabs = allTabs.filter(tab => 
            tab.type === "messageDisplay" || 
            (tab.type === "mail" && tab.url && !tab.url.includes("about:"))
        );
        
        console.log("Message tabs found:", messageTabs.map(tab => ({
            id: tab.id,
            type: tab.type,
            url: tab.url
        })));
        
        let targetTabId = null;
        
        // First, check if the sender has a tab (e.g., from popup in message display context)
        if (sender.tab?.id) {
            targetTabId = sender.tab.id;
            console.log("Using sender tab:", targetTabId);
        } else if (messageTabs.length > 0) {
            // Use the first available message tab and inject the content script
            targetTabId = messageTabs[0].id;
            console.log("Using message tab:", targetTabId);
            
            // Try to inject the content script first
            try {
                await messenger.tabs.executeScript(targetTabId, {
                    file: "/content/messageDisplay.js"
                });
                await messenger.tabs.insertCSS(targetTabId, {
                    file: "/content/messageDisplay.css"
                });
                console.log("Content script injected successfully");
            } catch (injectError) {
                console.log("Content script might already be loaded:", injectError.message);
            }
        } else {
            // Fall back to active tab
            let activeTabs = await messenger.tabs.query({ active: true, currentWindow: true });
            if (activeTabs.length > 0) {
                targetTabId = activeTabs[0].id;
                console.log("Using active tab:", targetTabId);
                
                // Try to inject the content script
                try {
                    await messenger.tabs.executeScript(targetTabId, {
                        file: "/content/messageDisplay.js"
                    });
                    await messenger.tabs.insertCSS(targetTabId, {
                        file: "/content/messageDisplay.css"
                    });
                    console.log("Content script injected into active tab");
                } catch (injectError) {
                    console.log("Content script might already be loaded:", injectError.message);
                }
            }
        }
        
        if (!targetTabId) {
            console.error("No suitable tab found for content script");
            return { error: "No suitable tab available" };
        }
        
        console.log(`Forwarding ${cmd} to tab ${targetTabId}`);
        return await messenger.tabs.sendMessage(targetTabId, { cmd: cmd });
        
    } catch (error) {
        console.error(`Error forwarding ${cmd}:`, error);
        return { error: error.message };
    }
}

// Handle different commands from the extension
async function handleCommand(message, sender) {
    const { cmd } = message;
    
    try {
        switch (cmd) {
            case "showReplyUI":
                console.log("Showing reply UI");
                return await forwardToContentScript(message.cmd, sender);
                
            case "showSummaryUI":
                console.log("Showing summary UI");
                return await forwardToContentScript(message.cmd, sender);
                
            case "generateReply":
                console.log("Generate reply request:", message.prompt);
                // Placeholder for AI reply generation logic
                return await generateAIReply(message.prompt, sender);
                
            case "generateSummary":
                console.log("Generate summary request:", message.prompt);
                // Placeholder for AI summary generation logic
                return await generateAISummary(message.prompt, sender);
                
            default:
                console.warn("Unknown command:", cmd);
                return false;
        }
    } catch (error) {
        console.error("Error handling command:", cmd, error);
        return { error: error.message };
    }
}

// Placeholder function for AI reply generation
async function generateAIReply(prompt, sender) {
    // This is where you would integrate with your AI service
    // For now, return a placeholder response
    return {
        success: true,
        reply: "This is a placeholder AI-generated reply. Integration with AI service pending.",
        prompt: prompt
    };
}

// Placeholder function for AI summary generation
async function generateAISummary(prompt, sender) {
    // This is where you would integrate with your AI service
    // For now, return a placeholder response
    return {
        success: true,
        summary: "This is a placeholder AI-generated summary. Integration with AI service pending.",
        prompt: prompt
    };
}

// Set up menu items
messenger.menus.create({
    id: "aivi-reply-menu",
    title: "Generate AI Reply",
    contexts: ["message_list", "message_display_action"]
});

messenger.menus.create({
    id: "aivi-summary-menu", 
    title: "Generate AI Summary",
    contexts: ["message_list", "message_display_action"]
});

// Handle menu clicks
messenger.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "aivi-reply-menu") {
        await handleCommand({ cmd: "showReplyUI" }, { tab });
    } else if (info.menuItemId === "aivi-summary-menu") {
        await handleCommand({ cmd: "showSummaryUI" }, { tab });
    }
});

console.log("Aivi AI Assistant - Background script initialized");
