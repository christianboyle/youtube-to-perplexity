/**
 * YouTube page detection and video URL extraction.
 */
const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);

function getPageType() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path === "/watch" && params.get("v")) {
    return "video";
  }
  if (path === "/playlist" && params.get("list")) {
    return "playlist";
  }
  if (path.startsWith("/@") || path.startsWith("/channel/") || path.startsWith("/c/") || path.startsWith("/user/")) {
    if (path.includes("/videos") || path.includes("/streams") || path.includes("/shorts") || path.endsWith("/featured")) {
      return "channel";
    }
    if (!path.includes("/")) {
      return "channel";
    }
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 2) {
      return "channel";
    }
  }
  if (path === "/results" && params.get("search_query")) {
    return "search";
  }
  return "other";
}

function normalizeVideoId(id) {
  return id?.trim() ?? "";
}

function buildWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function getCurrentVideo() {
  const params = new URLSearchParams(window.location.search);
  const videoId = normalizeVideoId(params.get("v"));
  if (!videoId) {
    return null;
  }

  const title =
    document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent?.trim() ||
    document.querySelector("#title h1")?.textContent?.trim() ||
    document.title.replace(" - YouTube", "").trim();

  return {
    id: videoId,
    url: buildWatchUrl(videoId),
    title: title || "YouTube video",
  };
}

function extractVideoFromLink(href) {
  try {
    const url = new URL(href, window.location.origin);
    if (!YOUTUBE_HOSTS.has(url.hostname)) {
      return null;
    }

    const videoId = normalizeVideoId(url.searchParams.get("v"));
    if (!videoId) {
      return null;
    }

    return {
      id: videoId,
      url: buildWatchUrl(videoId),
    };
  } catch {
    return null;
  }
}

function extractVideosFromPage(limit = 50) {
  const seen = new Set();
  const videos = [];

  const anchors = document.querySelectorAll('a[href*="/watch?v="]');
  for (const anchor of anchors) {
    const parsed = extractVideoFromLink(anchor.href);
    if (!parsed || seen.has(parsed.id)) {
      continue;
    }

    seen.add(parsed.id);

    const titleEl =
      anchor.closest("ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, ytd-compact-video-renderer")
        ?.querySelector("#video-title") ||
      anchor.querySelector("#video-title") ||
      anchor;

    const title = titleEl.textContent?.trim() || `Video ${parsed.id}`;

    videos.push({
      id: parsed.id,
      url: parsed.url,
      title,
    });

    if (videos.length >= limit) {
      break;
    }
  }

  return videos;
}

function getPageLabel(pageType) {
  switch (pageType) {
    case "video":
      return "video";
    case "playlist":
      return "playlist";
    case "channel":
      return "channel";
    case "search":
      return "search results";
    default:
      return "page";
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.YTPYouTube = {
    getPageType,
    getCurrentVideo,
    extractVideoFromLink,
    extractVideosFromPage,
    getPageLabel,
    buildWatchUrl,
  };
}
