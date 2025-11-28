import { getSettings, saveSettings, getApiKey, saveApiKey } from '../lib/storage.js';

let currentHtml = '';
let isProcessing = false;

// DOM Elements - Main View
const mainView = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');
const pickBtn = document.getElementById('pickBtn');
const sendBtn = document.getElementById('sendBtn');
const copyHtmlBtn = document.getElementById('copyHtmlBtn');
const copyResponseBtn = document.getElementById('copyResponseBtn');
const clearBtn = document.getElementById('clearBtn');
const toggleRawBtn = document.getElementById('toggleRawBtn');
const queryInput = document.getElementById('queryInput');
const markdownOutput = document.getElementById('markdown-output');
const rawOutput = document.getElementById('raw-output');
const htmlPreview = document.getElementById('htmlPreview');
const settingsBtn = document.getElementById('settingsBtn');

// DOM Elements - Settings View
const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const apiKeyInput = document.getElementById('apiKey');
const maxTokensInput = document.getElementById('maxTokens');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const statusDiv = document.getElementById('status');

const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4.1', label: 'GPT‑4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT‑4.1 Mini' },
    { value: 'o3-mini', label: 'o3‑mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT‑3.5 Turbo' } // legacy/stable
  ],
  anthropic: [
    { value: 'claude-haiku-4.5', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' }
  ],
  gemini: [
    { value: 'gemini-3', label: 'Gemini 3' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash‑Lite' }
  ],
  llama: [
    { value: 'llama-3-8b', label: 'Llama 3 8B' },
    { value: 'llama-3-70b', label: 'Llama 3 70B' },
    { value: 'llama-3-405b', label: 'Llama 3 405B' }
    // experimental Llama 4 variants can be added if needed
    // { value: 'llama-4-scout', label: 'Llama 4 Scout (experimental)' },
    // { value: 'llama-4-maverick', label: 'Llama 4 Maverick (experimental)' }
  ]
};


// --- Helper Functions ---

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updatePreview(html) {
  if (html) {
    const preview = html.length > 100 ? html.substring(0, 100) + '...' : html;
    htmlPreview.textContent = `Selected: ${preview}`;
    htmlPreview.title = html;
    sendBtn.disabled = false;
    copyHtmlBtn.disabled = false;
    copyHtmlBtn.style.display = 'inline-block';
  } else {
    htmlPreview.textContent = 'No element selected';
    sendBtn.disabled = true;
    copyHtmlBtn.disabled = true;
    copyHtmlBtn.style.display = 'none';
  }
}

function updateModelOptions(provider, selectedModel) {
  modelSelect.innerHTML = '';
  const models = PROVIDER_MODELS[provider] || [];
  
  models.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (value === selectedModel) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
}

function showSettings() {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  loadSettingsToUI();
}

function hideSettings() {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
}

async function loadSettingsToUI() {
  const settings = await getSettings();
  const apiKey = await getApiKey();

  providerSelect.value = settings.provider;
  maxTokensInput.value = settings.maxTokens;
  apiKeyInput.value = apiKey;

  updateModelOptions(settings.provider, settings.model);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
}

// --- Event Listeners ---

// Settings Toggle
settingsBtn.addEventListener('click', showSettings);
cancelSettingsBtn.addEventListener('click', hideSettings);

// Settings Logic
providerSelect.addEventListener('change', () => {
  updateModelOptions(providerSelect.value);
});

saveSettingsBtn.addEventListener('click', async () => {
  const provider = providerSelect.value;
  const model = modelSelect.value;
  const maxTokens = parseInt(maxTokensInput.value, 10);
  const apiKey = apiKeyInput.value.trim();

  if (isNaN(maxTokens) || maxTokens < 1) {
    statusDiv.textContent = 'Invalid Max Tokens';
    statusDiv.style.color = 'red';
    return;
  }

  await saveSettings({ provider, model, maxTokens });
  await saveApiKey(apiKey);

  statusDiv.textContent = 'Saved!';
  statusDiv.style.color = 'green';
  setTimeout(() => {
    statusDiv.textContent = '';
    hideSettings();
  }, 1000);
});


// Picker & AI Logic
let pickerPort = null;

pickBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      // Use long-lived connection to manage state
      pickerPort = chrome.tabs.connect(tab.id, { name: 'inspect-ai-picker' });
      
      // Listen for selection from content script
      pickerPort.onMessage.addListener((message) => {
        if (message.action === 'elementSelected') {
          currentHtml = message.html;
          updatePreview(currentHtml);
          pickerPort.disconnect(); 
          pickerPort = null;
        }
      });

      // Handle disconnect (e.g. if user closes panel or page refreshes OR CONNECTION FAILS)
      pickerPort.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          alert('Could not start picker. Please REFRESH the web page and try again.\n\n(This happens when the extension is updated but the page is old.)');
        }
        pickerPort = null;
      });

    } catch (err) {
      console.error(err);
      alert('Could not start picker: ' + err.message);
    }
  }
});

sendBtn.addEventListener('click', async () => {
  if (isProcessing || !currentHtml) return;
  
  const query = queryInput.value.trim();
  if (!query) {
    alert('Please enter a query.');
    return;
  }

  const settings = await getSettings();
  const apiKey = await getApiKey();

  if (!apiKey) {
    markdownOutput.innerHTML = '<p style="color:red">Error: API Key missing. Click the ⚙️ icon to set it.</p>';
    return;
  }

  isProcessing = true;
  sendBtn.disabled = true;
  pickBtn.disabled = true;
  markdownOutput.innerHTML = '<span class="loading">Thinking...</span>';
  rawOutput.textContent = 'Thinking...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'executePrompt',
      html: currentHtml,
      query: query,
      settings: { ...settings, apiKey }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    renderResponse(response.data);

  } catch (err) {
    markdownOutput.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    rawOutput.textContent = err.message;
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    pickBtn.disabled = false;
  }
});

function renderResponse(text) {
  if (typeof marked !== 'undefined') {
    markdownOutput.innerHTML = marked.parse(text);
  } else {
    markdownOutput.textContent = text;
  }
  rawOutput.textContent = text;
  copyResponseBtn.style.display = 'inline-block';
}

// Copy Logic
copyHtmlBtn.addEventListener('click', async () => {
  if (currentHtml) {
    const success = await copyToClipboard(currentHtml);
    if (success) {
      const originalText = copyHtmlBtn.textContent;
      copyHtmlBtn.textContent = 'Copied!';
      setTimeout(() => copyHtmlBtn.textContent = originalText, 2000);
    }
  }
});

copyResponseBtn.addEventListener('click', async () => {
  // Get text content from active view (markdown or raw)
  let textToCopy = '';
  if (!rawOutput.classList.contains('hidden')) {
    textToCopy = rawOutput.textContent;
  } else {
    textToCopy = markdownOutput.innerText; // Get text without HTML tags
  }
  
  if (textToCopy) {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      const originalText = copyResponseBtn.textContent;
      copyResponseBtn.textContent = 'Copied!';
      setTimeout(() => copyResponseBtn.textContent = originalText, 2000);
    }
  }
});

clearBtn.addEventListener('click', () => {
  markdownOutput.innerHTML = '';
  rawOutput.textContent = '';
  queryInput.value = '';
  currentHtml = '';
  updatePreview('');
  copyResponseBtn.style.display = 'none';
});

toggleRawBtn.addEventListener('click', () => {
  if (rawOutput.classList.contains('hidden')) {
    rawOutput.classList.remove('hidden');
    markdownOutput.classList.add('hidden');
    toggleRawBtn.textContent = 'Markdown';
  } else {
    rawOutput.classList.add('hidden');
    markdownOutput.classList.remove('hidden');
    toggleRawBtn.textContent = 'Raw';
  }
});
