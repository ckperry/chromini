// popup/popup.js

// Get the API key from storage
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey);
    });
  });
}

let chatHistory = [];
let currentPageContent = null;

function clearChat() {
  chatHistory = [];
  currentPageContent = null;
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.innerHTML = '';
}

function addMessageToChat(message, isUser = false) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
  
  try {
    if (isUser) {
      messageDiv.textContent = message;
    } else {
      // First try to render as markdown, fallback to plain text if it fails
      try {
        const markedOptions = {
          breaks: true,
          gfm: true,
          sanitize: false // Changed to false to allow more HTML
        };
        
        // Check if marked is available
        if (typeof marked !== 'undefined') {
          messageDiv.innerHTML = marked.parse(message, markedOptions);
        } else {
          console.warn('Marked library not loaded, falling back to plain text');
          messageDiv.textContent = message;
        }
      } catch (markdownError) {
        console.error('Markdown parsing failed:', markdownError);
        messageDiv.textContent = message;
      }
    }
  } catch (error) {
    console.error('Error adding message to chat:', error);
    messageDiv.textContent = message; // Fallback to plain text
  }
  
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  chatHistory.push({ role: isUser ? 'user' : 'assistant', content: message });
}

async function summarizePage(tab) {
  clearChat();
  
  const apiKey = await getApiKey();
  if (!apiKey) {
    addMessageToChat("Please set your Gemini API key in the extension options.");
    return;
  }

  try {
    // For Google Docs, use screenshot approach
    if (tab.url.includes('docs.google.com')) {
      const screenshotUrl = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
      addMessageToChat("Analyzing this Google Doc...");
      
      chrome.runtime.sendMessage({
        action: "promptGemini",
        prompt: "Please summarize what you see in this Google Doc.",
        apiKey: apiKey,
        screenshot: screenshotUrl
      });
      return;
    }

    // For regular pages, use content script
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      addMessageToChat("Cannot access this page. Try a regular webpage instead.");
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content.js']
      });
    } catch (e) {
      console.error('Content script injection error:', e);
    }
    
    const pageContent = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    // Store the page content
    currentPageContent = pageContent;

    addMessageToChat("Analyzing this page...");
    
    chrome.runtime.sendMessage({
      action: "promptGemini",
      prompt: `Provide a concise 2-3 sentence summary of this page's main points:

Title: ${pageContent.title}
URL: ${pageContent.url}
Content: ${pageContent.bodyText.substring(0, 2000)}...

Focus on the most important information. Be brief but informative.`,
      apiKey: apiKey
    });
  } catch (error) {
    addMessageToChat(`Error: ${error.message}`);
    console.error('Error:', error);
  }
}

// Listen for tab changes to automatically summarize new pages
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Add a small delay to avoid the "tab dragging" error
  setTimeout(async () => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      summarizePage(tab);
    } catch (error) {
      console.error('Error getting tab:', error);
      // Try again after a longer delay if first attempt fails
      setTimeout(async () => {
        try {
          const tab = await chrome.tabs.get(activeInfo.tabId);
          summarizePage(tab);
        } catch (retryError) {
          console.error('Error getting tab on retry:', retryError);
          addMessageToChat("Error: Unable to access tab information. Please try refreshing the page.");
        }
      }, 500);
    }
  }, 100);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    summarizePage(tab);
  }
});

// Initialize the chat when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  summarizePage(tab);
});

// Initialize UI elements
const promptButton = document.getElementById('promptButton');
const promptTextarea = document.getElementById('promptText');

// Handle user input
promptButton.addEventListener('click', async () => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      addMessageToChat("Please set your Gemini API key in the extension options.");
      return;
    }

    const userInput = promptTextarea.value.trim();
    if (!userInput) return;

    addMessageToChat(userInput, true);
    promptTextarea.value = '';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // For Google Docs, use screenshot approach
    if (tab.url.includes('docs.google.com')) {
      const screenshotUrl = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
      chrome.runtime.sendMessage({
        action: "promptGemini",
        prompt: userInput,
        apiKey: apiKey,
        screenshot: screenshotUrl,
        chatHistory: chatHistory
      });
      return;
    }

    let contextPrompt = '';
    if (currentPageContent) {
      contextPrompt = `You are a concise AI assistant. Be brief but informative.

Current webpage:
Title: ${currentPageContent.title}
URL: ${currentPageContent.url}
Content: ${currentPageContent.bodyText.substring(0, 2000)}...

Previous conversation:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Answer: ${userInput}`;
    } else {
      // If we don't have page content, try to get it again
      try {
        const pageContent = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, response => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        currentPageContent = pageContent;
        contextPrompt = `You are a concise AI assistant. Be brief but informative.

Current webpage:
Title: ${pageContent.title}
URL: ${pageContent.url}
Content: ${pageContent.bodyText.substring(0, 2000)}...

Previous conversation:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Answer: ${userInput}`;
      } catch (error) {
        addMessageToChat("Error accessing page content. Please refresh the page and try again.");
        return;
      }
    }

    chrome.runtime.sendMessage({
      action: "promptGemini",
      prompt: contextPrompt,
      apiKey: apiKey
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    addMessageToChat(`Error: ${error.message}`);
    console.error('Error:', error);
  }
});

// Handle responses from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "geminiResponse") {
    addMessageToChat(message.response);
    sendResponse({received: true});
  } else if (message.action === "geminiError") {
    addMessageToChat(`Error: ${message.error}`);
    sendResponse({received: true});
  }
  return false;
});

// Enter key sends message
promptTextarea.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    promptButton.click();
  }
});
