/**
 * InspectAI Background Worker
 * Handles AI API calls and manages state.
 */

// Side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executePrompt') {
    handlePromptExecution(request)
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Orchestrates the AI API call based on provider.
 */
async function logLastRequest(prompt, response) {
  try {
    await chrome.storage.local.set({
      'last_prompt.log': prompt,
      'last_response.log': response
    });
  } catch (error) {
    console.error('Failed to log last request:', error);
  }
}

function simpleHtmlToText(html) {
  // This is a very basic parser. It won't handle complex cases perfectly
  // but is good enough for extracting readable text for the Google AI model.
  const stripped = html
    .replace(/<style[^>]*>.*<\/style>/gs, '')   // Remove style blocks
    .replace(/<script[^>]*>.*<\/script>/gs, '') // Remove script blocks
    .replace(/<[^>]+>/g, ' ')                   // Remove all other tags
    .replace(/\s+/g, ' ')                       // Collapse whitespace
    .trim();
  return stripped;
}

async function handlePromptExecution({ html, query, settings }) {
  const { provider, model, apiKey, maxTokens, customBaseUrl } = settings;
  
  // Custom provider and Google AI Mode don't need API key
  if (!apiKey && provider !== 'custom' && provider !== 'google-ai-mode') {
    throw new Error('API Key is missing.');
  }

  const systemPrompt = "You are an AI assistant analyzing UI content from a webpage. Your task is to return a markdown version of the HTML provided. Focus on VISIBLE TEXT and CONTENT, including tables, lists, paragraphs, and headers. Do not output the full HTML code. Ignore technical noise like classes and attributes if they are not relevant to the query.";

  let userPrompt = `Here is the simplified HTML of the selected element:\n\n\`\`\`html\n${html}\n\`\`\`\n\nUser Query:\n${query}\n\`\`\`\n\nDo not include any extra commentary or introductory text`;
  
  if (provider === 'google-ai-mode') {
    //const extractedText = simpleHtmlToText(html);
    userPrompt = `Please ${query} the following text and provide the response in clean markdown format. Do not include any extra commentary or introductory text.\n\nText to process:\n"${html}"`;
  }

  let responseText = '';
  try {
    switch (provider) {
      case 'openai':
        responseText = await callOpenAI(model, apiKey, maxTokens, systemPrompt, userPrompt);
        break;
      case 'anthropic':
        responseText = await callAnthropic(model, apiKey, maxTokens, systemPrompt, userPrompt);
        break;
      case 'gemini':
        responseText = await callGemini(model, apiKey, maxTokens, systemPrompt, userPrompt);
        break;
      case 'llama':
        responseText = await callLlama(model, apiKey, maxTokens, systemPrompt, userPrompt);
        break;
      case 'custom':
        responseText = await callCustom(customBaseUrl, model, apiKey, maxTokens, systemPrompt, userPrompt);
        break;
      case 'google-ai-mode':
        responseText = await callGoogleAIMode(userPrompt);
        break;
      default:
        throw new Error(`Provider ${provider} not supported.`);
    }
    
    await logLastRequest(userPrompt, responseText);
    return responseText;

  } catch (error) {
    console.error('AI API Error:', error);
    await logLastRequest(userPrompt, `Error: ${error.message}`);
    throw new Error(error.message || 'Failed to fetch response from AI provider.');
  }
}

// --- OpenAI ---
async function callOpenAI(model, apiKey, maxTokens, system, user) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenAI API Error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Google AI Mode (Free/Tokenless) ---
async function callGoogleAIMode(prompt) {
  return new Promise((resolve, reject) => {
    // Construct Google Search URL with AI parameters
    // udm=50, aep=11 are triggers for AI overview
    const encodedQuery = encodeURIComponent(prompt);
    const searchUrl = `https://www.google.com/search?udm=50&aep=11&hl=en&lr=lang_en&q=${encodedQuery}`;

    // Create a background tab
    chrome.tabs.create({ url: searchUrl, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        return reject(new Error('Failed to open background tab: ' + chrome.runtime.lastError.message));
      }

      // Listener for the result from the content script
      const listener = (message, sender) => {
        if (sender.tab && sender.tab.id === tab.id && message.action === 'google_ai_result') {
          chrome.runtime.onMessage.removeListener(listener);
          
          // Resolve immediately
          if (message.error) {
            reject(new Error(message.error));
          } else {
            if (message.rawHtml) {
              // Log the raw HTML from the scraper
              chrome.storage.local.set({ 'google_scraper_last_raw.html': message.rawHtml });
            }
            resolve(message.data);
          }

          if (!chrome.runtime.lastError) {
            chrome.tabs.remove(tab.id);
          }
        }
      };

      chrome.runtime.onMessage.addListener(listener);

      // Inject the scraper script once loaded
      // We use onUpdated to wait for load
      const updateListener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(updateListener);
          
          // Inject script
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content/google_scraper.js']
          }).catch(err => {
            chrome.tabs.remove(tabId);
            reject(new Error('Failed to inject scraper: ' + err.message));
          });
        }
      };
      
      chrome.tabs.onUpdated.addListener(updateListener);
      
      // Timeout safety (30 seconds)
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        chrome.tabs.onUpdated.removeListener(updateListener);
        // Check if tab still exists before removing
        chrome.tabs.get(tab.id, () => {
            if (!chrome.runtime.lastError) {
                chrome.tabs.remove(tab.id);
            }
        });
        reject(new Error('Google AI Mode request timed out.'));
      }, 30000);
    });
  });
}

// --- Anthropic ---
async function callAnthropic(model, apiKey, maxTokens, system, user) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: maxTokens,
      system: system,
      messages: [
        { role: 'user', content: user }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Anthropic API Error');
  }

  const data = await response.json();
  return data.content[0].text;
}

// --- Google Gemini ---
async function callGemini(model, apiKey, maxTokens, system, user) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${system}\n\n${user}` }] 
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gemini API Error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// --- Meta Llama (via Groq for high performance/compatibility) ---
// Note: Meta does not have a direct public API for Llama 3. 
// We will use Groq as a popular, fast provider for Llama models.
async function callLlama(model, apiKey, maxTokens, system, user) {
  // Using Groq API endpoint which is OpenAI compatible
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model, // e.g. llama3-8b-8192
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Llama (Groq) API Error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Custom (OpenAI Compatible) ---
async function callCustom(baseUrl, model, apiKey, maxTokens, system, user) {
  // Remove trailing slash if present, append /chat/completions if missing
  let endpoint = baseUrl.replace(/\/$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    // If user provided just base like https://api.deepseek.com/v1, append /chat/completions
    // But some providers might be weird. Let's assume standard structure if not explicit.
    // If it ends in /v1, append /chat/completions
    if (endpoint.endsWith('/v1')) {
      endpoint += '/chat/completions';
    } else {
      // Just append /chat/completions and hope user provided root
      // OR user might have provided full URL.
      // Let's assume user provides BASE URL (e.g. https://api.openai.com/v1)
      endpoint += '/chat/completions';
    }
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = errText;
    try {
        const json = JSON.parse(errText);
        errMsg = json.error?.message || json.message || errText;
    } catch (e) {}
    throw new Error(`Custom API Error: ${errMsg}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
