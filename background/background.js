// File: /background/background.js

console.log("Aivi AI Assistant - Background script loaded");

// Register the message display script for newly opened message tabs
try {
    await messenger.messageDisplayScripts.register({
        js: [{ file: "content/messageDisplay.js" }],
        css: [{ file: "content/messageDisplay.css" }]
    });
    console.log("Message display scripts registered successfully");
} catch (error) {
    console.error("Failed to register message display scripts:", error);
    // Handle the case where messagesModify permission might be missing
    if (error.message && error.message.includes("messagesModify")) {
        console.warn("messagesModify permission may be missing - some features may not work");
    }
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

// Handle different commands from the extension
async function handleCommand(message, sender) {
    const { cmd } = message;
    
    try {
        switch (cmd) {
            case "showReplyUI":
                console.log("Showing reply UI");
                // Forward the command to the content script if we have a sender tab
                if (sender.tab) {
                    return await messenger.tabs.sendMessage(sender.tab.id, {
                        cmd: "showReplyUI"
                    });
                }
                break;
                
            case "showSummaryUI":
                console.log("Showing summary UI");
                // Forward the command to the content script if we have a sender tab
                if (sender.tab) {
                    return await messenger.tabs.sendMessage(sender.tab.id, {
                        cmd: "showSummaryUI"
                    });
                }
                break;
                
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
