# Privacy Policy for InspectorAI

**Effective Date:** November 28, 2025

**InspectorAI** ("we", "our", or "us") respects your privacy. This Privacy Policy describes how your information is handled when you use our Chrome Extension.

## 1. Data Collection and Usage

**InspectorAI does NOT collect, store, or transmit your personal data to any servers owned or operated by the extension developers.** The extension is designed to operate entirely locally within your browser, communicating directly with third-party AI providers only when you explicitly initiate an action.

### A. User Content
When you use the "Pick Element" feature and click "Ask AI", the text content and structure of the selected web element, along with your custom query, are sent **directly from your browser** to the API of the AI provider you have selected (e.g., OpenAI, Google Gemini, Anthropic, or a custom endpoint).
*   We do not see, log, or store this content.
*   This data is subject to the privacy policy of the chosen AI provider.

### B. API Keys
Your API keys (for OpenAI, Gemini, etc.) are stored securely in your browser's local storage (`chrome.storage.local` and `chrome.storage.sync`).
*   They are never sent to us.
*   They are only used to authenticate your requests with the respective AI provider.

## 2. Permissions

We require specific permissions to function:
*   **`activeTab`**: To interact with the page you are currently viewing when you activate the extension.
*   **`scripting`**: To inject the visual element picker overlay.
*   **Host Permissions (`<all_urls>`)**: To allow the element picker to work on any website you visit. The extension only injects code when you activate the picker.

## 3. Third-Party Services

This extension acts as a client for third-party AI services. We are not responsible for the data handling practices of these providers. Please review their privacy policies:
*   [OpenAI Privacy Policy](https://openai.com/privacy)
*   [Google Privacy Policy](https://policies.google.com/privacy)
*   [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

## 4. Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be posted on this page or within the extension's listing.

## 5. Contact Us

If you have any questions about this Privacy Policy, please contact:

**Md. Sazzad Hissain Khan** / **hissain.khan@gmail.com**
