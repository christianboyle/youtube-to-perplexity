/**
 * Shared logic for sending prompts to Perplexity.
 */
const PERPLEXITY_HOME = "https://www.perplexity.ai/";
const PENDING_PROMPT_KEY = "pendingPrompt";
const PENDING_PROMPT_AT_KEY = "pendingPromptAt";

async function sendPromptToPerplexity(prompt, settings = {}) {
  const openInBackground = settings.openInBackground ?? false;

  await browser.storage.local.set({
    [PENDING_PROMPT_KEY]: prompt,
    [PENDING_PROMPT_AT_KEY]: Date.now(),
  });

  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    // Perplexity content script will paste from session storage.
  }

  if (typeof browser !== "undefined" && browser.tabs?.create) {
    await browser.tabs.create({ url: PERPLEXITY_HOME, active: !openInBackground });
    return { ok: true };
  }

  window.open(PERPLEXITY_HOME, "_blank", "noopener");
  return { ok: true };
}

async function sendVideosToPerplexity(videos, settings) {
  if (!videos?.length) {
    return { ok: false, error: "No videos found" };
  }

  const limited = videos.slice(0, settings.maxBatchSize);

  if (limited.length === 1 || settings.batchMode === "separate") {
    for (const video of limited) {
      const prompt = YTPPerplexity.buildVideoPrompt(video, settings.promptTemplate);
      await sendPromptToPerplexity(prompt, settings);
      if (limited.length > 1) {
        await delay(300);
      }
    }
    return { ok: true, count: limited.length, mode: "separate" };
  }

  const prompt = YTPPerplexity.buildBatchPrompt(limited, settings.batchPromptTemplate);
  await sendPromptToPerplexity(prompt, settings);
  return { ok: true, count: limited.length, mode: "single" };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (typeof globalThis !== "undefined") {
  globalThis.YTPSend = {
    PERPLEXITY_HOME,
    PENDING_PROMPT_KEY,
    PENDING_PROMPT_AT_KEY,
    sendPromptToPerplexity,
    sendVideosToPerplexity,
  };
}
