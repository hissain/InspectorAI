import { getSettings, saveSettings, getApiKey, saveApiKey } from '../lib/storage.js';

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
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-pro', label: 'Gemini 1.0 Pro (Stable)' }
  ],
  llama: [
    { value: 'llama-3-8b', label: 'Llama 3 8B' },
    { value: 'llama-3-70b', label: 'Llama 3 70B' }
  ]
};

// DOM Elements
const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const apiKeyInput = document.getElementById('apiKey');
const maxTokensInput = document.getElementById('maxTokens');
const saveBtn = document.getElementById('saveBtn');
const openPanelBtn = document.getElementById('openPanelBtn');
const statusDiv = document.getElementById('status');

/**
 * Populates the model dropdown based on the selected provider.
 * @param {string} provider
 * @param {string} [selectedModel]
 */
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

/**
 * Loads saved settings into the UI.
 */
async function loadSettings() {
  const settings = await getSettings();
  const apiKey = await getApiKey();

  providerSelect.value = settings.provider;
  maxTokensInput.value = settings.maxTokens;
  apiKeyInput.value = apiKey;

  updateModelOptions(settings.provider, settings.model);
}

/**
 * Saves settings from the UI to storage.
 */
async function handleSave() {
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

  statusDiv.textContent = 'Settings Saved!';
  statusDiv.style.color = 'green';
  setTimeout(() => {
    statusDiv.textContent = '';
  }, 2000);
}

// Event Listeners
providerSelect.addEventListener('change', () => {
  updateModelOptions(providerSelect.value);
});

saveBtn.addEventListener('click', handleSave);

openPanelBtn.addEventListener('click', async () => {
  // Close the popup and open the side panel
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close(); // Close the popup
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);
