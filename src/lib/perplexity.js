/**
 * Build Perplexity search URLs with optional focus mode.
 * @see https://www.perplexity.ai/search?focus=youtube&q=...
 */
const PERPLEXITY_SEARCH_BASE = "https://www.perplexity.ai/search";

const FOCUS_MODES = {
  youtube: "youtube",
  internet: "internet",
  scholar: "scholar",
  reddit: "reddit",
  writing: "writing",
  wolfram: "wolfram",
};

function buildPerplexityUrl(query, focus = "youtube") {
  const params = new URLSearchParams();
  if (focus && focus !== "internet") {
    params.set("focus", focus);
  }
  params.set("q", query);
  return `${PERPLEXITY_SEARCH_BASE}?${params.toString()}`;
}

function fillTemplate(template, values) {
  return template
    .replaceAll("{url}", values.url ?? "")
    .replaceAll("{title}", values.title ?? "")
    .replaceAll("{urls}", values.urls ?? "");
}

function buildVideoPrompt(video, template) {
  return fillTemplate(template, {
    url: video.url,
    title: video.title,
    urls: `- ${video.title}\n  ${video.url}`,
  });
}

function buildBatchPrompt(videos, template) {
  const urls = videos
    .map((video, index) => `${index + 1}. ${video.title}\n   ${video.url}`)
    .join("\n\n");

  return fillTemplate(template, {
    url: videos[0]?.url ?? "",
    title: videos[0]?.title ?? "",
    urls,
  });
}

if (typeof globalThis !== "undefined") {
  globalThis.YTPPerplexity = {
    PERPLEXITY_SEARCH_BASE,
    FOCUS_MODES,
    buildPerplexityUrl,
    fillTemplate,
    buildVideoPrompt,
    buildBatchPrompt,
  };
}
