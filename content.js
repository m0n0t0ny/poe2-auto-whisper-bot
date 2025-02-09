// Keep observer reference
let observer = null;
let lastClickTime = 0;
const CLICK_DELAY = 1000; // 1 second delay between clicks

// Function to click button with delay
async function clickDirectWhisperButton(button) {
  const now = Date.now();
  if (now - lastClickTime < CLICK_DELAY) {
    console.log("Waiting for delay before next click...");
    await new Promise((resolve) => setTimeout(resolve, CLICK_DELAY));
  }

  console.log("Attempting to click button:", button);
  try {
    // Check if button is still in DOM
    if (!document.contains(button)) {
      console.log("Button is no longer in DOM");
      return;
    }

    // Check if button is visible
    const rect = button.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log("Button is not visible");
      return;
    }

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    button.dispatchEvent(clickEvent);
    lastClickTime = Date.now();
    console.log("Click executed successfully");
  } catch (error) {
    console.error("Error during click:", error);
  }
}

// Function to check if element is target button
function isTargetButton(element) {
  try {
    const isButton = element.tagName === "BUTTON";
    const text = element.textContent?.trim() || "";
    const isCorrectText = text.toLowerCase() === "direct whisper";
    const isVisible = element.offsetParent !== null;
    const isEnabled = !element.disabled;

    console.log("Button check:", {
      element: element,
      isButton,
      "found text": text,
      "correct text": isCorrectText,
      visible: isVisible,
      enabled: isEnabled
    });

    return isButton && isCorrectText && isVisible && isEnabled;
  } catch (error) {
    console.error("Error during button check:", error);
    return false;
  }
}

// Function to process nodes with rate limiting
function processNode(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Search for target buttons in children
    const buttons = node.querySelectorAll("button");
    Array.from(buttons).forEach((button) => {
      if (isTargetButton(button)) {
        console.log("Found target button:", button);
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

// Function to start bot
function startBot() {
  console.log("Starting bot...");
  if (observer) {
    console.log("Bot already running");
    return;
  }

  // Search and click any existing buttons
  const existingButtons = document.querySelectorAll("button");
  Array.from(existingButtons).forEach((button) => {
    if (isTargetButton(button)) {
      clickDirectWhisperButton(button);
    }
  });

  // Create and start observer with debounce
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
  console.log("Bot started and listening...");
}

// Function to stop bot
function stopBot() {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log("Bot stopped.");
  }
}

// Handle extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startBot") {
    startBot();
  } else if (request.action === "stopBot") {
    stopBot();
  }
});

// Check initial state
chrome.storage.local.get(["botEnabled"], function (result) {
  if (result.botEnabled) {
    startBot();
  }
});
