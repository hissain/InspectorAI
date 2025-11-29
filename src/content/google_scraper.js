(function() {
  // Helper to extract text and structure
  function extractContent() {
    // Selectors based on gtalk implementation
    const mainContainer = document.querySelector('div.mZJni.Dn7Fzd') || 
                          document.querySelector('div.Y3BBE') ||
                          document.querySelector('div[jscontroller=\'M93fIe\']') ||
                          document.querySelector('div.kCrYT') || 
                          document.querySelector('div.hgKElc');

    if (!mainContainer) return null;
    
    // Clone the container to avoid modifying the live page
    const cleanContainer = mainContainer.cloneNode(true);
    
    // Remove known junk elements
    cleanContainer.querySelectorAll('.VlQBpc, [role="status"]').forEach(el => el.remove());


    // Recursive function to parse nodes to Markdown
    function parseNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        return text ? text + " " : "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tagName = node.tagName.toLowerCase();
      const classList = node.classList;
      
      // Ignore irrelevant elements
      if (['button', 'svg', 'video'].includes(tagName)) {
        return "";
      }

      // Handle Code Blocks (often in pre/code or specific divs)
      if (tagName === 'pre' || (tagName === 'div' && classList.contains('r1PmQe'))) {
        const codeElement = node.querySelector('code') || node;
        const codeText = codeElement.textContent;
        const langDiv = node.querySelector('div.vVRw1d');
        const lang = langDiv ? langDiv.textContent.trim() : '';
        return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
      }

      // Handle Lists
      if (tagName === 'ul' || tagName === 'ol') {
        let listMd = "\n";
        Array.from(node.children).forEach(li => {
          if (li.tagName.toLowerCase() === 'li') {
            listMd += `- ${li.textContent.replace(/\s+/g, ' ').trim()}\n`;
          }
        });
        return listMd + "\n";
      }

      // Handle Tables
      if (tagName === 'table') {
        let tableMd = "\n";
        const rows = node.querySelectorAll('tr');
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('th, td');
          const rowText = Array.from(cells).map(c => c.textContent.trim()).join(' | ');
          tableMd += `| ${rowText} |\n`;
          if (index === 0) {
             tableMd += `| ${Array.from(cells).map(() => '---').join(' | ')} |\n`;
          }
        });
        return tableMd + "\n";
      }

      // Handle Headings
      if (['h1','h2','h3','h4'].includes(tagName) || node.getAttribute('role') === 'heading') {
        return `\n### ${node.textContent.trim()}\n`;
      }

      // General traversal
      let childContent = "";
      node.childNodes.forEach(child => {
        childContent += parseNode(child);
      });

      // Block elements usually need a newline
      if (['div', 'p', 'section'].includes(tagName)) {
        return childContent.trim() ? childContent + "\n\n" : "";
      }

      return childContent;
    }

    // Return both parsed content and raw HTML
    return {
      parsed: parseNode(cleanContainer),
      raw: mainContainer.innerHTML // Log the original, not the cleaned one
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
