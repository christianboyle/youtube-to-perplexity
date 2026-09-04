# YouTube to Perplexity

A Firefox extension that sends YouTube videos, playlists, channels, and search results to [Perplexity](https://www.perplexity.ai) for AI-powered summaries and research — similar to [YouTube to NotebookLM](https://addons.mozilla.org/en-US/firefox/addon/youtube-to-notebooklm/), but for Perplexity.

## Features

- **Single video** — "Send to Perplexity" button on YouTube watch pages
- **Bulk send** — checkboxes on search, playlist, and channel pages
- **Send all** — floating action bar to send every visible video on a page
- **Any tab** — right-click → "Send to Perplexity" or use the extension popup
- **Custom prompts** — edit single-video and batch prompt templates
- **YouTube focus** — opens Perplexity with `focus=youtube` so it uses video transcripts

## How it works

Perplexity does not expose a public API for adding sources to Projects/Collections. This extension opens Perplexity search with a pre-filled prompt containing the video URL(s), using YouTube focus mode for transcript-based analysis.

Example URL:

```
https://www.perplexity.ai/search?focus=youtube&q=Summarize+this+YouTube+video...
```

## Install in Zen Browser

Zen’s file picker often **won’t let you select `manifest.json`** — that’s normal. Use one of these methods instead.

### Option A: Load the packaged add-on (easiest)

A pre-built file is included in the repo: **`youtube-to-perplexity.xpi`**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. In the file dialog, change the filter from “Web Extension Manifest” to **All Files**
4. Select **`youtube-to-perplexity.xpi`** (or `web-ext-artifacts/youtube_to_perplexity-1.0.0.zip` — same thing)

Temporary add-ons are removed when Zen restarts.

### Option B: Select any file in the project folder

You do **not** need to pick `manifest.json` specifically. Mozilla’s loader accepts any file inside the extension:

1. `about:debugging` → **This Firefox** → **Load Temporary Add-on…**
2. Set the file filter to **All Files**
3. Select any project file, e.g. `src/background/background.js` or `icons/icon-48.png`

### Option C: Permanent install (unsigned)

For an add-on that survives restarts, Zen needs unsigned installs enabled:

1. Open `about:config`
2. Set `xpinstall.signatures.required` to **`false`**
3. Open `about:addons` → gear menu ⚙ → **Install Add-on From File…**
4. Select **`youtube-to-perplexity.xpi`**

Rebuild the package after code changes:

```bash
npm run build
cp web-ext-artifacts/youtube_to_perplexity-1.0.0.zip youtube-to-perplexity.xpi
```

## Install in Firefox

Same steps as Zen — use `youtube-to-perplexity.xpi` or any file in the project via `about:debugging`.

## Permanent install (signed via Mozilla)

For an add-on that survives browser restarts **without** `about:config` changes:

### 1. Get API credentials

1. Create a [Firefox Add-on Developer account](https://addons.mozilla.org/developers/)
2. Go to [Developer Hub → API credentials](https://addons.mozilla.org/developers/addon/api/key/)
3. Generate a new JWT key pair — save the **issuer** (user:…) and **secret**

**Never commit credentials to git.** Use environment variables:

```bash
export WEB_EXT_API_KEY="user:YOUR_ID:YOUR_KEY_ID"
export WEB_EXT_API_SECRET="your-secret-here"
```

### 2. Sign the extension

**Public AMO listing** (requires Mozilla review):

```bash
npm run sign
```

**Private / testing only** (unlisted, no public store page):

```bash
npm run sign:unlisted
```

Or explicitly:

```bash
npx web-ext sign \
  --api-key="$WEB_EXT_API_KEY" \
  --api-secret="$WEB_EXT_API_SECRET" \
  --channel=listed \
  --source-dir=. \
  --artifacts-dir=web-ext-artifacts
```

The signed `.xpi` appears in `web-ext-artifacts/` (filename includes `-signed.xpi`).

### 3. Install the signed add-on

1. Open `about:addons`
2. Gear menu ⚙ → **Install Add-on From File…**
3. Select the `*-signed.xpi` file from `web-ext-artifacts/`

### Public listing on addons.mozilla.org

After signing with `--channel=listed`, finish the listing in the [Developer Hub](https://addons.mozilla.org/developers/):

| Requirement | Status in this repo |
|-------------|---------------------|
| Unique add-on ID (not `@local`) | `youtube-to-perplexity@christianboyle.github.io` |
| `data_collection_permissions` (new extensions since Nov 2025) | `"required": ["none"]` |
| Privacy policy URL | Host [PRIVACY.md](./PRIVACY.md) on GitHub and link it in AMO |
| Screenshots (1280×800 or 640×400) | Add in AMO dashboard |
| Detailed description | Write in AMO dashboard |
| Narrow host permissions | YouTube + Perplexity only (removed `<all_urls>`) |
| Source code | Plain JS — no separate source upload needed |

**Review notes to include:** The extension only opens Perplexity when the user clicks. No data is sent to the developer. Video URLs are passed to perplexity.ai on explicit user action.

**Important:** Changing the add-on ID from `@local` means this is treated as a new extension — uninstall any dev build before installing the signed AMO version.

### Troubleshooting

**`user lacks permissions on web-ext-artifacts`** — fix ownership:

```bash
sudo chown -R "$USER:$USER" ~/Projects/youtube-to-perplexity
```

**Rotate exposed keys** — revoke in Developer Hub and generate a new pair if your API secret was shared.

## Usage

### On a YouTube video

Click **Send to Perplexity** next to the like/dislike buttons.

### On playlists, channels, or search results

1. Use the checkboxes on video thumbnails to select videos, or
2. Click **Send all on playlist/channel/search results** in the floating bar

### From any page

- Right-click → **Send to Perplexity**
- Or open the extension popup → **Send current tab**

### Settings

Open the extension popup to customize:

| Setting | Description |
|---------|-------------|
| Single video prompt | Template for one video (`{title}`, `{url}`) |
| Batch prompt | Template for multiple videos (`{urls}`) |
| Perplexity focus | YouTube, All sources, Academic, etc. |
| Batch behavior | One tab for all videos, or one tab per video |
| Open in background | Keep YouTube focused while Perplexity loads |

## Limitations

- **No Perplexity Projects API** — cannot auto-add videos to a saved Project/Collection; opens a new search instead
- **Transcript required** — Perplexity can only summarize videos with public transcripts
- **YouTube SPA** — page navigation is handled via observers; a refresh may be needed if buttons don't appear

## Project structure

```
manifest.json
icons/
src/
  background/background.js   # Opens Perplexity tabs, context menu
  content/youtube.js         # Injects UI on YouTube
  content/youtube.css
  lib/perplexity.js          # URL builder
  lib/youtube.js             # Page detection
  lib/storage.js             # Settings
  popup/                     # Options UI
```

## Privacy

This extension does not collect or transmit data to any third-party server. It only:

- Reads the current YouTube page to extract video URLs and titles
- Opens Perplexity in a new browser tab with your prompt
- Stores your settings locally via `browser.storage.sync`

## License

MIT
