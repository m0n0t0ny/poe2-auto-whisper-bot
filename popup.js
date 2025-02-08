document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("botToggle");
  const statusText = document.getElementById("botStatus");

  // Carica lo stato iniziale
  chrome.storage.local.get(["botEnabled"], function (result) {
    toggle.checked = result.botEnabled || false;
    updateStatus(result.botEnabled);
  });

  // Gestisce il cambio di stato
  toggle.addEventListener("change", function () {
    const isEnabled = toggle.checked;

    // Salva lo stato
    chrome.storage.local.set({ botEnabled: isEnabled });

    // Aggiorna lo stato visuale
    updateStatus(isEnabled);

    // Invia un messaggio al content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: isEnabled ? "startBot" : "stopBot"
      });
    });
  });

  function updateStatus(enabled) {
    statusText.textContent = enabled ? "Attivato" : "Disattivato";
    statusText.style.color = enabled ? "#2196F3" : "#666";
  }
});
