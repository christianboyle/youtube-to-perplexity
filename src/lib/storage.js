/**
 * Default settings and storage helpers for YouTube to Perplexity.
 */
const DEFAULT_SETTINGS = {
  promptTemplate: "Summarize this video for me: {url}",
  batchPromptTemplate:
    "Summarize these videos for me:\n\n{urls}",
  focus: "youtube",
  batchMode: "single",
  openInBackground: false,
  maxBatchSize: 10,
};

async function getSettings() {
  const stored = await browser.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(partial) {
  await browser.storage.sync.set(partial);
  return getSettings();
}

// Expose for content scripts and popup
if (typeof globalThis !== "undefined") {
  globalThis.YTPStorage = { DEFAULT_SETTINGS, getSettings, saveSettings };
}
