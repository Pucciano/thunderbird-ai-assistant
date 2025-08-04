// File: /background/background.js

console.log("Aivi AI Assistant - Background script loaded");

// Register the message display script for Thunderbird message contexts
messenger.messageDisplayScripts.register({
    js: [{ file: "/content/messageDisplay.js" }],
    css: [{ file: "/content/messageDisplay.css" }]
}).then(() => {
    console.log("Message display scripts registered successfully");
}).catch(error => {
    console.error("Failed to register message display scripts:", error);
});

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
                
            case "getMessageContent":
                console.log("Getting message content for content script");
                return await getMessageContentForTab(sender);
                
            case "generateReply":
                console.log("Generate reply request:", message.prompt);
                console.log("Email content:", message.emailContent);
                // Pass both user prompt and email content to AI reply generation
                return await generateAIReply(message.prompt, message.emailContent, sender);
                
            case "generateSummary":
                console.log("Generate summary request:", message.prompt);
                console.log("Email content:", message.emailContent);
                // Pass both user prompt and email content to AI summary generation
                return await generateAISummary(message.prompt, message.emailContent, sender);
                
            default:
                console.warn("Unknown command:", cmd);
                return false;
        }
    } catch (error) {
        console.error("Error handling command:", cmd, error);
        return { error: error.message };
    }
}

// Enhanced function for AI reply generation
async function generateAIReply(userPrompt, emailContent, sender) {
    try {
        console.log("=== AI Reply Generation ===");
        console.log("User prompt:", userPrompt);
        console.log("Email content received:", emailContent);
        
        // Construct the full context for AI processing
        const fullContext = constructAIContext(userPrompt, emailContent, 'reply');
        
        // This is where you would integrate with your AI service
        // For now, return a more detailed placeholder response showing the content was received
        return {
            success: true,
            reply: `AI Reply (Placeholder):\n\nBased on the email content:\nSubject: ${emailContent?.headers?.Subject || 'N/A'}\nFrom: ${emailContent?.headers?.From || 'N/A'}\n\nEmail excerpt: "${emailContent?.textContent?.substring(0, 200) || 'No content'}..."\n\nUser instructions: "${userPrompt || 'None'}"\n\n[This would be replaced with actual AI-generated reply]`,
            prompt: userPrompt,
            emailContent: emailContent,
            contextLength: fullContext.length
        };
    } catch (error) {
        console.error("Error in generateAIReply:", error);
        return {
            success: false,
            error: error.message,
            prompt: userPrompt
        };
    }
}

// Enhanced function for AI summary generation
async function generateAISummary(userPrompt, emailContent, sender) {
    try {
        console.log("=== AI Summary Generation ===");
        console.log("User prompt:", userPrompt);
        console.log("Email content received:", emailContent);
        
        // Construct the full context for AI processing
        const fullContext = constructAIContext(userPrompt, emailContent, 'summary');
        
        // This is where you would integrate with your AI service
        // For now, return a more detailed placeholder response showing the content was received
        return {
            success: true,
            summary: `AI Summary (Placeholder):\n\nEmail Details:\n- Subject: ${emailContent?.headers?.Subject || 'N/A'}\n- From: ${emailContent?.headers?.From || 'N/A'}\n- Date: ${emailContent?.headers?.Date || 'N/A'}\n\nContent Summary: "${emailContent?.textContent?.substring(0, 300) || 'No content available'}..."\n\nUser focus: "${userPrompt || 'General summary'}"\n\n[This would be replaced with actual AI-generated summary]`,
            prompt: userPrompt,
            emailContent: emailContent,
            contextLength: fullContext.length
        };
    } catch (error) {
        console.error("Error in generateAISummary:", error);
        return {
            success: false,
            error: error.message,
            prompt: userPrompt
        };
    }
}

// Function to get message content using Thunderbird WebExtension APIs
async function getMessageContentForTab(sender) {
    try {
        console.log("Getting message content for tab:", sender.tab?.id);
        
        let tabId = sender.tab?.id;
        if (!tabId) {
            // Try to find a suitable tab
            const tabs = await messenger.tabs.query({});
            const messageTabs = tabs.filter(tab => 
                tab.type === "messageDisplay" || 
                (tab.type === "mail" && tab.url && !tab.url.includes("about:"))
            );
            
            if (messageTabs.length > 0) {
                tabId = messageTabs[0].id;
            } else {
                throw new Error("No suitable message tab found");
            }
        }
        
        // Get the currently displayed message
        const messageHeader = await messenger.messageDisplay.getDisplayedMessage(tabId);
        if (!messageHeader) {
            throw new Error("No message currently displayed");
        }
        
        console.log("Retrieved message header:", {
            id: messageHeader.id,
            subject: messageHeader.subject,
            author: messageHeader.author,
            date: messageHeader.date
        });
        
        // Get the full message details
        const fullMessage = await messenger.messages.getFull(messageHeader.id);
        
        // Extract text content from the message parts
        let textContent = '';
        let htmlContent = '';
        
        if (fullMessage.parts) {
            for (const part of fullMessage.parts) {
                if (part.contentType === 'text/plain' && part.body) {
                    textContent += part.body + '\n';
                } else if (part.contentType === 'text/html' && part.body) {
                    htmlContent += part.body + '\n';
                }
            }
        }
        
        return {
            textContent: textContent.trim(),
            htmlContent: htmlContent.trim(),
            headers: {
                Subject: messageHeader.subject,
                From: messageHeader.author,
                To: messageHeader.recipients?.join(', ') || '',
                Date: new Date(messageHeader.date).toISOString(),
                ...fullMessage.headers
            },
            messageId: messageHeader.id,
            extractedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error("Error getting message content via API:", error);
        return {
            error: error.message,
            textContent: '',
            htmlContent: '',
            headers: {},
            extractedAt: new Date().toISOString()
        };
    }
}

// Helper function to construct AI context from user prompt and email content
function constructAIContext(userPrompt, emailContent, mode) {
    const context = [];
    
    // Add email headers if available
    if (emailContent?.headers && Object.keys(emailContent.headers).length > 0) {
        context.push("=== EMAIL HEADERS ===");
        for (const [key, value] of Object.entries(emailContent.headers)) {
            context.push(`${key}: ${value}`);
        }
        context.push("");
    }
    
    // Add email content
    if (emailContent?.textContent) {
        context.push("=== EMAIL CONTENT ===");
        context.push(emailContent.textContent);
        context.push("");
    }
    
    // Add user instructions
    if (userPrompt && userPrompt.trim()) {
        context.push("=== USER INSTRUCTIONS ===");
        context.push(userPrompt.trim());
        context.push("");
    }
    
    // Add mode-specific instructions
    context.push("=== TASK ===");
    if (mode === 'reply') {
        context.push("Generate an appropriate email reply based on the above email content and user instructions.");
    } else if (mode === 'summary') {
        context.push("Generate a concise summary of the above email content, focusing on the key points mentioned in user instructions (if any).");
    }
    
    return context.join('\n');
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
