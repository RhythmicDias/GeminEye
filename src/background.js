// background.js

chrome.runtime.onInstalled.addListener(() => {
  initStorage();
});

function initStorage() {
  chrome.storage.local.get(['usageData'], (result) => {
    if (!result.usageData) {
      chrome.storage.local.set({
        usageData: {
          hourlyTokensIn: 0,
          hourlyTokensOut: 0,
          dailyTokensIn: 0,
          dailyTokensOut: 0,
          hourlyPrompts: 0,
          dailyPrompts: 0,
          lastHourlyReset: Date.now(),
          lastDailyReset: Date.now()
        }
      });
    }
  });
}

function checkResets(data) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let updated = false;

  if (now - data.lastHourlyReset > ONE_HOUR) {
    data.hourlyTokensIn = 0;
    data.hourlyTokensOut = 0;
    data.hourlyPrompts = 0;
    data.lastHourlyReset = now;
    updated = true;
  }
  if (now - data.lastDailyReset > ONE_DAY) {
    data.dailyTokensIn = 0;
    data.dailyTokensOut = 0;
    data.dailyPrompts = 0;
    data.lastDailyReset = now;
    updated = true;
  }
  return { updated, data };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addUsage') {
    chrome.storage.local.get(['usageData'], (result) => {
      let { updated, data } = checkResets(result.usageData || {
        hourlyTokensIn: 0,
        hourlyTokensOut: 0,
        dailyTokensIn: 0,
        dailyTokensOut: 0,
        hourlyPrompts: 0,
        dailyPrompts: 0,
        lastHourlyReset: Date.now(),
        lastDailyReset: Date.now()
      });
      
      if (request.type === 'input') {
        data.hourlyTokensIn += request.tokens;
        data.dailyTokensIn += request.tokens;
        data.hourlyPrompts += 1;
        data.dailyPrompts += 1;
      } else if (request.type === 'output') {
        data.hourlyTokensOut += request.tokens;
        data.dailyTokensOut += request.tokens;
      }

      chrome.storage.local.set({ usageData: data }, () => {
        sendResponse({ success: true, usageData: data });
      });
    });
    return true; 
  }
  
  if (request.action === 'getUsage') {
    chrome.storage.local.get(['usageData'], (result) => {
        let { updated, data } = checkResets(result.usageData || {
          hourlyTokensIn: 0,
          hourlyTokensOut: 0,
          dailyTokensIn: 0,
          dailyTokensOut: 0,
          hourlyPrompts: 0,
          dailyPrompts: 0,
          lastHourlyReset: Date.now(),
          lastDailyReset: Date.now()
        });
        if (updated) {
            chrome.storage.local.set({ usageData: data });
        }
        sendResponse({ usageData: data });
    });
    return true;
  }
});
