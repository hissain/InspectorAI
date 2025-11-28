/**
 * @typedef {Object} AppSettings
 * @property {string} provider - The AI provider (openai, anthropic, gemini, llama).
 * @property {string} model - The model identifier.
 * @property {string} apiKey - The API key for the provider.
 * @property {number} maxTokens - Max tokens for generation.
 */

const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: '',
  maxTokens: 2048
};

/**
 * Retrieves the current settings from sync storage.
 * @returns {Promise<AppSettings>}
 */
export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items);
    });
  });
}

/**
 * Saves settings to sync storage.
 * @param {Partial<AppSettings>} settings
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

/**
 * Retrieves the API key specifically from local storage (more secure for secrets).
 * Note: We are using sync for config, but local for API keys might be better if we want to separate.
 * However, for simplicity and sync across devices, the prompt says "Save provider + model + token settings using chrome.storage.sync".
 * But keys should be treated carefully. The prompt says "Protect API keys using chrome.storage.local and never log them."
 * So I will split the storage logic.
 */

/**
 * Get API Key from local storage.
 * @returns {Promise<string>}
 */
export async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey'], (result) => {
      resolve(result.apiKey || '');
    });
  });
}

/**
 * Save API Key to local storage.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function saveApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ apiKey: key }, () => {
      resolve();
    });
  });
}
