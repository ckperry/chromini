// content.js

// Listen for messages from the popup and return true to indicate async response
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const pageContent = {
      title: document.title,
      url: window.location.href,
      selectedText: window.getSelection().toString().trim(),
      bodyText: document.body.innerText
    };
    sendResponse(pageContent);
  }
  return true;  // Will respond asynchronously
});
