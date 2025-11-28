# InspectorAI

![InspectorAI Screenshot](assets/Screenshot.png)

**InspectorAI** is a production-ready Chrome extension that supercharges your web development workflow by integrating powerful AI models directly into your browser's inspection tools.

### Why InspectorAI?

Modern web development often involves analyzing complex UI components, refactoring legacy HTML, or translating dynamic content. Traditionally, developers have to manually inspect the DOM, copy messy HTML code, clean up scripts and attributes, and then switch context to paste it into an AI tool.

**InspectorAI automates this entire workflow.** It allows you to visually select any element, automatically prunes the HTML to focus on meaningful content, and sends it directly to your preferred AI model—all without leaving the page.

## Features

- **Visual Element Picker**: Interactively select elements on any webpage with a single click.
- **AI-Powered Analysis**: Send selected content to top-tier AI models for instant feedback.
- **Smart Content Extraction**: Automatically cleans and simplifies HTML to focus on visible text and structure, reducing noise and token usage.
- **Multi-Provider Support**:
  - **OpenAI** (GPT-4o, GPT-3.5)
  - **Google Gemini** (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.5)
  - **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
  - **Meta Llama** (via Groq)
- **Integrated Side Panel**: A persistent workspace that doesn't obstruct your view.
- **Secure Configuration**: API keys are stored locally on your device.


## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/hissain/InspectorAI.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `InspectorAI` directory from your file system.
6. The extension is now installed! Pin it to your toolbar for easy access.

## Usage

1. **Open Inspector**: Click the extension icon in your toolbar to open the Side Panel.
2. **Configure AI**: Click the **Settings (Gear)** button in the panel header. Select your preferred AI provider (e.g., Gemini, OpenAI) and enter your API Key.
3. **Pick an Element**: Click **"Pick Element"** in the panel. Hover over the webpage to highlight elements, then click to select one. (Press **Esc** to cancel).
4. **Ask AI**: The simplified content structure will appear in the panel. Type your query (e.g., "Translate this to Spanish" or "Make this table responsive") and click **"Ask AI"**.

## Supported Models

The extension comes pre-configured with support for the latest models, including:

- **Gemini**: 1.5 Flash, 1.5 Pro, 2.5 Flash/Pro.
- **OpenAI**: GPT-4o, GPT-4o-mini.
- **Anthropic**: Claude 3.5 Sonnet.
- **Llama 3**: 8B, 70B (via Groq).

## Privacy

- **Local Storage**: All API keys and settings are stored locally in your browser (`chrome.storage.local` / `sync`).
- **Direct Communication**: Your queries are sent directly from your browser to the chosen AI provider's API. No intermediate server collects your data.

## Author

**Md. Sazzad Hissain Khan**
Email: hissain.khan[AT]gmail.com
GitHub: [https://github.com/hissain/InspectorAI](https://github.com/hissain/InspectorAI)

## License

MIT License
