// content.js

const CHARS_PER_TOKEN = 4;
let processedText = new Set();
let cumulativeTokens = 0;
let cumulativeInputTokens = 0;
let cumulativeOutputTokens = 0;
const MAX_OPTIMAL_TOKENS = 35000;

const MODEL_PRICING = {
  "gemini-3.5-flash": { name: "Gemini 3.5 Flash", input: 2.70 / 1000000, output: 16.20 / 1000000 },
  "gemini-3.1-pro": { name: "Gemini 3.1 Pro (Preview)", input: 3.60 / 1000000, output: 21.60 / 1000000 },
  "gemini-3.1-flash-lite": { name: "Gemini 3.1 Flash-Lite", input: 0.45 / 1000000, output: 2.70 / 1000000 },
  "gemini-3-flash": { name: "Gemini 3 Flash (Preview)", input: 0.50 / 1000000, output: 3.00 / 1000000 },
  "gemini-2.5-pro": { name: "Gemini 2.5 Pro", input: 1.25 / 1000000, output: 10.00 / 1000000 },
  "gemini-2.5-flash": { name: "Gemini 2.5 Flash", input: 0.30 / 1000000, output: 2.50 / 1000000 },
  "gemini-2.5-flash-lite": { name: "Gemini 2.5 Flash-Lite", input: 0.10 / 1000000, output: 0.40 / 1000000 }
};
let activeModelKey = "gemini-3.5-flash";
let isPrivacyShieldActive = false;

let wrapper, bar, btn, editBtn, toast, libBtn, libraryDropdown;
let elements = {};
let isDeleteMode = false;
let scannerInterval;
let forkScannerInterval;

const initialSnippets = [
  "Explain this code like I'm a beginner.",
  "Refactor this code to follow SOLID principles.",
  "Generate unit tests for this function."
];

const initialSystemPrompts = [
  { name: "JSON Scribe", text: "Act as a strict JSON validator. Output only parsing results and error reports." },
  { name: "Clinical Scribe", text: "Act as an expert pediatric neurologist clinical scribe. Synthesize notes using strict SOAP structure." },
  { name: "Security Auditor", text: "Act as an elite security auditor. Review the following code for CVE vulnerabilities." }
];

function renderSnippets() {
  chrome.storage.local.get(['customSnippets', 'customSystemPrompts'], (result) => {
    let customSnippets = result.customSnippets;
    let customSystemPrompts = result.customSystemPrompts;
    
    // Seed storage with defaults if not present
    if (customSnippets === undefined) {
      customSnippets = [...initialSnippets];
      chrome.storage.local.set({ customSnippets });
    }
    if (customSystemPrompts === undefined) {
      customSystemPrompts = [...initialSystemPrompts];
      chrome.storage.local.set({ customSystemPrompts });
    }
    
    libraryDropdown.innerHTML = `
      <div class="gemineye-snippet-header">Prompt Snippets</div>
      <div id="gemineye-snippets-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;"></div>
      <div class="gemineye-snippet-header" style="margin-top: 12px;">System Personas</div>
      <div id="gemineye-systems-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;"></div>
    `;
    
    const snipList = libraryDropdown.querySelector('#gemineye-snippets-list');
    const sysList = libraryDropdown.querySelector('#gemineye-systems-list');
    
    // Render standard prompts
    customSnippets.forEach((snip, index) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.style.display = 'flex';
      itemWrapper.style.alignItems = 'center';
      itemWrapper.style.gap = '8px';
      
      const item = document.createElement('div');
      item.className = 'gemineye-snippet-item';
      item.style.flexGrow = '1';
      item.innerText = snip;
      item.title = snip;
      item.addEventListener('click', () => {
        libraryDropdown.classList.remove('show');
        injectSpecificPrompt(snip, false);
      });
      itemWrapper.appendChild(item);
      
      const delSnip = document.createElement('div');
      delSnip.innerHTML = '×';
      delSnip.style.cursor = 'pointer';
      delSnip.style.color = '#ea4335';
      delSnip.style.fontSize = '16px';
      delSnip.style.fontWeight = 'bold';
      delSnip.style.padding = '0 4px';
      delSnip.title = "Delete snippet";
      delSnip.addEventListener('click', (e) => {
         e.stopPropagation();
         const newCustom = [...customSnippets];
         newCustom.splice(index, 1);
         chrome.storage.local.set({ customSnippets: newCustom }, () => {
           renderSnippets();
         });
      });
      itemWrapper.appendChild(delSnip);
      snipList.appendChild(itemWrapper);
    });
    
    // Render system instructions
    customSystemPrompts.forEach((sys, index) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.style.display = 'flex';
      itemWrapper.style.alignItems = 'center';
      itemWrapper.style.gap = '8px';
      
      const item = document.createElement('div');
      item.className = 'gemineye-snippet-item';
      item.style.flexGrow = '1';
      item.innerText = `🎭 ${sys.name}`;
      item.title = sys.text;
      item.addEventListener('click', () => {
        libraryDropdown.classList.remove('show');
        const systemPrompt = `[SYSTEM INSTRUCTION: ${sys.text}]\n\nPlease process the following:\n`;
        injectSpecificPrompt(systemPrompt, false);
      });
      itemWrapper.appendChild(item);
      
      const delSys = document.createElement('div');
      delSys.innerHTML = '×';
      delSys.style.cursor = 'pointer';
      delSys.style.color = '#ea4335';
      delSys.style.fontSize = '16px';
      delSys.style.fontWeight = 'bold';
      delSys.style.padding = '0 4px';
      delSys.title = "Delete system persona";
      delSys.addEventListener('click', (e) => {
         e.stopPropagation();
         const newCustom = [...customSystemPrompts];
         newCustom.splice(index, 1);
         chrome.storage.local.set({ customSystemPrompts: newCustom }, () => {
           renderSnippets();
         });
      });
      itemWrapper.appendChild(delSys);
      sysList.appendChild(itemWrapper);
    });
    
    // Add Row interface
    const addRow = document.createElement('div');
    addRow.className = 'gemineye-snippet-add';
    addRow.style.display = 'flex';
    addRow.style.flexDirection = 'column';
    addRow.style.gap = '6px';
    addRow.style.marginTop = '8px';
    
    const inputMain = document.createElement('input');
    inputMain.className = 'gemineye-snippet-input';
    inputMain.placeholder = "Prompt text or System rule...";
    
    const inputName = document.createElement('input');
    inputName.className = 'gemineye-snippet-input';
    inputName.placeholder = "Persona name (System only)...";
    inputName.style.display = 'none';
    
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '6px';
    btnRow.style.width = '100%';
    
    const addPromptBtn = document.createElement('button');
    addPromptBtn.className = 'gemineye-snippet-add-btn';
    addPromptBtn.style.flexGrow = '1';
    addPromptBtn.innerText = "+ Prompt";
    addPromptBtn.addEventListener('click', () => {
      const val = inputMain.value.trim();
      if (val) {
        chrome.storage.local.set({ customSnippets: [...customSnippets, val] }, () => {
          renderSnippets();
        });
      }
    });
    
    const addSystemBtn = document.createElement('button');
    addSystemBtn.className = 'gemineye-snippet-add-btn';
    addSystemBtn.style.flexGrow = '1';
    addSystemBtn.style.background = '#8ab4f8';
    addSystemBtn.style.color = '#202124';
    addSystemBtn.innerText = "+ System";
    addSystemBtn.addEventListener('click', () => {
      if (inputName.style.display === 'none') {
        inputName.style.display = 'block';
        inputName.focus();
      } else {
        const text = inputMain.value.trim();
        const name = inputName.value.trim() || "Custom Persona";
        if (text) {
          chrome.storage.local.set({ customSystemPrompts: [...customSystemPrompts, { name, text }] }, () => {
            renderSnippets();
          });
        }
      }
    });
    
    btnRow.appendChild(addPromptBtn);
    btnRow.appendChild(addSystemBtn);
    addRow.appendChild(inputMain);
    addRow.appendChild(inputName);
    addRow.appendChild(btnRow);
    libraryDropdown.appendChild(addRow);
  });
}

function initUI() {
  if (document.getElementById('gemineye-wrapper')) return;

  wrapper = document.createElement('div');
  wrapper.id = 'gemineye-wrapper';

  // Stat Bar
  bar = document.createElement('div');
  bar.className = 'gemineye-bar';

  // Minimized Row
  const primaryRow = document.createElement('div');
  primaryRow.className = 'gemineye-row primary';
  primaryRow.innerHTML = `
    <div class="gemineye-stat" style="display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 9h2V7h-2V5c0-1.1-.9-2-2-2h-2V1h-2v2h-2V1H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2V9zm-4 6H9V9h6v6z"/></svg>
    </div>
  `;

  // Expanded Details
  const details = document.createElement('div');
  details.className = 'gemineye-details';
  details.innerHTML = `
    <div class="gemineye-title-row">
      <span class="gemineye-title">Tokens & Cost Estimator</span>
    </div>
    <div class="gemineye-row">
      <div class="gemineye-stat"><span class="gemineye-label" title="Current Chat Context (tokens)">This Chat:</span><span class="gemineye-value" id="ge-chat-curr">0</span></div>
    </div>
    <div class="gemineye-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
      <span class="gemineye-label">Select API Model to Calculate Cost:</span>
      <select id="ge-model-select" class="gemineye-select"></select>
    </div>
    <div class="gemineye-row">
      <div class="gemineye-stat"><span class="gemineye-label" title="Estimated API Cost based on active model rates">Est. Cost:</span><span class="gemineye-value" id="ge-cost-curr">$0.0000</span></div>
      <div id="ge-cache-badge" style="display: none; background: #ea4335; color: white; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: bold; cursor: pointer; align-items: center; justify-content: center; animation: pulse 2s infinite;">ROI 💡</div>
    </div>
    <div class="gemineye-row" style="justify-content: space-between;">
      <span class="gemineye-label" title="Scans prompts for API keys, emails, credit cards before sending">Privacy Shield:</span>
      <label class="ge-switch">
        <input type="checkbox" id="ge-privacy-toggle">
        <span class="ge-switch-slider"></span>
      </label>
    </div>
    <div class="gemineye-row">
      <div class="gemineye-stat"><span class="gemineye-label" title="Input Tokens (Last 1 Hour)">IN (1H):</span><span class="gemineye-value" id="ge-in-curr">0</span></div>
      <div class="gemineye-stat"><span class="gemineye-label" title="Output Tokens (Last 1 Hour)">OUT (1H):</span><span class="gemineye-value" id="ge-out-curr">0</span></div>
    </div>
    <div class="gemineye-row">
      <div class="gemineye-stat"><span class="gemineye-label" title="Input Tokens (Last 24 Hours)">IN (24H):</span><span class="gemineye-value" id="ge-in-24h">0</span></div>
      <div class="gemineye-stat"><span class="gemineye-label" title="Output Tokens (Last 24 Hours)">OUT (24H):</span><span class="gemineye-value" id="ge-out-24h">0</span></div>
    </div>
    <div class="gemineye-row">
      <div class="gemineye-stat"><span class="gemineye-label" title="Prompts Sent (Last 1 Hour)">PROMPTS/HR:</span><span class="gemineye-value" id="ge-prompts-1h">0</span></div>
      <div class="gemineye-stat"><span class="gemineye-label" title="Prompts Sent (Last 24 Hours)">PROMPTS/DAY:</span><span class="gemineye-value" id="ge-prompts-24h">0</span></div>
    </div>
  `;

  const modelSelect = details.querySelector('#ge-model-select');
  Object.keys(MODEL_PRICING).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.innerText = MODEL_PRICING[key].name;
    modelSelect.appendChild(opt);
  });

  chrome.storage.local.get(['activeModelKey', 'privacyShieldActive'], (result) => {
    if (result.activeModelKey && MODEL_PRICING[result.activeModelKey]) {
      activeModelKey = result.activeModelKey;
    }
    modelSelect.value = activeModelKey;
    
    isPrivacyShieldActive = !!result.privacyShieldActive;
    details.querySelector('#ge-privacy-toggle').checked = isPrivacyShieldActive;
    
    updateEstimatedCost();
  });

  modelSelect.addEventListener('change', (e) => {
    activeModelKey = e.target.value;
    chrome.storage.local.set({ activeModelKey });
    updateEstimatedCost();
  });

  const privacyToggle = details.querySelector('#ge-privacy-toggle');
  privacyToggle.addEventListener('change', (e) => {
    isPrivacyShieldActive = e.target.checked;
    chrome.storage.local.set({ privacyShieldActive: isPrivacyShieldActive });
    showToast(isPrivacyShieldActive ? "Privacy Shield: ACTIVE" : "Privacy Shield: INACTIVE", !isPrivacyShieldActive);
  });

  const cacheBadge = details.querySelector('#ge-cache-badge');
  cacheBadge.addEventListener('click', () => {
    const model = MODEL_PRICING[activeModelKey];
    const normalCost = (cumulativeInputTokens * model.input) + (cumulativeOutputTokens * model.output);
    const cachedCost = (cumulativeInputTokens * 0.2 * model.input) + (cumulativeOutputTokens * model.output);
    const savings = normalCost - cachedCost;
    showToast(`Context Caching would save you ~$${savings.toFixed(4)} (80% input ROI)!`);
  });

  bar.appendChild(primaryRow);
  bar.appendChild(details);

  // Library Button
  libBtn = document.createElement('div');
  libBtn.className = 'gemineye-btn';
  libBtn.title = "Snippet Library";
  libBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>`;
  
  libraryDropdown = document.createElement('div');
  libraryDropdown.className = 'gemineye-library-dropdown';
  libBtn.appendChild(libraryDropdown);
  
  libBtn.addEventListener('click', (e) => {
    if (e.target.closest('.gemineye-library-dropdown')) return;
    libraryDropdown.classList.toggle('show');
    if (libraryDropdown.classList.contains('show')) {
      renderSnippets();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!libBtn.contains(e.target)) {
      libraryDropdown.classList.remove('show');
    }
  });

  // Edit / Delete Button
  editBtn = document.createElement('div');
  editBtn.className = 'gemineye-btn';
  editBtn.title = "Toggle Bulk Delete Mode";
  editBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
  editBtn.addEventListener('click', toggleDeleteMode);

  // Compact Chat Button
  btn = document.createElement('div');
  btn.className = 'gemineye-btn';
  btn.title = "Generate Chat Summary";
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
  btn.addEventListener('click', injectPromptContext);

  // Toast
  toast = document.createElement('div');
  toast.id = 'gemineye-toast';
  wrapper.appendChild(toast);

  wrapper.appendChild(bar);
  wrapper.appendChild(libBtn);
  wrapper.appendChild(editBtn);
  wrapper.appendChild(btn);
  document.body.appendChild(wrapper);

  elements = {
    chatCurr: document.getElementById('ge-chat-curr'),
    inCurr: document.getElementById('ge-in-curr'),
    outCurr: document.getElementById('ge-out-curr'),
    in24h: document.getElementById('ge-in-24h'),
    out24h: document.getElementById('ge-out-24h'),
    prompts1h: document.getElementById('ge-prompts-1h'),
    prompts24h: document.getElementById('ge-prompts-24h')
  };

  updateUIFromStorage();
  setInterval(updateUIFromStorage, 10000);

  // Periodically check for navigation changes and recalculate tokens
  lastPathname = window.location.pathname;
  recalculateCurrentChatTokens();
  setInterval(checkNavigation, 1000);

  forkScannerInterval = setInterval(scanForForkIcons, 2000);

  setupPreFlightInterceptor();

  // Check for pending fork on load
  const pendingFork = localStorage.getItem('ge_pending_fork');
  if (pendingFork) {
    localStorage.removeItem('ge_pending_fork');
    showToast("Injecting conversation context...");
    
    let attempts = 0;
    const injectInterval = setInterval(() => {
      attempts++;
      const txtBox = document.querySelector('rich-textarea > div, .ql-editor, textarea, [contenteditable="true"]');
      if (txtBox && txtBox.offsetParent !== null) {
        clearInterval(injectInterval);
        injectSpecificPrompt(pendingFork, true);
      } else if (attempts > 20) {
        clearInterval(injectInterval);
        showToast("Failed to find input box for Fork", true);
      }
    }, 500);
  }
}

function toggleDeleteMode() {
  isDeleteMode = !isDeleteMode;
  editBtn.classList.toggle('active', isDeleteMode);
  
  if (isDeleteMode) {
    showToast("One-step deletion is ACTIVE! Take caution!", true);
    scannerInterval = setInterval(scanAndInjectDeleteIcons, 1000);
    scanAndInjectDeleteIcons();
  } else {
    showToast("Edit mode disabled");
    clearInterval(scannerInterval);
    document.querySelectorAll('.gemineye-delete-icon').forEach(el => el.remove());
    document.querySelectorAll('.ge-has-delete').forEach(el => {
      el.classList.remove('ge-has-delete');
      // Restore original padding to fix layout overlap when deactivated
      const origPad = el.getAttribute('data-ge-orig-pad');
      if (origPad !== null) {
        el.style.paddingLeft = origPad;
      }
    });
  }
}

function scanAndInjectDeleteIcons() {
  const chatItems = document.querySelectorAll('a[href^="/app/"], [data-test-id="conversation-history-item"], .conversation-item, [class*="history-item"]');
  
  chatItems.forEach(item => {
    if (item.classList.contains('ge-has-delete') || item.closest('header')) return;
    
    if (item.innerText && item.innerText.length > 0 && item.offsetHeight < 100) {
      item.classList.add('ge-has-delete');
      if (getComputedStyle(item).position === 'static') {
        item.style.position = 'relative';
      }
      
      // Shift text to the right so the delete button doesn't overlap it
      if (!item.hasAttribute('data-ge-orig-pad')) {
        item.setAttribute('data-ge-orig-pad', getComputedStyle(item).paddingLeft || '0px');
      }
      item.style.paddingLeft = '36px';
      
      const delIcon = document.createElement('div');
      delIcon.className = 'gemineye-delete-icon';
      delIcon.title = "Delete this chat instantly";
      
      delIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeAggressiveDelete(item, delIcon);
      });
      
      item.appendChild(delIcon);
    }
  });
}

function executeAggressiveDelete(chatItem, delIcon) {
  delIcon.style.opacity = '0.5';
  delIcon.style.pointerEvents = 'none';

  const parent = chatItem.parentElement;
  
  // 1. Force hover to reveal the 3-dot menu
  ['pointerenter', 'pointerover', 'mouseover', 'mouseenter'].forEach(ev => {
    parent.dispatchEvent(new PointerEvent(ev, { bubbles: true, cancelable: true }));
    chatItem.dispatchEvent(new PointerEvent(ev, { bubbles: true, cancelable: true }));
  });

  setTimeout(() => {
    // 2. Find the 3-dot menu button
    const menuBtn = parent.querySelector('button[aria-label*="option"], button[aria-label*="menu"], button[aria-label*="chat"], button');
    
    if (menuBtn) {
      menuBtn.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
      menuBtn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      menuBtn.click();
      menuBtn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
    } else {
      showToast("Could not reveal 3-dot menu", true);
      delIcon.style.opacity = '1';
      delIcon.style.pointerEvents = 'auto';
      return;
    }

    // 3. Wait for dropdown to spawn
    setTimeout(() => {
      // Use getBoundingClientRect for accurate visibility checking, especially for fixed elements
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };

      // Search backwards to get the most recently appended DOM elements (highest z-index menus)
      const allElements = Array.from(document.querySelectorAll('*')).reverse();
      
      const deleteBtn = allElements.find(el => {
        if (!isVisible(el)) return false;
        const text = el.innerText ? el.innerText.trim().toLowerCase() : "";
        if (!text.includes('delete')) return false;
        if (text.length > 20) return false;
        return el.matches('button, li, menuitem, span, div, a, [role="menuitem"]');
      });
      
      if (deleteBtn) {
        const clickableDelete = deleteBtn.closest('button, li, menuitem, [role="menuitem"], a') || deleteBtn;
        clickableDelete.click();
        
        // 4. Wait for confirmation dialog
        setTimeout(() => {
          // Search backwards again to find the most recent modal buttons
          const dialogBtns = Array.from(document.querySelectorAll('button, [role="button"]')).reverse();
          const finalDeleteBtn = dialogBtns.find(el => {
            if (!isVisible(el)) return false;
            const text = el.innerText ? el.innerText.trim().toLowerCase() : "";
            // Strict equality to avoid clicking the modal title "Delete chat?"
            return text === 'delete';
          });
          
          if (finalDeleteBtn) {
            finalDeleteBtn.click();
            showToast("Chat deleted!");
          } else {
             showToast("Failed to find final confirmation", true);
             // Re-enable the icon so the user can try again
             delIcon.style.opacity = '1';
             delIcon.style.pointerEvents = 'auto';
          }
        }, 500);
        
      } else {
        showToast("Failed to find Delete option", true);
        delIcon.style.opacity = '1';
        delIcon.style.pointerEvents = 'auto';
      }
    }, 500);
  }, 100);
}

function showToast(msg, isWarning = false) {
  toast.innerText = msg;
  toast.className = isWarning ? 'show warning' : 'show';
  setTimeout(() => toast.className = '', 2500);
}

async function injectSpecificPrompt(promptText, autoSubmit = true) {
  let txtBox = document.querySelector('rich-textarea > div, .ql-editor, textarea, [contenteditable="true"]');
  
  if (!txtBox) {
    showToast("Input box not found!", true);
    return;
  }

  txtBox.focus();
  document.execCommand('insertText', false, promptText);
  
  txtBox.dispatchEvent(new Event('input', { bubbles: true }));
  
  if (autoSubmit) {
    setTimeout(() => {
      const parentForm = txtBox.closest('form');
      if (parentForm) {
        const submitBtn = parentForm.querySelector('button[type="submit"], button[aria-label*="Send"]');
        if (submitBtn) submitBtn.click();
      } else {
        const sendBtn = document.querySelector('button[aria-label*="Send message"], button[aria-label*="Send"], button.send-button');
        if (sendBtn) sendBtn.click();
      }
    }, 500);
  }
}

async function injectPromptContext() {
  const allMsgs = Array.from(document.querySelectorAll('.ge-has-fork'));
  if (allMsgs.length > 0) {
    const summaryPrompt = `Summarize our entire conversation into a compact, copy-ready context block for a new chat session. Output ONLY a single raw markdown code block (\`\`\`markdown ... \`\`\`) with these labeled sections in order:
## Active Task — What we were working on at the exact moment this conversation ended. Specific enough that work can resume immediately.
## Decisions & Rationale — What was decided and why, including approaches that were explicitly rejected and the reason they were ruled out.
## Context & Environment — Domain-specific background needed to continue: tools, platforms, sources, references, clinical settings, personas, constraints — whatever isn't self-evident.
## Key Artifacts — Any output produced during the conversation: code, templates, documents, frameworks, analyses, or drafts. Condensed if lengthy, preserving critical details.
## Problems & Solutions — Issues encountered and how they were resolved.
## Open Issues & Blockers — Unresolved questions or blockers still needing attention.
## Next Steps — Ordered list of what to do next.
## Hard Constraints — All rules, preferences, and non-negotiables established during the conversation.
Rules: gender-neutral, zero filler, no commentary outside the code block, maximum information density, write as if the receiving session has zero prior context.`;
    showToast("Generating chat summary...");
    injectSpecificPrompt(summaryPrompt, true);
  } else {
    showToast("No messages found to compact", true);
  }
}


function scanForForkIcons() {
  // If we are on a blank new chat page, do not scan or inject any fork icons.
  if (window.location.pathname === '/app' || window.location.pathname === '/app/') {
    document.querySelectorAll('.fork-btn').forEach(el => el.remove());
    document.querySelectorAll('.ge-has-fork').forEach(el => el.classList.remove('ge-has-fork'));
    return;
  }

  // Use a broad selector to catch all possible message wrappers, as Gemini frequently changes DOM tags
  const messages = document.querySelectorAll('user-message, model-message, .message-content, [data-test-id="message-content"], .user-query, .model-response-text, message-content, [class*="message"]');
  
  messages.forEach((msg) => {
    if (msg.classList.contains('ge-has-fork')) return;
    
    // Safety check: if an ancestor already has the class, do not inject here to prevent double icons!
    if (msg.parentElement && msg.parentElement.closest('.ge-has-fork')) return;
    
    // Prevent injecting into popup dialogs (e.g., Delete Chat confirmation window)
    if (msg.closest('dialog') || msg.closest('[role="dialog"]') || msg.closest('.mat-mdc-dialog-container') || msg.closest('.cdk-overlay-pane') || msg.closest('mat-dialog-container') || msg.closest('.modal') || msg.closest('.dialog')) return;
    
    // Prevent injecting into the text input area
    if (msg.closest('form') || msg.querySelector('textarea') || msg.querySelector('rich-textarea') || msg.closest('rich-textarea')) return;
    
    // Skip empty wrappers
    const text = msg.innerText ? msg.innerText.trim() : "";
    if (text.length < 5) return;
    
    // Skip the "New Chat" greeting screens (removed the length check because hidden accessibility text can make it > 100 chars)
    if (text.includes("Where should we start?") || text.includes("Ask Gemini") || text.includes("Hello, ")) return;
    
    // Accurate visibility check
    const rect = msg.getBoundingClientRect();
    if (rect.width === 0 || rect.height < 20) return;
    
    msg.classList.add('ge-has-fork');
    
    const forkBtn = document.createElement('div');
    forkBtn.className = 'gemineye-btn fork-btn';
    // Using a clear "branch" style icon, slightly larger
    forkBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M15 4l2.5 2.5L14 10l-2-2 3.5-3.5L13 2H22v9l-2.5-2.5zM10 14L6.5 10.5 10 7 7 4l-5 5 5 5 3-3z"/></svg>`;
    forkBtn.title = "Fork Chat from Here";
    
    if (getComputedStyle(msg).position === 'static') {
      msg.style.position = 'relative';
    }
    
    forkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      executeFork(msg, false);
    });
    
    msg.appendChild(forkBtn);
  });
}

function executeFork(targetMsg, isCompact = false) {
  // Use the exact class we injected to guarantee a perfect 1:1 match in the DOM
  const allMsgs = Array.from(document.querySelectorAll('.ge-has-fork'));
  const targetIndex = allMsgs.indexOf(targetMsg);
  
  if (targetIndex === -1) {
    showToast("Error locating message index.", true);
    return;
  }
  
  let compacted = "";
  for (let i = 0; i <= targetIndex; i++) {
    const text = allMsgs[i].innerText ? allMsgs[i].innerText.trim() : "";
    if (text && !text.includes('Fork Chat from Here')) {
      const role = allMsgs[i].tagName.toLowerCase().includes('user') || allMsgs[i].classList.contains('user-query') ? 'User' : 'Gemini';
      compacted += `\n\n[${role}]:\n${text}`;
    }
  }
  
  const prompt = `You are being used at a fork point in this conversation. Review the entire conversation history up to this point and produce a compact, copy-ready snapshot for a new chat session.

Output ONLY a single raw markdown code block (\`\`\`markdown ... \`\`\`) with these labeled sections in order:

## Objective
The core goal of this conversation — what we are ultimately trying to accomplish.

## Last Good State
A precise description of where the conversation stood — specific enough that a new session can resume immediately with zero prior context.

## Key Decisions & Rationale
What was decided and why, including anything explicitly tried, ruled out, or abandoned.

## Context & Environment
Domain-specific background needed to continue: tools, platforms, references, settings, personas, tone, style — anything not self-evident.

## Key Artifacts
Any output produced so far: code, templates, documents, analyses, or drafts. Condensed if lengthy, preserving critical details.

## Approaches to Avoid
Any direction that produced poor results, failed, or was explicitly rejected — so the new session does not repeat them.

## Next Steps
Ordered list of what the new session should focus on immediately.

## Hard Constraints
All rules, preferences, formats, tones, and non-negotiables established during the conversation.

Rules: gender-neutral, zero filler, no commentary outside the code block, maximum information density, write as if the receiving session has zero prior context.

Here is the context up to the point we forked:
` + compacted;
  
  localStorage.setItem('ge_pending_fork', prompt);
  showToast("Forking branch...");
  
  // Force a hard navigation to a new chat. This is infinitely more reliable than trying 
  // to synthetically click a React Router link, and guarantees a clean script boot.
  window.location.href = "https://gemini.google.com/app";
}

function updateUIFromStorage() {
  if (!chrome.runtime || !chrome.runtime.id) return;
  chrome.runtime.sendMessage({ action: 'getUsage' }, (response) => {
    if (response && response.usageData) {
      const d = response.usageData;
      if (elements.inCurr) elements.inCurr.innerText = d.hourlyTokensIn.toLocaleString();
      if (elements.outCurr) elements.outCurr.innerText = d.hourlyTokensOut.toLocaleString();
      if (elements.in24h) elements.in24h.innerText = d.dailyTokensIn.toLocaleString();
      if (elements.out24h) elements.out24h.innerText = d.dailyTokensOut.toLocaleString();
      if (elements.prompts1h) elements.prompts1h.innerText = d.hourlyPrompts.toLocaleString();
      if (elements.prompts24h) elements.prompts24h.innerText = d.dailyPrompts.toLocaleString();
    }
  });
}

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Sniffing logic
function observeChat() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true, characterData: true };

  const callback = function(mutationsList) {
    for(const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Lock down sniffing to message-related elements
            const isMessageRelated = (node.matches && node.matches('user-message, model-message, .message-content, [data-test-id="message-content"], .user-query, .model-response-text, message-content, [class*="message"]')) ||
                                     (node.closest && node.closest('user-message, model-message, .message-content, [data-test-id="message-content"], .user-query, .model-response-text, message-content, [class*="message"]')) ||
                                     (node.querySelector && node.querySelector('user-message, model-message, .message-content, [data-test-id="message-content"], .user-query, .model-response-text, message-content, [class*="message"]'));
            if (!isMessageRelated) return;
            
            let isUser = false;
            if (node.matches && node.matches('user-message, [data-message-author="user"]')) {
              isUser = true;
            } else if (node.querySelector && node.querySelector('user-message, [data-message-author="user"]')) {
              isUser = true;
            } else if (node.innerText && !node.innerHTML.includes('content_copy') && !node.innerHTML.includes('thumb_up')) {
              const htmlStr = node.outerHTML || "";
              if (htmlStr.toLowerCase().includes('user') || htmlStr.toLowerCase().includes('query')) {
                 isUser = true;
              }
            }

            const textBlocks = node.querySelectorAll ? node.querySelectorAll('p, .message-content, [data-test-id="message-content"]') : [];
            let added = false;
            
            textBlocks.forEach(block => {
              const text = block.innerText ? block.innerText.trim() : "";
              if (text.length > 5 && !processedText.has(text)) {
                let newTokens = estimateTokens(text);
                processedText.add(text);
                sendUsage(newTokens, isUser ? 'input' : 'output');
                added = true;
              }
            });

            if (!added && node.innerText) {
               const text = node.innerText.trim();
               if (text.length > 10 && text.length < 2000 && !node.querySelector('div > div > div > div')) {
                 if (!processedText.has(text)) {
                   processedText.add(text);
                   sendUsage(estimateTokens(text), isUser ? 'input' : 'output');
                 }
               }
            }
          }
        });
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}

let toastShownForRed = false;

function updateChatTokenColor(tokens) {
  if (!elements.chatCurr || !bar) return;
  
  bar.classList.remove('ge-state-green', 'ge-state-orange', 'ge-state-red');
  
  if (tokens <= 25000) {
    elements.chatCurr.style.color = 'var(--ge-color-green)';
    bar.classList.add('ge-state-green');
    toastShownForRed = false;
  } else if (tokens <= 35000) {
    elements.chatCurr.style.color = 'var(--ge-color-orange)';
    bar.classList.add('ge-state-orange');
    toastShownForRed = false;
  } else {
    elements.chatCurr.style.color = 'var(--ge-color-red)';
    bar.classList.add('ge-state-red');
  }
}

function sendUsage(tokens, type) {
  if (tokens > 0) {
    if (type === 'input') {
      cumulativeInputTokens += tokens;
    } else {
      cumulativeOutputTokens += tokens;
    }
    cumulativeTokens = cumulativeInputTokens + cumulativeOutputTokens;
    if (elements.chatCurr) {
      elements.chatCurr.innerText = cumulativeTokens.toLocaleString();
      updateChatTokenColor(cumulativeTokens);
    }
    checkTokenBloat();
    updateEstimatedCost();
    
    if (!chrome.runtime || !chrome.runtime.id) return;
    chrome.runtime.sendMessage({ action: 'addUsage', tokens, type }, (response) => {
      if (response && response.success) {
        updateUIFromStorage();
      }
    });
  }
}

function checkTokenBloat() {
  if (cumulativeTokens > MAX_OPTIMAL_TOKENS && bar) {
    if (!toastShownForRed) {
      toastShownForRed = true;
      bar.title = "You've reached the optimal UI threshold. For highly precise clinical notes, consider starting a new chat to prevent memory clipping.";
      showToast("You've reached the optimal UI threshold. For highly precise clinical notes, consider starting a new chat to prevent memory clipping.", true);
    }
  } else if (bar) {
    bar.removeAttribute('title');
  }
}

let lastPathname = "";

function checkNavigation() {
  const currentPath = window.location.pathname;
  if (currentPath !== lastPathname) {
    lastPathname = currentPath;
    processedText.clear();
    cumulativeTokens = 0;
    cumulativeInputTokens = 0;
    cumulativeOutputTokens = 0;
    if (elements.chatCurr) {
      elements.chatCurr.innerText = "0";
      updateChatTokenColor(0);
    }
    updateEstimatedCost();
    checkTokenBloat();
    
    if (currentPath === '/app' || currentPath === '/app/') {
      return;
    }
    
    // Scan for existing messages periodically as they render asynchronously
    let attempts = 0;
    const scanInterval = setInterval(() => {
      attempts++;
      const textContainers = document.querySelectorAll('user-message p, model-message p, .message-content, [data-test-id="message-content"] p, .user-query, .model-response-text');
      if (textContainers.length > 0 || attempts > 10) {
        clearInterval(scanInterval);
        recalculateCurrentChatTokens();
      }
    }, 300);
  }
}

function recalculateCurrentChatTokens() {
  const textContainers = document.querySelectorAll('user-message p, model-message p, .message-content, [data-test-id="message-content"] p, .user-query, .model-response-text');
  
  let inputTotal = 0;
  let outputTotal = 0;
  processedText.clear();
  
  textContainers.forEach(container => {
    if (container.querySelector('p')) return; // Avoid double counting if selector matches wrapper
    const text = container.innerText ? container.innerText.trim() : "";
    if (text.length > 5) {
      if (!processedText.has(text)) {
        processedText.add(text);
        
        const isUser = container.closest('user-message') || container.closest('.user-query') || container.closest('[data-message-author="user"]');
        const tokens = estimateTokens(text);
        if (isUser) {
          inputTotal += tokens;
        } else {
          outputTotal += tokens;
        }
      }
    }
  });
  
  cumulativeInputTokens = inputTotal;
  cumulativeOutputTokens = outputTotal;
  cumulativeTokens = inputTotal + outputTotal;
  
  if (elements.chatCurr) {
    elements.chatCurr.innerText = cumulativeTokens.toLocaleString();
    updateChatTokenColor(cumulativeTokens);
  }
  checkTokenBloat();
  updateEstimatedCost();
}

function updateEstimatedCost() {
  const model = MODEL_PRICING[activeModelKey];
  if (!model) return;
  const cost = (cumulativeInputTokens * model.input) + (cumulativeOutputTokens * model.output);
  const costEl = document.getElementById('ge-cost-curr');
  if (costEl) {
    costEl.innerText = `$${cost.toFixed(4)}`;
  }
  
  // Context Caching ROI check
  const cacheBadge = document.getElementById('ge-cache-badge');
  if (cacheBadge) {
    if (cumulativeTokens > 32768) {
      cacheBadge.style.display = 'inline-flex';
      const normalCost = (cumulativeInputTokens * model.input) + (cumulativeOutputTokens * model.output);
      const cachedCost = (cumulativeInputTokens * 0.2 * model.input) + (cumulativeOutputTokens * model.output);
      const savings = normalCost - cachedCost;
      cacheBadge.title = `Context Caching Candidate! Caching saves ~80% on inputs. Est. Savings: $${savings.toFixed(4)}`;
    } else {
      cacheBadge.style.display = 'none';
    }
  }
}

// Zero-Knowledge Privacy Shield logic
function detectSensitiveData(text) {
  const patterns = {
    gcpKey: /AIzaSy[A-Za-z0-9-_]{35}/,
    awsKey: /AKIA[A-Z0-9]{16}/,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  };
  
  return patterns.gcpKey.test(text) || patterns.awsKey.test(text) || patterns.creditCard.test(text) || patterns.email.test(text);
}

function getSensitiveDataMatches(text) {
  const patterns = {
    "GCP API Key": /AIzaSy[A-Za-z0-9-_]{35}/g,
    "AWS Key ID": /AKIA[A-Z0-9]{16}/g,
    "Credit Card": /\b(?:\d[ -]*?){13,16}\b/g,
    "Email Address": /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  };
  
  const found = [];
  Object.keys(patterns).forEach(label => {
    const matches = text.match(patterns[label]);
    if (matches) {
      matches.forEach(m => found.push({ label, match: m }));
    }
  });
  return found;
}

function redactSensitiveData(text) {
  const patterns = {
    gcpKey: /AIzaSy[A-Za-z0-9-_]{35}/g,
    awsKey: /AKIA[A-Z0-9]{16}/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  };
  
  return text
    .replace(patterns.gcpKey, "[REDACTED_GCP_KEY]")
    .replace(patterns.awsKey, "[REDACTED_AWS_KEY]")
    .replace(patterns.creditCard, "[REDACTED_CREDIT_CARD]")
    .replace(patterns.email, "[REDACTED_EMAIL]");
}

function triggerPrivacyAlert(originalText, onAction) {
  const overlay = document.createElement('div');
  overlay.className = 'gemineye-modal-overlay';
  
  const matches = getSensitiveDataMatches(originalText);
  const matchesListHTML = matches.map(m => `<li><strong>${m.label}</strong>: <code>${m.match.substring(0, 8)}...</code></li>`).join('');
  
  overlay.innerHTML = `
    <div class="gemineye-modal">
      <div class="gemineye-modal-header">⚠️ Sensitive Data Pre-Flight Warning</div>
      <div class="gemineye-modal-body">
        <p>GeminEye intercepted the following sensitive identifiers in your message before submission:</p>
        <ul style="text-align: left; margin: 12px 0; padding-left: 20px; font-size: 11px;">
          ${matchesListHTML}
        </ul>
        <p>Choose an action to proceed safely:</p>
      </div>
      <div class="gemineye-modal-footer">
        <button class="ge-modal-btn redact-btn">Auto-Redact</button>
        <button class="ge-modal-btn bypass-btn">Send Anyway</button>
        <button class="ge-modal-btn cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  
  overlay.querySelector('.redact-btn').addEventListener('click', () => {
    overlay.remove();
    onAction(redactSensitiveData(originalText));
  });
  
  overlay.querySelector('.bypass-btn').addEventListener('click', () => {
    overlay.remove();
    onAction(originalText);
  });
  
  overlay.querySelector('.cancel-btn').addEventListener('click', () => {
    overlay.remove();
    onAction(null);
  });
  
  document.body.appendChild(overlay);
}

function updateTextBox(newText) {
  const txtBox = document.querySelector('rich-textarea > div, .ql-editor, textarea, [contenteditable="true"]');
  if (!txtBox) return;
  txtBox.focus();
  
  if (txtBox.tagName && txtBox.tagName.toLowerCase() === 'textarea') {
    txtBox.value = newText;
  } else {
    txtBox.innerHTML = '';
    document.execCommand('insertText', false, newText);
  }
  txtBox.dispatchEvent(new Event('input', { bubbles: true }));
}

function handlePreFlightClick(e) {
  if (!isPrivacyShieldActive) return;
  
  const sendBtn = e.target.closest('button[type="submit"], button[aria-label*="Send"], button.send-button');
  if (sendBtn) {
    const txtBox = document.querySelector('rich-textarea > div, .ql-editor, textarea, [contenteditable="true"]');
    if (txtBox) {
      const text = txtBox.innerText || txtBox.value || "";
      if (detectSensitiveData(text)) {
        e.stopPropagation();
        e.preventDefault();
        triggerPrivacyAlert(text, (updatedText) => {
          if (updatedText !== null) {
            updateTextBox(updatedText);
            isPrivacyShieldActive = false;
            sendBtn.click();
            setTimeout(() => { isPrivacyShieldActive = true; }, 100);
          }
        });
      }
    }
  }
}

function handlePreFlightKeydown(e) {
  if (!isPrivacyShieldActive) return;
  
  if (e.key === 'Enter' && !e.shiftKey) {
    const txtBox = e.target.closest('rich-textarea > div, .ql-editor, textarea, [contenteditable="true"]');
    if (txtBox) {
      const text = txtBox.innerText || txtBox.value || "";
      if (detectSensitiveData(text)) {
        e.stopPropagation();
        e.preventDefault();
        triggerPrivacyAlert(text, (updatedText) => {
          if (updatedText !== null) {
            updateTextBox(updatedText);
            isPrivacyShieldActive = false;
            const sendBtn = document.querySelector('button[type="submit"], button[aria-label*="Send"], button.send-button');
            if (sendBtn) {
              sendBtn.click();
            } else {
              txtBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            }
            setTimeout(() => { isPrivacyShieldActive = true; }, 100);
          }
        });
      }
    }
  }
}

function setupPreFlightInterceptor() {
  document.addEventListener('click', handlePreFlightClick, true);
  document.addEventListener('keydown', handlePreFlightKeydown, true);
}

window.addEventListener('load', () => {
  initUI();
  observeChat();
});
