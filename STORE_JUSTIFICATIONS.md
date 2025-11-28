# Chrome Web Store Privacy & Permissions Justifications

Copy and paste these explanations into the "Privacy practices" tab.

### 1. Host Permission Justification (`<all_urls>`)
**Question:** Why do you need access to all websites?
**Answer:**
> InspectorAI relies on a persistent Side Panel interface to provide a seamless workflow. The "activeTab" permission is insufficient because interactions within the Side Panel do not grant permissions for the currently active tab if the user navigated to it after opening the panel. To allow users to "Pick Element" on any page they browse to without being forced to repeatedly click the extension icon (which would inconveniently toggle the panel closed), the extension requires host permissions to inject the visual picker overlay on demand. The content script is lightweight and only activates when the user explicitly triggers the picker.

### 2. ActiveTab Justification
**Question:** Why do you need activeTab?
**Answer:**
> This permission is used as a fallback to interact with the current tab when the extension icon is initially clicked, ensuring immediate access to the page for inspection.

### 3. Scripting Justification
**Question:** Why do you need scripting?
**Answer:**
> The scripting API is used to programmatically inject the CSS and JavaScript required for the "Visual Element Picker" (highlighter overlay) into the webpage. This ensures the picker code is only loaded when necessary, rather than running persistently on all frames.

### 4. SidePanel Justification
**Question:** Why do you need sidePanel?
**Answer:**
> The core interface of the extension resides in the browser's Side Panel. This design is critical for the "Inspector" workflow, allowing users to view AI analysis and chat alongside the target webpage without obstructing the content they are inspecting.

### 5. Storage Justification
**Question:** Why do you need storage?
**Answer:**
> Storage is used to save the user's local configuration: selected AI provider (e.g., Gemini, OpenAI), API keys, and model preferences. This data stays local to the device.

### 6. Remote Code Justification
**Question:** Does your extension use remote code?
**Answer:**
> No. The extension does not load or execute any remote code. All logic and libraries (like marked.js) are bundled locally within the extension package.

### 7. Single Purpose Description
**Answer:**
> An AI-powered web inspector that allows users to visually select web elements and extract or analyze their content using various AI models directly from a side panel.
