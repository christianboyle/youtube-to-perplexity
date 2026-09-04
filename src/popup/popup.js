const fields = {
  promptTemplate: document.getElementById("promptTemplate"),
  batchPromptTemplate: document.getElementById("batchPromptTemplate"),
  focus: document.getElementById("focus"),
  batchMode: document.getElementById("batchMode"),
  openInBackground: document.getElementById("openInBackground"),
};

const statusEl = document.getElementById("status");
const saveButton = document.getElementById("save");
const sendCurrentButton = document.getElementById("sendCurrent");

init();

async function init() {
  const settings = await YTPStorage.getSettings();
  fields.promptTemplate.value = settings.promptTemplate;
  fields.batchPromptTemplate.value = settings.batchPromptTemplate;
  fields.focus.value = settings.focus;
  fields.batchMode.value = settings.batchMode;
  fields.openInBackground.checked = settings.openInBackground;

  saveButton.addEventListener("click", onSave);
  sendCurrentButton.addEventListener("click", onSendCurrent);
}

async function onSave() {
  await YTPStorage.saveSettings({
    promptTemplate: fields.promptTemplate.value.trim(),
    batchPromptTemplate: fields.batchPromptTemplate.value.trim(),
    focus: fields.focus.value,
    batchMode: fields.batchMode.value,
    openInBackground: fields.openInBackground.checked,
  });
  setStatus("Settings saved");
}

async function onSendCurrent() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab found", true);
    return;
  }

  if (tab.url?.includes("youtube.com")) {
    try {
      await browser.tabs.sendMessage(tab.id, { type: "SEND_CURRENT_PAGE" });
      setStatus("Sent current YouTube page");
      return;
    } catch {
      // Fall through to generic URL handling
    }
  }

  if (!tab.url) {
    setStatus("Could not read the current tab URL", true);
    return;
  }

  const settings = await YTPStorage.getSettings();
  const prompt = YTPPerplexity.buildVideoPrompt(
    { url: tab.url, title: tab.title || "Current page" },
    settings.promptTemplate
  );
  const result = await YTPSend.sendPromptToPerplexity(prompt, settings);

  if (result?.ok) {
    setStatus("Opened Perplexity for the current tab");
  } else {
    setStatus(result?.error || "Failed to open Perplexity", true);
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("status--error", isError);
}
