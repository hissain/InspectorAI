(function() {
  // Helper to extract text and structure
  function extractContent() {
    try {
      // Selectors based on gtalk implementation and new observations
      const mainContainer = document.querySelector('div.mZJni.Dn7Fzd') || 
                            document.querySelector('div.Y3BBE') ||
                            document.querySelector('div[jscontroller=\'M93fIe\']') ||
                            document.querySelector('div[jscontroller=\'zcfIf\']') ||
                            document.querySelector('div[data-subtree]') ||
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
          // Normalize whitespace but keep it if it's significant? 
          // Use a simple replace for now.
          const text = node.textContent.replace(/\s+/g, ' ');
          return text;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tagName = node.tagName.toLowerCase();
        const classList = node.classList;
        
        // Ignore irrelevant elements
        if (['button', 'svg', 'video', 'script', 'style'].includes(tagName)) {
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
              // Recurse to handle formatting inside list items
              let liContent = "";
              li.childNodes.forEach(child => {
                 liContent += parseNode(child);
              });
              listMd += `- ${liContent.trim()}\n`;
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

        // Inline formatting
        if (tagName === 'strong' || tagName === 'b') {
            return `**${childContent}**`;
        }
        if (tagName === 'em' || tagName === 'i') {
            return `*${childContent}*`;
        }
        // Links (simplified)
        if (tagName === 'a' && node.href) {
            // Optional: return `[${childContent}](${node.href})`;
            // For now, just return content to keep it clean for translation
            return childContent; 
        }

        // Block elements usually need a newline
        // Check for display: contents or other inline indicators
        const style = node.style || {}; // Clone might lose computed style, but inline style remains
        const isDisplayContents = style.display === 'contents';
        const isSubtree = node.hasAttribute('data-subtree'); 
        
        // If it's a div/p/section but has display:contents, treat as inline
        if (['div', 'p', 'section'].includes(tagName)) {
           if (isDisplayContents || isSubtree) {
               return childContent;
           }
           // Add double newline for block separation
           return childContent.trim() ? childContent + "\n\n" : "";
        }
        
        if (tagName === 'br') {
            return "\n";
        }

        return childContent;
      }

      // Return both parsed content and raw HTML
      return {
        parsed: parseNode(cleanContainer),
        raw: mainContainer.innerHTML 
      };
    } catch (e) {
      console.error("InspectorAI Scraper Error:", e);
      return null;
    }
  }

  // Polling for content
  let attempts = 0;
  const maxAttempts = 30; // 15 seconds
  
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
