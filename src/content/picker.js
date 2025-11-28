let isActive = false;
let hoveredElement = null;
let selectedElement = null;

function enablePicker() {
  if (isActive) return;
  isActive = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('keydown', handleKeyDown, { capture: true });
}

function disablePicker() {
  if (!isActive) return;
  isActive = false;
  activePort = null; // Clear active port reference
  document.body.style.cursor = '';
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, { capture: true });
  document.removeEventListener('keydown', handleKeyDown, { capture: true });
  
  if (hoveredElement) {
    hoveredElement.classList.remove('inspect-ai-highlight');
    hoveredElement = null;
  }
}

function handleMouseOver(e) {
  if (hoveredElement) {
    hoveredElement.classList.remove('inspect-ai-highlight');
  }
  hoveredElement = e.target;
  hoveredElement.classList.add('inspect-ai-highlight');
}

function handleMouseOut(e) {
  if (hoveredElement) {
    hoveredElement.classList.remove('inspect-ai-highlight');
    hoveredElement = null;
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    disablePicker();
    
    // Also remove selection if present
    
    if (selectedElement) {
      selectedElement.classList.remove('inspect-ai-selected');
      selectedElement = null;
    }
  }
}

function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const portToSend = activePort; // Capture port before disabling
  disablePicker();
  
  if (selectedElement) {
    selectedElement.classList.remove('inspect-ai-selected');
  }
  
  selectedElement = e.target;
  selectedElement.classList.add('inspect-ai-selected');
  
  try {
    // Clean the HTML to reduce noise
    const cleanedHtml = cleanElement(selectedElement);
    
    // Send the selected HTML to the side panel
    if (portToSend) {
      portToSend.postMessage({
        action: 'elementSelected',
        html: cleanedHtml
      });
    } else {
      // Fallback for non-connected mode (if any)
      chrome.runtime.sendMessage({
        action: 'elementSelected',
        html: cleanedHtml
      });
    }
  } catch (err) {
    console.error('InspectorAI: Error processing selection', err);
    alert('Error capturing element. See console.');
  }
  
  // Show quick actions overlay
  showOverlay();
}

function cleanElement(element) {
  const clone = element.cloneNode(true);
  
  // Remove scripts, styles, comments
  const toRemove = clone.querySelectorAll('script, style, link, meta, noscript, iframe, svg');
  toRemove.forEach(el => el.remove());
  
  // Remove comments
  const iterator = document.createNodeIterator(clone, NodeFilter.SHOW_COMMENT);
  let curNode;
  while (curNode = iterator.nextNode()) {
    curNode.parentNode.removeChild(curNode);
  }

  // Simplify attributes (keep only semantic ones)
  const allElements = clone.querySelectorAll('*');
  [clone, ...allElements].forEach(el => {
    // Keep list of allowed attributes
    const allowedAttrs = ['src', 'alt', 'href', 'title', 'value', 'placeholder', 'aria-label', 'role'];
    
    // Convert namedNodeMap to array to iterate safely while removing
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      const name = attr.name;
      const val = attr.value;
      
      if (!allowedAttrs.includes(name)) {
        el.removeAttribute(name);
      } else if (val.length > 50) {
        // Truncate long attributes to save tokens
        el.setAttribute(name, val.substring(0, 50) + '...');
      }
    });
    
    // Remove empty divs/spans if they have no text (optional, might be risky for structure)
    // But let's remove class/id/style which creates the most noise
  });
  
  // Collapse whitespace in text nodes? No, preserve structure.
  
  return clone.outerHTML;
}

function showOverlay() {
  let overlay = document.getElementById('inspect-ai-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'inspect-ai-overlay';
    overlay.innerHTML = `
      <span>Element Selected</span>
      <button id="inspect-ai-btn-copy">Copy HTML</button>
      <button id="inspect-ai-btn-close">×</button>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('inspect-ai-btn-copy').addEventListener('click', () => {
      if (selectedElement) {
        navigator.clipboard.writeText(selectedElement.outerHTML);
        alert('HTML Copied to Clipboard!');
      }
    });
    
    document.getElementById('inspect-ai-btn-close').addEventListener('click', () => {
      if (selectedElement) {
        selectedElement.classList.remove('inspect-ai-selected');
        selectedElement = null;
      }
      overlay.remove();
    });
  }
}

// Listen for long-lived connection from sidepanel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'inspect-ai-picker') {
    enablePicker();
    
    // If the port disconnects (sidepanel closes), disable picker
    port.onDisconnect.addListener(() => {
      disablePicker();
    });
    
    // Override message sending to use the port
    const originalSendMessage = chrome.runtime.sendMessage;
    
    // Intercept selections to send via port
    // We modify handleClick to use the port if active
    // Or we can just use port.postMessage() directly if we restructure.
    // Simpler: Keep the sendMessage logic in handleClick, but also post to port.
    // Actually, panel.js expects message on port now.
    
    // Let's modify handleClick to check for port availability or change how we send data.
    // Since we can't easily pass 'port' to handleClick without closure scope,
    // we can assign it to a global variable or use a cleaner approach.
    activePort = port;
  }
});

let activePort = null;
