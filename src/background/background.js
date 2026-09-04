importScripts(
  "src/lib/storage.js",
  "src/lib/perplexity.js",
  "src/lib/youtube.js",
  "src/lib/send.js"
);

const MENU_ID = "ytp-send-to-perplexity";

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.removeAll(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: "Send to Perplexity",
      contexts: ["page", "link", "selection"],
    });
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  if (info.linkUrl?.includes("youtube.com/watch")) {
    const parsed = YTPYouTube.extractVideoFromLink(info.linkUrl);
    if (parsed) {
      const settings = await YTPStorage.getSettings();
      await YTPSend.sendVideosToPerplexity(
        [{ ...parsed, title: info.linkText || "YouTube video" }],
        settings
      );
      return;
    }
  }

  if (tab.url?.includes("youtube.com")) {
    try {
      await browser.tabs.sendMessage(tab.id, { type: "SEND_CURRENT_PAGE" });
      return;
    } catch {
      if (tab.url.includes("/watch?v=")) {
        const url = new URL(tab.url);
        const videoId = url.searchParams.get("v");
        if (videoId) {
          const settings = await YTPStorage.getSettings();
          await YTPSend.sendVideosToPerplexity(
            [
              {
                id: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                title: tab.title?.replace(" - YouTube", "") || "YouTube video",
              },
            ],
            settings
          );
        }
      }
    }
    return;
  }

  const pageUrl = info.linkUrl || info.pageUrl || tab.url;
  if (pageUrl) {
    const settings = await YTPStorage.getSettings();
    const prompt = YTPPerplexity.buildVideoPrompt(
      { url: pageUrl, title: tab.title || "Web page" },
      settings.promptTemplate
    );
    await YTPSend.sendPromptToPerplexity(prompt, settings);
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SEND_VIDEOS") {
    return handleSendVideos(message.videos);
  }
  return undefined;
});

async function handleSendVideos(videos) {
  const settings = await YTPStorage.getSettings();
  return YTPSend.sendVideosToPerplexity(videos, settings);
}
