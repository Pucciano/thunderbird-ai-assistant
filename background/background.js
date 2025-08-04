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
                
            case "generateComposeReply":
                console.log("Generate compose reply request:", message.prompt);
                // Generate AI reply for compose window
                return await generateComposeReply(message.prompt, sender);
                
            case "showPostInsertionPanel":
                console.log("Show post-insertion panel request");
                return await showPostInsertionPanel(message.generatedText, message.originalPrompt, sender);
                
            case "handlePostInsertionAction":
                console.log("Handle post-insertion action:", message.action);
                return await handlePostInsertionAction(message.action, message.generatedText, message.originalPrompt, sender);
                
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
        // This is a placeholder response that would be replaced with actual AI-generated reply
        // TODO: replace with actual AI generation logic
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
        // This is a placeholder response that would be replaced with actual AI-generated summary
        //TODO: replace with actual AI generation logic
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
// This will be used to provide context for AI generation
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

// Function to generate AI reply for compose window
async function generateComposeReply(prompt, sender) {
    try {
        console.log("=== AI Compose Reply Generation ===");
        console.log("User prompt:", prompt);
        
        // For compose window, we generate based on the prompt alone
        // This is different from the message display reply which uses email content
        const aiPrompt = `Generate an email based on this request: "${prompt}"
        
Please write a professional email that addresses the request. Make it clear, concise, and appropriate for business communication.`;
        
        // This is where the intergration with the AI service will live
        // For now, return a placeholder response that incorporates the prompt
        // TODO: Replace with actual AI generation logic
        return {
            success: true,
            reply: `Subject: ${getSubjectFromPrompt(prompt)}

Dear [Recipient],

${generateEmailBodyFromPrompt(prompt)}

Best regards,
[Your name]`,
            prompt: prompt
        };
    } catch (error) {
        console.error("Error in generateComposeReply:", error);
        return {
            success: false,
            error: error.message,
            prompt: prompt
        };
    }
}

// Helper function to generate subject from prompt
// This is a simplified version for development purposes
// Later, this will be replaced with the LLM-API integration
// TODO: Replace with actual AI generation logic
function getSubjectFromPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('short and friendly')) {
        return "Quick Update";
    } else if (lowerPrompt.includes('request more information')) {
        return "Information Request";
    } else if (lowerPrompt.includes('provide an update')) {
        return "Status Update";
    } else if (lowerPrompt.includes('make an announcement')) {
        return "Important Announcement";
    } else {
        return "Re: Your Request";
    }
}

// Helper function to generate email body from prompt
// This is a simplified version for development purposes
// Later, this will be replaced with the LLM-API integration
// TODO: Replace with actual AI generation logic
function generateEmailBodyFromPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('short and friendly')) {
        return `I hope this message finds you well.

I wanted to reach out with a quick update. Everything is progressing smoothly on our end, and I'll keep you posted on any developments.

Please let me know if you have any questions or if there's anything else I can help with.`;
    } else if (lowerPrompt.includes('request more information')) {
        return `I hope you're doing well.

I'm writing to request some additional information regarding [topic]. Could you please provide more details about:

- [Specific item 1]
- [Specific item 2]
- [Any other relevant details]

This information would be very helpful for moving forward. Please let me know if you need any clarification on what I'm looking for.

Thank you for your time and assistance.`;
    } else if (lowerPrompt.includes('provide an update')) {
        return `I wanted to provide you with an update on [project/topic].

Here's where things currently stand:

• [Progress item 1]
• [Progress item 2]
• [Next steps]

The project is on track, and we expect [timeline/outcome]. I'll continue to keep you updated as we make progress.

Please don't hesitate to reach out if you have any questions or concerns.`;
    } else if (lowerPrompt.includes('make an announcement')) {
        return `I hope this message reaches you well.

I'm pleased to announce [announcement details]. This is an exciting development that will [impact/benefit].

Key details:
- [Detail 1]
- [Detail 2]
- [Timeline or next steps]

I'm happy to answer any questions you might have about this announcement.`;
    } else {
        return `Thank you for your message.

Based on your request: "${prompt}"

[AI would generate an appropriate response here based on the specific context and requirements you've outlined.]

Please let me know if you need any additional information or if there's anything else I can help you with.`;
    }
}

// Function to show post-insertion control panel
// This is called after inserting AI-generated text into the compose window
// This is a simplified version for development purposes
// Later, this will be replaced with the LLM-API integration
// TODO: Replace with actual AI generation logic
async function showPostInsertionPanel(generatedText, originalPrompt, sender) {
    try {
        console.log("Showing post-insertion panel");
        
        // Get the compose tab
        const tabs = await messenger.tabs.query({ type: "messageCompose" });
        if (tabs.length === 0) {
            throw new Error("No compose window found");
        }
        
        const composeTab = tabs[0];
        
        // Inject the floating panel script into the compose window
        try {
            const escapedGeneratedText = generatedText.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
            const escapedOriginalPrompt = originalPrompt.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
            
            await messenger.tabs.executeScript(composeTab.id, {
                code: `
                    (function() {
                        if (document.getElementById('ai-post-insertion-panel')) {
                            document.getElementById('ai-post-insertion-panel').remove();
                        }
                        
                        const panel = document.createElement('div');
                        panel.id = 'ai-post-insertion-panel';
                        panel.innerHTML = '<div class="ai-panel-header">AI Text Inserted</div>' +
                            '<div class="ai-panel-section">' +
                                '<button class="ai-panel-button ai-keep-button" data-action="keep">✔ keep text</button>' +
                                '<button class="ai-panel-button ai-discard-button" data-action="discard">🗑 discard text</button>' +
                            '</div>' +
                            '<hr class="ai-panel-separator">' +
                            '<div class="ai-panel-section">' +
                                '<div class="ai-panel-section-header">Change content</div>' +
                                '<button class="ai-panel-button ai-regenerate-button" data-action="regenerate">⟳ run generation again</button>' +
                                '<button class="ai-panel-button ai-shorten-button" data-action="shorten">↘︎ shorten</button>' +
                                '<button class="ai-panel-button ai-lengthen-button" data-action="lengthen">↗︎ lengthen</button>' +
                            '</div>' +
                            '<button class="ai-panel-close">×</button>';
                        
                        if (!document.getElementById('ai-panel-styles')) {
                            const styles = document.createElement('style');
                            styles.id = 'ai-panel-styles';
                            styles.textContent = '#ai-post-insertion-panel { position: fixed; top: 20px; right: 20px; width: 250px; background: white; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; padding: 16px; }' +
                                '.ai-panel-header { font-weight: 600; margin-bottom: 12px; color: #1f2937; }' +
                                '.ai-panel-section { margin-bottom: 12px; }' +
                                '.ai-panel-section-header { font-weight: 500; margin-bottom: 8px; color: #374151; font-size: 13px; }' +
                                '.ai-panel-button { display: block; width: 100%; padding: 8px 12px; margin-bottom: 6px; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; color: #374151; font-size: 13px; cursor: pointer; text-align: left; font-family: inherit; }' +
                                '.ai-panel-button:hover { background: #f3f4f6; }' +
                                '.ai-keep-button { background: #dcfce7; border-color: #22c55e; color: #15803d; }' +
                                '.ai-discard-button { background: #fef2f2; border-color: #ef4444; color: #dc2626; }' +
                                '.ai-panel-separator { border: none; height: 1px; background: #e5e7eb; margin: 12px 0; }' +
                                '.ai-panel-close { position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 16px; cursor: pointer; color: #6b7280; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }' +
                                '.ai-panel-close:hover { color: #374151; background: #f3f4f6; border-radius: 4px; }';
                            document.head.appendChild(styles);
                        }
                        
                        // Close button handler
                        panel.querySelector('.ai-panel-close').addEventListener('click', function() {
                            panel.remove();
                        });
                        
                        // Action button handlers
                        const generatedText = '${escapedGeneratedText}';
                        const originalPrompt = '${escapedOriginalPrompt}';
                        
                        panel.querySelectorAll('.ai-panel-button').forEach(function(button) {
                            button.addEventListener('click', function(e) {
                                const action = e.target.dataset.action;
                                
                                browser.runtime.sendMessage({
                                    cmd: 'handlePostInsertionAction',
                                    action: action,
                                    generatedText: generatedText,
                                    originalPrompt: originalPrompt
                                }).catch(function(error) {
                                    console.error('Error sending post-insertion action:', error);
                                });
                                
                                if (action === 'keep' || action === 'discard') {
                                    panel.remove();
                                }
                            });
                        });
                        
                        // Auto-remove panel after 30 seconds
                        setTimeout(function() {
                            if (document.getElementById('ai-post-insertion-panel')) {
                                panel.remove();
                            }
                        }, 30000);
                        
                        document.body.appendChild(panel);
                    })();
                `
            });
            
            console.log("Post-insertion panel injected successfully");
            return { success: true };
            
        } catch (injectError) {
            console.error("Error injecting post-insertion panel:", injectError);
            return { success: false, error: injectError.message };
        }
        
    } catch (error) {
        console.error("Error showing post-insertion panel:", error);
        return { success: false, error: error.message };
    }
}

// Function to handle post-insertion actions
async function handlePostInsertionAction(action, generatedText, originalPrompt, sender) {
    try {
        console.log("Handling post-insertion action:", action);
        
        const tabs = await messenger.tabs.query({ type: "messageCompose" });
        if (tabs.length === 0) {
            throw new Error("No compose window found");
        }
        
        const composeTab = tabs[0];
        
        switch (action) {
            case 'keep':
                // Text is already in the compose window, just acknowledge
                console.log("User chose to keep the generated text");
                return { success: true, message: "Text kept" };
                
            case 'discard':
                // Clear the compose window body
                await messenger.compose.setComposeDetails(composeTab.id, { body: '' });
                console.log("Generated text discarded");
                return { success: true, message: "Text discarded" };
                
            case 'regenerate':
                // Generate new text with the same prompt
                const newResponse = await generateComposeReply(originalPrompt, sender);
                if (newResponse.success) {
                    await messenger.compose.setComposeDetails(composeTab.id, { body: newResponse.reply });
                    console.log("Text regenerated");
                    return { success: true, message: "Text regenerated" };
                } else {
                    return { success: false, error: "Failed to regenerate text" };
                }
                
            case 'shorten':
                // Generate a shorter version
                const shortenResponse = await generateComposeReply(originalPrompt + " (make it shorter and more concise)", sender);
                if (shortenResponse.success) {
                    await messenger.compose.setComposeDetails(composeTab.id, { body: shortenResponse.reply });
                    console.log("Text shortened");
                    return { success: true, message: "Text shortened" };
                } else {
                    return { success: false, error: "Failed to shorten text" };
                }
                
            case 'lengthen':
                // Generate a longer version
                const lengthenResponse = await generateComposeReply(originalPrompt + " (make it more detailed and comprehensive)", sender);
                if (lengthenResponse.success) {
                    await messenger.compose.setComposeDetails(composeTab.id, { body: lengthenResponse.reply });
                    console.log("Text lengthened");
                    return { success: true, message: "Text lengthened" };
                } else {
                    return { success: false, error: "Failed to lengthen text" };
                }
                
            default:
                console.warn("Unknown post-insertion action:", action);
                return { success: false, error: "Unknown action" };
        }
        
    } catch (error) {
        console.error("Error handling post-insertion action:", error);
        return { success: false, error: error.message };
    }
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
