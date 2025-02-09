// Global state
let observer = null;
let lastClickTime = 0;
let clickHistory = [];
let settings = {
  clickDelay: 1000,
  loggingEnabled: false,
  retryEnabled: false,
  whitelistEnabled: false,
  rateLimitEnabled: false,
  rateLimit: {
    maxClicks: 5,
    timeWindow: 30
  }
};
let stats = {
  totalClicks: 0,
  successfulClicks: 0,
  startTime: null,
  lastClickTime: null
};

// Logging function
function log(...args) {
  if (settings.loggingEnabled) {
    console.log("[Auto Whisper Bot]:", ...args);
  }
}

// Update stats in storage and UI
function updateStats(success = false) {
  stats.totalClicks++;
  if (success) stats.successfulClicks++;
  stats.lastClickTime = Date.now();

  chrome.storage.local.set({ stats });
  chrome.runtime.sendMessage({
    action: "statsUpdate",
    stats
  });
}

// Check if current URL is whitelisted
async function isUrlWhitelisted() {
  if (!settings.whitelistEnabled) return true;

  const result = await chrome.storage.local.get(["whitelist"]);
  const whitelist = result.whitelist || [];
  const currentUrl = window.location.href;

  return whitelist.some((pattern) => currentUrl.includes(pattern));
}

// Check rate limit
function checkRateLimit() {
  if (!settings.rateLimitEnabled) return true;

  const now = Date.now();
  const timeWindowMs = settings.rateLimit.timeWindow * 1000;

  // Remove old clicks from history
  clickHistory = clickHistory.filter((time) => now - time < timeWindowMs);

  // Check if we're within limits
  return clickHistory.length < settings.rateLimit.maxClicks;
}

// Update click history
function updateClickHistory() {
  clickHistory.push(Date.now());
}

// Click button with all checks and retries
async function clickDirectWhisperButton(button) {
  // Check whitelist
  if (!(await isUrlWhitelisted())) {
    log("URL not in whitelist, skipping click");
    return;
  }

  // Check rate limit
  if (!checkRateLimit()) {
    log("Rate limit reached, skipping click");
    return;
  }

  const now = Date.now();
  if (now - lastClickTime < settings.clickDelay) {
    log("Waiting for delay before next click...");
    await new Promise((resolve) => setTimeout(resolve, settings.clickDelay));
  }

  log("Attempting to click button:", button);
  try {
    // Check if button is still valid
    if (!document.contains(button)) {
      log("Button is no longer in DOM");
      return;
    }

    const rect = button.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      log("Button is not visible");
      return;
    }

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    });

    // Try to click with retry logic
    let success = false;
    let retries = settings.retryEnabled ? 3 : 1;

    while (retries > 0 && !success) {
      button.dispatchEvent(clickEvent);

      // Wait a bit to see if the click causes any errors
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if button is still clickable (might indicate success)
      if (!document.contains(button) || button.disabled) {
        success = true;
      } else {
        retries--;
        if (retries > 0) {
          log("Click might have failed, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    lastClickTime = Date.now();
    updateClickHistory();
    updateStats(success);
    log(success ? "Click successful" : "Click might have failed");
  } catch (error) {
    log("Error during click:", error);
    updateStats(false);
  }
}

// Check if element is target button
function isTargetButton(element) {
  try {
    const isButton = element.tagName === "BUTTON";
    const text = element.textContent?.trim() || "";
    const isCorrectText = text.toLowerCase() === "direct whisper";
    const isVisible = element.offsetParent !== null;
    const isEnabled = !element.disabled;

    log("Button check:", {
      element,
      isButton,
      "text found": text,
      "correct text": isCorrectText,
      visible: isVisible,
      enabled: isEnabled
    });

    return isButton && isCorrectText && isVisible && isEnabled;
  } catch (error) {
    log("Error checking button:", error);
    return false;
  }
}

// Process DOM nodes
function processNode(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Check all buttons in this node and its children
    const buttons = node.querySelectorAll("button");
    Array.from(buttons).forEach((button) => {
      if (isTargetButton(button)) {
        log("Found target button:", button);
        clickDirectWhisperButton(button);
      }
    });
  }
}

// Observer configuration
const observerConfig = {
  childList: true,
  subtree: true,
  attributes: true
};

// Start bot function
function startBot() {
  log("Starting bot...");
  if (observer) {
    log("Bot already running");
    return;
  }

  // Initialize stats
  stats.startTime = Date.now();
  chrome.storage.local.set({ stats });

  // Check existing buttons
  const existingButtons = document.querySelectorAll("button");
  Array.from(existingButtons).forEach((button) => {
    if (isTargetButton(button)) {
      clickDirectWhisperButton(button);
    }
  });

  // Create observer with debounce
  let timeoutId = null;
  observer = new MutationObserver((mutations) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            processNode(node);
          });
        }
      });
    }, 100); // 100ms debounce
  });

  observer.observe(document.body, observerConfig);
  log("Bot started and listening...");
}

// Stop bot function
function stopBot() {
  if (observer) {
    observer.disconnect();
    observer = null;
    log("Bot stopped.");

    // Reset click history when stopping
    clickHistory = [];
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startBot") {
    settings = { ...settings, ...request.settings };
    startBot();
  } else if (request.action === "stopBot") {
    stopBot();
  } else if (request.action === "updateSettings") {
    settings = { ...settings, ...request.settings };
    log("Settings updated:", settings);
  }
});

// Load initial state and settings
chrome.storage.local.get(
  [
    "botEnabled",
    "clickDelay",
    "loggingEnabled",
    "retryEnabled",
    "whitelistEnabled",
    "rateLimitEnabled",
    "rateLimit",
    "stats"
  ],
  function (result) {
    settings = {
      clickDelay: result.clickDelay || 1000,
      loggingEnabled: result.loggingEnabled || false,
      retryEnabled: result.retryEnabled || false,
      whitelistEnabled: result.whitelistEnabled || false,
      rateLimitEnabled: result.rateLimitEnabled || false,
      rateLimit: result.rateLimit || {
        maxClicks: 5,
        timeWindow: 30
      }
    };

    stats = result.stats || {
      totalClicks: 0,
      successfulClicks: 0,
      startTime: null,
      lastClickTime: null
    };

    if (result.botEnabled) {
      startBot();
    }
  }
);
