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
async function handlePromptExecution({ html, query, settings }) {
  const { provider, model, apiKey, maxTokens, customBaseUrl } = settings;
  
  // Custom provider might use empty key (e.g. localhost)
  if (!apiKey && provider !== 'custom') {
    throw new Error('API Key is missing.');
  }

  const systemPrompt = "You are an AI assistant analyzing UI content from a webpage. You will receive a simplified HTML representation of the visible content.\n\nIMPORTANT RULES:\n1. Focus on the VISIBLE TEXT and CONTENT (tables, lists, images).\n2. Do NOT output the full HTML code unless explicitly asked to 'refactor' or 'rewrite code'.\n3. If asked to translate, summarize, or explain, provide ONLY the text result, not the HTML structure.\n4. Ignore technical noise (classes, attributes) if they are not relevant to the query.";
  
  const userPrompt = `Here is the visible content structure (simplified HTML) of the selected element:\n\n\`\`\`html\n${html}\n\`\`\`\n\nUser Query:\n${query}`;

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(model, apiKey, maxTokens, systemPrompt, userPrompt);
      case 'anthropic':
        return await callAnthropic(model, apiKey, maxTokens, systemPrompt, userPrompt);
      case 'gemini':
        return await callGemini(model, apiKey, maxTokens, systemPrompt, userPrompt);
      case 'llama':
        return await callLlama(model, apiKey, maxTokens, systemPrompt, userPrompt);
      case 'custom':
        return await callCustom(customBaseUrl, model, apiKey, maxTokens, systemPrompt, userPrompt);
      default:
        throw new Error(`Provider ${provider} not supported.`);
    }
  } catch (error) {
    console.error('AI API Error:', error);
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
