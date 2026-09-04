const PERPLEXITY_ICON_SVG = `<svg viewBox="0 0 96 111" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12.9781479,0 L44.5334795,29.0735342 L44.5334795,29.0668712 L44.5334795,0.0670860274 L50.6760767,0.0670860274 L50.6760767,29.2036384 L82.3727342,0 L82.3727342,33.1481425 L95.3863014,33.1481425 L95.3863014,80.9612274 L82.4127123,80.9612274 L82.4127123,110.478027 L50.6760767,82.5950685 L50.6760767,110.798203 L44.5334795,110.798203 L44.5334795,83.0548164 L13.0139178,110.816438 L13.0139178,80.9612274 L0,80.9612274 L0,33.1481425 L12.9781479,33.1481425 L12.9781479,0 Z M39.9026849,39.2156932 L6.14256219,39.2156932 L6.14256219,74.8936767 L13.0062027,74.8936767 L13.0062027,63.6394959 L39.9026849,39.2156932 Z M19.1561644,66.3317041 L19.1561644,97.2771945 L44.5334795,74.925589 L44.5334795,43.2818849 L19.1561644,66.3317041 Z M50.8528219,74.6299616 L50.8528219,43.2520767 L76.2375014,66.3032986 L76.2375014,80.9612274 L76.2701151,80.9612274 L76.2701151,96.9612274 L50.8528219,74.6299616 Z M82.4127123,74.8936767 L89.2437041,74.8936767 L89.2437041,39.2156932 L55.7350575,39.2156932 L82.4127123,63.3866521 L82.4127123,74.8936767 Z M76.230137,33.1481425 L76.230137,13.9566641 L55.4001534,33.1481425 L76.230137,33.1481425 Z M39.9503781,33.1481425 L19.1207452,33.1481425 L19.1207452,13.9566641 L39.9503781,33.1481425 Z" fill="currentColor"/></svg>`;

const ACTION_SELECTORS = [
  "#top-level-buttons-computed",
  "ytd-watch-metadata #actions #menu ytd-menu-renderer #top-level-buttons-computed",
  "ytd-watch-metadata #actions-inner",
  "#actions-inner",
  "ytd-menu-renderer #top-level-buttons-computed",
  "#menu-container #top-level-buttons",
];

const selectedVideoIds = new Set();
let floatingBar = null;
let toastTimer = null;
let currentPageType = null;
let injectTimer = null;

init();

function init() {
  const boot = () => {
    currentPageType = YTPYouTube.getPageType();
    scheduleInject(0);
    observeNavigation();
    observeDom();
    listenForYouTubeNavigation();
  };

  if (document.body) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }
}

function listenForYouTubeNavigation() {
  for (const eventName of ["yt-navigate-finish", "yt-page-data-updated"]) {
    document.addEventListener(eventName, () => {
      handlePageChange();
    });
  }
}

function observeNavigation() {
  let lastUrl = location.href;

  window.setInterval(() => {
    if (location.href === lastUrl) {
      return;
    }
    lastUrl = location.href;
    handlePageChange();
  }, 500);
}

function observeDom() {
  const observer = new MutationObserver(() => {
    const pageType = YTPYouTube.getPageType();

    if (pageType === "video" && !isButtonMounted()) {
      scheduleInject(120);
      return;
    }

    if (pageType === "playlist" || pageType === "channel" || pageType === "search") {
      scheduleInject(200);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function handlePageChange() {
  const pageType = YTPYouTube.getPageType();

  if (pageType !== currentPageType) {
    clearPageUi();
    currentPageType = pageType;
  }

  selectedVideoIds.clear();
  scheduleInject(0);
}

function clearPageUi() {
  removeInlineButton();
  removeFloatingBar();
  document.querySelectorAll(".ytp-checkbox").forEach((el) => el.remove());
  document.querySelectorAll(".ytp-video-card").forEach((card) => {
    card.classList.remove("ytp-video-card");
  });
}

function scheduleInject(delayMs = 0) {
  clearTimeout(injectTimer);
  injectTimer = window.setTimeout(() => {
    injectUi();
  }, delayMs);
}

function injectUi() {
  const pageType = YTPYouTube.getPageType();

  if (pageType === "video") {
    injectVideoButton();
    return;
  }

  if (pageType === "playlist" || pageType === "channel" || pageType === "search") {
    injectBulkUi(pageType);
  }
}

function isButtonMounted() {
  return Boolean(document.querySelector("#ytp-send-button-wrap")?.isConnected);
}

function findActionsContainer() {
  for (const selector of ACTION_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function removeInlineButton() {
  document.querySelector("#ytp-send-button-wrap")?.remove();
}

function findMoreButtonAnchor(actions) {
  const moreButton = actions.querySelector(
    'button[aria-label*="More actions"], button[aria-label="More"]'
  );
  return moreButton?.closest("ytd-button-renderer") ?? actions.lastElementChild;
}

function injectVideoButton() {
  if (isButtonMounted()) {
    return;
  }

  const actions = findActionsContainer();
  if (!actions) {
    return;
  }

  const element = createVideoActionButton(() => sendCurrentVideo());
  const insertBefore = findMoreButtonAnchor(actions);
  if (insertBefore) {
    actions.insertBefore(element, insertBefore);
  } else {
    actions.append(element);
  }
}

function injectBulkUi(pageType) {
  addCheckboxesToVideos();
  ensureFloatingBar(pageType);
}

function addCheckboxesToVideos() {
  const cards = document.querySelectorAll(
    "ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, ytd-compact-video-renderer"
  );

  for (const card of cards) {
    if (card.querySelector(".ytp-checkbox")) {
      continue;
    }

    const link = card.querySelector('a[href*="/watch?v="]');
    if (!link) {
      continue;
    }

    const parsed = extractVideoFromAnchor(link);
    if (!parsed) {
      continue;
    }

    card.classList.add("ytp-video-card");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "ytp-checkbox";
    checkbox.checked = selectedVideoIds.has(parsed.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedVideoIds.add(parsed.id);
      } else {
        selectedVideoIds.delete(parsed.id);
      }
      updateFloatingBarCount();
    });
    card.appendChild(checkbox);
  }
}

function ensureFloatingBar(pageType) {
  if (floatingBar?.isConnected) {
    updateFloatingBarCount();
    return;
  }

  floatingBar = document.createElement("div");
  floatingBar.className = "ytp-floating-bar";

  const count = document.createElement("span");
  count.className = "ytp-floating-bar__count";
  count.dataset.role = "count";
  count.textContent = "0 selected";
  floatingBar.appendChild(count);

  const sendSelected = createButton("Send selected", () => sendSelectedVideos());
  const sendAll = createButton(`Send all on ${YTPYouTube.getPageLabel(pageType)}`, () => sendAllVideos());

  floatingBar.appendChild(sendSelected);
  floatingBar.appendChild(sendAll);
  document.body.appendChild(floatingBar);
  updateFloatingBarCount();
}

function removeFloatingBar() {
  floatingBar?.remove();
  floatingBar = null;
}

function updateFloatingBarCount() {
  const countEl = floatingBar?.querySelector('[data-role="count"]');
  if (countEl) {
    const count = selectedVideoIds.size;
    countEl.textContent = `${count} selected`;
  }
}

function findReferenceMoreRenderer() {
  const selectors = [
    'ytd-watch-metadata button[aria-label="More actions"]',
    "#top-level-buttons-computed button[aria-label=\"More actions\"]",
    'ytd-menu-renderer button[aria-label="More actions"]',
  ];

  for (const selector of selectors) {
    const renderer = document.querySelector(selector)?.closest("ytd-button-renderer");
    if (renderer) {
      return renderer;
    }
  }

  const actions = findActionsContainer();
  const renderers = actions?.querySelectorAll("ytd-button-renderer");
  return renderers?.length ? renderers[renderers.length - 1] : null;
}

function setPerplexityIcon(root) {
  const iconHost =
    root.querySelector(".yt-spec-button-shape-next__icon") ||
    root.querySelector("yt-icon") ||
    root.querySelector(".yt-icon-shape") ||
    root.querySelector("button");

  if (!iconHost) {
    return;
  }

  iconHost.innerHTML = `<span class="ytp-perplexity-icon">${PERPLEXITY_ICON_SVG}</span>`;
}

function createVideoActionButton(onClick) {
  const reference = findReferenceMoreRenderer();
  if (reference) {
    const renderer = reference.cloneNode(true);
    renderer.id = "ytp-send-button-wrap";

    renderer.querySelectorAll("[id]").forEach((element) => {
      if (element !== renderer) {
        element.removeAttribute("id");
      }
    });

    renderer.querySelector("tp-yt-paper-tooltip, yt-tooltip, ytd-tooltip")?.remove();

    const button = renderer.querySelector("button");
    if (!button) {
      return createFallbackVideoActionButton(onClick);
    }

    button.id = "ytp-send-button";
    button.setAttribute("aria-label", "Send to Perplexity");
    button.title = "Send to Perplexity";
    button.removeAttribute("aria-haspopup");
    button.removeAttribute("aria-owns");
    button.removeAttribute("aria-expanded");

    setPerplexityIcon(renderer);

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onClick();
      },
      true
    );

    return renderer;
  }

  return createFallbackVideoActionButton(onClick);
}

function createFallbackVideoActionButton(onClick) {
  const wrapper = document.createElement("div");
  wrapper.id = "ytp-send-button-wrap";
  wrapper.className = "ytp-btn-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.id = "ytp-send-button";
  button.className = "ytp-btn ytp-btn--icon";
  button.setAttribute("aria-label", "Send to Perplexity");
  button.title = "Send to Perplexity";
  button.innerHTML = PERPLEXITY_ICON_SVG;
  button.addEventListener("click", onClick);

  wrapper.appendChild(button);
  return wrapper;
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ytp-btn";

  const icon = document.createElement("span");
  icon.innerHTML = PERPLEXITY_ICON_SVG;
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = label;

  button.append(icon, text);
  button.addEventListener("click", onClick);
  return button;
}

function extractVideoFromAnchor(anchor) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    const videoId = url.searchParams.get("v");
    if (!videoId) {
      return null;
    }
    const title = anchor.textContent?.trim() || anchor.getAttribute("title") || `Video ${videoId}`;
    return {
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
    };
  } catch {
    return null;
  }
}

function getSelectedVideos() {
  const videos = [];
  const seen = new Set();

  for (const card of document.querySelectorAll(".ytp-video-card")) {
    const checkbox = card.querySelector(".ytp-checkbox");
    if (!checkbox?.checked) {
      continue;
    }
    const link = card.querySelector('a[href*="/watch?v="]');
    const parsed = link ? extractVideoFromAnchor(link) : null;
    if (parsed && !seen.has(parsed.id)) {
      seen.add(parsed.id);
      videos.push(parsed);
    }
  }

  return videos;
}

async function sendCurrentVideo() {
  const video = YTPYouTube.getCurrentVideo();
  if (!video) {
    showToast("Could not detect the current video");
    return;
  }
  await sendVideos([video]);
}

async function sendSelectedVideos() {
  const videos = getSelectedVideos();
  if (!videos.length) {
    showToast("Select at least one video");
    return;
  }
  await sendVideos(videos);
}

async function sendAllVideos() {
  const videos = YTPYouTube.extractVideosFromPage(50);
  if (!videos.length) {
    showToast("No videos found on this page");
    return;
  }
  await sendVideos(videos);
}

async function sendVideos(videos) {
  try {
    const settings = await YTPStorage.getSettings();
    const result = await YTPSend.sendVideosToPerplexity(videos, settings);
    if (result?.ok) {
      const label = result.count === 1 ? "1 video" : `${result.count} videos`;
      showToast(`Opened Perplexity for ${label}`);
    } else {
      showToast(result?.error || "Failed to open Perplexity");
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Failed to open Perplexity");
  }
}

function showToast(message) {
  let toast = document.querySelector(".ytp-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "ytp-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("ytp-toast--visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("ytp-toast--visible");
  }, 2800);
}

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SEND_CURRENT_PAGE") {
    const pageType = YTPYouTube.getPageType();
    if (pageType === "video") {
      return sendCurrentVideo();
    }
    return sendAllVideos();
  }
  return undefined;
});
