import { getSettings, saveSettings, getApiKey, saveApiKey } from '../lib/storage.js';

let currentHtml = '';
let isProcessing = false;

// DOM Elements - Main View
const mainView = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');
const pickBtn = document.getElementById('pickBtn');
const sendBtn = document.getElementById('sendBtn');
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

// Constants
const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ],
  llama: [
    { value: 'llama-3-8b', label: 'Llama 3 8B' },
    { value: 'llama-3-70b', label: 'Llama 3 70B' }
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
  } else {
    htmlPreview.textContent = 'No element selected';
    sendBtn.disabled = true;
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
pickBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'startPicking' });
    } catch (err) {
      console.error(err);
      alert('Could not start picker. Please REFRESH the web page and try again.\n\n(This happens when the extension is updated but the page is old.)');
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'elementSelected') {
    currentHtml = message.html;
    updatePreview(currentHtml);
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
}

clearBtn.addEventListener('click', () => {
  markdownOutput.innerHTML = '';
  rawOutput.textContent = '';
  queryInput.value = '';
  currentHtml = '';
  updatePreview('');
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
