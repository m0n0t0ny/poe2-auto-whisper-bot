document.addEventListener("DOMContentLoaded", function () {
  // UI Elements
  const botToggle = document.getElementById("botToggle");
  const statusText = document.getElementById("botStatus");
  const clickDelay = document.getElementById("clickDelay");
  const loggingToggle = document.getElementById("loggingToggle");
  const retryToggle = document.getElementById("retryToggle");
  const resetStats = document.getElementById("resetStats");
  const whitelistToggle = document.getElementById("whitelistToggle");
  const whitelistContent = document.getElementById("whitelistContent");
  const whitelistUrls = document.getElementById("whitelistUrls");
  const newUrlInput = document.getElementById("newUrlInput");
  const addUrlButton = document.getElementById("addUrl");
  const rateLimitToggle = document.getElementById("rateLimitToggle");
  const rateLimitContent = document.getElementById("rateLimitContent");
  const maxClicksInput = document.getElementById("maxClicks");
  const timeWindowInput = document.getElementById("timeWindow");

  // Stats elements
  const totalClicks = document.getElementById("totalClicks");
  const successRate = document.getElementById("successRate");
  const uptime = document.getElementById("uptime");
  const lastClick = document.getElementById("lastClick");

  // Load all settings and stats
  chrome.storage.local.get(
    [
      "botEnabled",
      "clickDelay",
      "loggingEnabled",
      "retryEnabled",
      "stats",
      "whitelistEnabled",
      "whitelist",
      "rateLimitEnabled",
      "rateLimit"
    ],
    function (result) {
      // Load basic settings
      botToggle.checked = result.botEnabled || false;
      clickDelay.value = result.clickDelay || 1000;
      loggingToggle.checked = result.loggingEnabled || false;
      retryToggle.checked = result.retryEnabled || false;

      // Load whitelist settings
      whitelistToggle.checked = result.whitelistEnabled || false;
      whitelistContent.style.display = whitelistToggle.checked
        ? "block"
        : "none";
      updateWhitelistUI(result.whitelist || []);

      // Load rate limit settings
      rateLimitToggle.checked = result.rateLimitEnabled || false;
      rateLimitContent.style.display = rateLimitToggle.checked
        ? "block"
        : "none";
      const rateLimit = result.rateLimit || { maxClicks: 5, timeWindow: 30 };
      maxClicksInput.value = rateLimit.maxClicks;
      timeWindowInput.value = rateLimit.timeWindow;

      // Load stats
      updateStats(
        result.stats || {
          totalClicks: 0,
          successfulClicks: 0,
          startTime: null,
          lastClickTime: null
        }
      );

      updateStatus(result.botEnabled);
    }
  );

  // Bot toggle handler
  botToggle.addEventListener("change", function () {
    const isEnabled = botToggle.checked;
    chrome.storage.local.set({ botEnabled: isEnabled });
    updateStatus(isEnabled);

    // Update start time if enabling
    if (isEnabled) {
      chrome.storage.local.get(["stats"], function (result) {
        const stats = result.stats || {};
        stats.startTime = stats.startTime || Date.now();
        chrome.storage.local.set({ stats });
      });
    }

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: isEnabled ? "startBot" : "stopBot",
        settings: {
          clickDelay: parseInt(clickDelay.value),
          loggingEnabled: loggingToggle.checked,
          retryEnabled: retryToggle.checked,
          whitelistEnabled: whitelistToggle.checked,
          rateLimitEnabled: rateLimitToggle.checked,
          rateLimit: {
            maxClicks: parseInt(maxClicksInput.value),
            timeWindow: parseInt(timeWindowInput.value)
          }
        }
      });
    });
  });

  // Settings change handlers
  function updateSetting(key, value) {
    chrome.storage.local.set({ [key]: value });
    if (botToggle.checked) {
      updateBotState();
    }
  }

  clickDelay.addEventListener("change", () => {
    updateSetting("clickDelay", parseInt(clickDelay.value));
  });

  loggingToggle.addEventListener("change", () => {
    updateSetting("loggingEnabled", loggingToggle.checked);
  });

  retryToggle.addEventListener("change", () => {
    updateSetting("retryEnabled", retryToggle.checked);
  });

  // Whitelist handlers
  function updateWhitelistUI(whitelist) {
    whitelistUrls.innerHTML = "";
    whitelist.forEach((url) => {
      const div = document.createElement("div");
      div.className = "url-item";
      div.innerHTML = `
                <span>${url}</span>
                <button class="remove-url" data-url="${url}">×</button>
            `;
      whitelistUrls.appendChild(div);
    });
  }

  whitelistToggle.addEventListener("change", function () {
    const isEnabled = whitelistToggle.checked;
    whitelistContent.style.display = isEnabled ? "block" : "none";
    chrome.storage.local.set({ whitelistEnabled: isEnabled });
    updateBotState();
  });

  addUrlButton.addEventListener("click", function () {
    const url = newUrlInput.value.trim();
    if (url) {
      chrome.storage.local.get(["whitelist"], function (result) {
        const whitelist = result.whitelist || [];
        if (!whitelist.includes(url)) {
          whitelist.push(url);
          chrome.storage.local.set({ whitelist });
          updateWhitelistUI(whitelist);
          newUrlInput.value = "";
        }
      });
    }
  });

  whitelistUrls.addEventListener("click", function (e) {
    if (e.target.classList.contains("remove-url")) {
      const urlToRemove = e.target.dataset.url;
      chrome.storage.local.get(["whitelist"], function (result) {
        const whitelist = result.whitelist || [];
        const newWhitelist = whitelist.filter((url) => url !== urlToRemove);
        chrome.storage.local.set({ whitelist: newWhitelist });
        updateWhitelistUI(newWhitelist);
      });
    }
  });

  // Rate limit handlers
  rateLimitToggle.addEventListener("change", function () {
    const isEnabled = rateLimitToggle.checked;
    rateLimitContent.style.display = isEnabled ? "block" : "none";
    chrome.storage.local.set({ rateLimitEnabled: isEnabled });
    updateRateLimit();
  });

  function updateRateLimit() {
    const rateLimit = {
      maxClicks: parseInt(maxClicksInput.value),
      timeWindow: parseInt(timeWindowInput.value)
    };
    chrome.storage.local.set({ rateLimit });
    updateBotState();
  }

  maxClicksInput.addEventListener("change", updateRateLimit);
  timeWindowInput.addEventListener("change", updateRateLimit);

  // Reset stats handler
  resetStats.addEventListener("click", function () {
    const newStats = {
      totalClicks: 0,
      successfulClicks: 0,
      startTime: botToggle.checked ? Date.now() : null,
      lastClickTime: null
    };
    chrome.storage.local.set({ stats: newStats });
    updateStats(newStats);
  });

  // Update functions
  function updateStatus(enabled) {
    statusText.textContent = enabled ? "Enabled" : "Disabled";
    statusText.style.color = enabled ? "#4608ac" : "#666";
  }

  function updateStats(stats) {
    totalClicks.textContent = stats.totalClicks;

    const success = stats.successfulClicks || 0;
    const total = stats.totalClicks || 0;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    successRate.textContent = rate + "%";

    if (stats.startTime) {
      const uptimeMs = Date.now() - stats.startTime;
      const uptimeMin = Math.round(uptimeMs / (1000 * 60));
      uptime.textContent = uptimeMin + "m";
    } else {
      uptime.textContent = "-";
    }

    if (stats.lastClickTime) {
      const lastClickDate = new Date(stats.lastClickTime);
      lastClick.textContent = lastClickDate.toLocaleTimeString();
    } else {
      lastClick.textContent = "-";
    }
  }

  // Update bot state with all settings
  function updateBotState() {
    if (botToggle.checked) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "updateSettings",
          settings: {
            clickDelay: parseInt(clickDelay.value),
            loggingEnabled: loggingToggle.checked,
            retryEnabled: retryToggle.checked,
            whitelistEnabled: whitelistToggle.checked,
            rateLimitEnabled: rateLimitToggle.checked,
            rateLimit: {
              maxClicks: parseInt(maxClicksInput.value),
              timeWindow: parseInt(timeWindowInput.value)
            }
          }
        });
      });
    }
  }

  // Listen for stats updates
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "statsUpdate") {
      updateStats(request.stats);
    }
  });
});
