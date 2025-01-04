// background.js

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "promptGemini") {
    handleGeminiPrompt(request.prompt, request.apiKey, request.screenshot)
      .then(response => {
        chrome.runtime.sendMessage({
          action: "geminiResponse",
          response: response
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
          }
        });
      })
      .catch(error => {
        chrome.runtime.sendMessage({
          action: "geminiError",
          error: error.message
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
          }
        });
      });
    sendResponse({received: true});
  }
  return false;
});

async function handleGeminiPrompt(prompt, apiKey, screenshot = null) {
  // If we have a screenshot, use the newer vision model
  const model = screenshot ? 'gemini-1.5-flash' : 'gemini-pro';
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

  let data;
  if (screenshot) {
    // Convert data URL to base64
    const base64Image = screenshot.split(',')[1];

    data = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/png",
              data: base64Image
            }
          }
        ]
      }]
    };
  } else {
    data = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
  }

  try {
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    // Log the raw response for debugging
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse response: ${responseText}`);
    }

    if (responseData.candidates && responseData.candidates.length > 0) {
      return responseData.candidates[0].content.parts[0].text;
    } else {
      throw new Error(`No valid response from Gemini. Response: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    console.error('Request data:', data);
    throw error;
  }
}
