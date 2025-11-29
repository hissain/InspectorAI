(function() {
  // Helper to extract text and structure
  function extractContent() {
    // Selectors based on gtalk implementation
    const mainContainer = document.querySelector('div.mZJni.Dn7Fzd') || 
                          document.querySelector('div.Y3BBE') || 
                          document.querySelector('div.kCrYT') || 
                          document.querySelector('div.hgKElc');

    if (!mainContainer) return null;

    // Recursive function to parse nodes to Markdown
    function parseNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        return text ? text + " " : "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tagName = node.tagName.toLowerCase();
      const classList = node.classList;

      // Handle Code Blocks (often in pre/code or specific divs)
      if (tagName === 'pre' || (tagName === 'div' && classList.contains('r1PmQe'))) {
        const codeElement = node.querySelector('code') || node;
        const codeText = codeElement.textContent;
        const langDiv = node.querySelector('div.vVRw1d');
        const lang = langDiv ? langDiv.textContent.trim() : '';
        return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
      }

      // Only process pre and code blocks
      if (tagName !== 'pre' && tagName !== 'code') {
        let childContent = "";
        node.childNodes.forEach(child => {
          childContent += parseNode(child);
        });
        return childContent;
      }

      // General traversal
      let childContent = "";
      node.childNodes.forEach(child => {
        childContent += parseNode(child);
      });

      return childContent;
    }

    // Return both parsed content and raw HTML
    return {
      parsed: parseNode(mainContainer),
      raw: mainContainer.innerHTML
    };
  }

  // Polling for content
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds
  
  const interval = setInterval(() => {
    attempts++;
    const result = extractContent();
    
    if (result && result.parsed && result.parsed.length > 50) { 
      clearInterval(interval);
      chrome.runtime.sendMessage({ 
        action: 'google_ai_result', 
        data: result.parsed,
        rawHtml: result.raw 
      });
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      chrome.runtime.sendMessage({ 
        action: 'google_ai_result', 
        error: 'Google AI response timed out or could not be parsed.' 
      });
    }
  }, 500);

})();
