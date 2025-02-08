// Manteniamo il riferimento all'observer
let observer = null;
let lastClickTime = 0;
const CLICK_DELAY = 1000; // 1 secondo di delay tra i click

// Funzione per cliccare il pulsante con delay
async function clickDirectWhisperButton(button) {
  const now = Date.now();
  if (now - lastClickTime < CLICK_DELAY) {
    console.log("Aspetto il delay prima del prossimo click...");
    await new Promise((resolve) => setTimeout(resolve, CLICK_DELAY));
  }

  console.log("Tentativo di click sul pulsante:", button);
  try {
    // Verifica se il pulsante è ancora nel DOM
    if (!document.contains(button)) {
      console.log("Il pulsante non è più nel DOM");
      return;
    }

    // Verifica se il pulsante è visibile
    const rect = button.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log("Il pulsante non è visibile");
      return;
    }

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    button.dispatchEvent(clickEvent);
    lastClickTime = Date.now();
    console.log("Click eseguito con successo");
  } catch (error) {
    console.error("Errore durante il click:", error);
  }
}

// Funzione per verificare se un elemento è il pulsante target
function isTargetButton(element) {
  try {
    const isButton = element.tagName === "BUTTON";
    const text = element.textContent?.trim() || "";
    const isCorrectText = text.toLowerCase() === "direct whisper";
    const isVisible = element.offsetParent !== null;
    const isEnabled = !element.disabled;

    console.log("Verifica pulsante:", {
      elemento: element,
      isButton,
      "testo trovato": text,
      "testo corretto": isCorrectText,
      visibile: isVisible,
      abilitato: isEnabled
    });

    return isButton && isCorrectText && isVisible && isEnabled;
  } catch (error) {
    console.error("Errore durante la verifica del pulsante:", error);
    return false;
  }
}

// Funzione per processare i nodi con rate limiting
function processNode(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Cerca pulsanti target nei figli
    const buttons = node.querySelectorAll("button");
    Array.from(buttons).forEach((button) => {
      if (isTargetButton(button)) {
        console.log("Trovato pulsante target:", button);
        clickDirectWhisperButton(button);
      }
    });
  }
}

// Configurazione dell'observer
const observerConfig = {
  childList: true,
  subtree: true,
  attributes: true
};

// Funzione per avviare il bot
function startBot() {
  console.log("Avvio del bot...");
  if (observer) {
    console.log("Bot già in esecuzione");
    return;
  }

  // Cerca e clicca eventuali pulsanti già presenti
  const existingButtons = document.querySelectorAll("button");
  Array.from(existingButtons).forEach((button) => {
    if (isTargetButton(button)) {
      clickDirectWhisperButton(button);
    }
  });

  // Crea e avvia l'observer con debounce
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
    }, 100); // Debounce di 100ms
  });

  observer.observe(document.body, observerConfig);
  console.log("Bot avviato e in ascolto...");
}

// Funzione per fermare il bot
function stopBot() {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log("Bot fermato.");
  }
}

// Gestione dei messaggi dall'estensione
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startBot") {
    startBot();
  } else if (request.action === "stopBot") {
    stopBot();
  }
});

// Controlla lo stato iniziale
chrome.storage.local.get(["botEnabled"], function (result) {
  if (result.botEnabled) {
    startBot();
  }
});
