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
  }
}

function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  disablePicker();
  
  if (selectedElement) {
    selectedElement.classList.remove('inspect-ai-selected');
  }
  
  selectedElement = e.target;
  selectedElement.classList.add('inspect-ai-selected');
  
  // Clean the HTML to reduce noise
  const cleanedHtml = cleanElement(selectedElement);
  
  // Send the selected HTML to the side panel
  chrome.runtime.sendMessage({
    action: 'elementSelected',
    html: cleanedHtml
  });
  
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
    Array.from(el.attributes).forEach(attr => {
      if (!allowedAttrs.includes(attr.name)) {
        el.removeAttribute(attr.name);
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

// Listen for messages from background/popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startPicking') {
    enablePicker();
  }
});
