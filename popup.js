document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("botToggle");
  const statusText = document.getElementById("botStatus");

  // Load initial state
  chrome.storage.local.get(["botEnabled"], function (result) {
    toggle.checked = result.botEnabled || false;
    updateStatus(result.botEnabled);
  });

  // Handle state change
  toggle.addEventListener("change", function () {
    const isEnabled = toggle.checked;

    // Save state
    chrome.storage.local.set({ botEnabled: isEnabled });

    // Update visual status
    updateStatus(isEnabled);

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: isEnabled ? "startBot" : "stopBot"
      });
    });
  });

  function updateStatus(enabled) {
    statusText.textContent = enabled ? "Enabled" : "Disabled";
    statusText.style.color = enabled ? "#2196F3" : "#666";
  }
});
