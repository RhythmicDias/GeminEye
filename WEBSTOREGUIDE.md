# GeminEye — Chrome Web Store Submission & Optimization Guide

This blueprint covers the technical checklist, premium feature implementations, store compliance parameters, and marketing strategies required to launch **GeminEye** to the Chrome Web Store as a commercial developer utility.

---

## 1. Source Code Pre-Flight Checklist

Before bundling the extension source code, execute these mandatory adjustments to fix asynchronous race conditions and optimize UI stability on `gemini.google.com`.

### Fix Double-Counting on Asynchronous Chat Switches
Gemini's interface switches channels asynchronously. Overwrite the total token calculation using an isolated temporary accumulator rather than cumulatively modifying a global state across asynchronous cycles.

```javascript
// Locate inside content.js and update to overwrite state:
function recalculateCurrentChatTokens() {
  const textContainers = document.querySelectorAll(
    'user-message p, model-message p, .message-content, [data-test-id="message-content"] p, .user-query, .model-response-text'
  );
  
  let brandNewTotal = 0;
  
  textContainers.forEach(container => {
    if (container.querySelector('p')) return; // Avoid processing wrappers twice
    const text = container.innerText ? container.innerText.trim() : "";
    if (text.length > 5) {
      if (!processedText.has(text)) {
        processedText.add(text);
      }
      brandNewTotal += estimateTokens(text);
    }
  });
  
  // Overwrite directly to protect state during async navigation views
  cumulativeTokens = brandNewTotal; 
  
  if (elements.chatCurr) {
    elements.chatCurr.innerText = cumulativeTokens.toLocaleString();
    updateChatTokenColor(cumulativeTokens);
  }
}