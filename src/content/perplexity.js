const INPUT_SELECTORS = [
  "#ask-input",
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="ask"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]',
  "textarea",
];

const SUBMIT_SELECTORS = [
  'button[aria-label="Submit"]',
  'button[aria-label*="Submit" i]',
  'button[data-testid*="submit" i]',
  'button[type="submit"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Ask" i]',
  'button[aria-label*="Search" i]',
];

const PROMPT_TTL_MS = 5 * 60 * 1000;
const SUBMIT_DELAY_MS = 150;
let injectTimer = null;

init();

function init() {
  scheduleInject(0);
  observeDom();

  document.addEventListener("yt-navigate-finish", () => scheduleInject(250));
  window.addEventListener("pageshow", () => scheduleInject(0));
}

function observeDom() {
  const observer = new MutationObserver(() => {
    scheduleInject(150);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function scheduleInject(delayMs = 0) {
  clearTimeout(injectTimer);
  injectTimer = window.setTimeout(() => {
    void tryInjectPrompt();
  }, delayMs);
}

async function tryInjectPrompt() {
  const stored = await browser.storage.local.get([
    YTPSend.PENDING_PROMPT_KEY,
    YTPSend.PENDING_PROMPT_AT_KEY,
  ]);

  const prompt = stored[YTPSend.PENDING_PROMPT_KEY];
  const pendingAt = stored[YTPSend.PENDING_PROMPT_AT_KEY];

  if (!prompt || !pendingAt) {
    return false;
  }

  if (Date.now() - pendingAt > PROMPT_TTL_MS) {
    await clearPendingPrompt();
    return false;
  }

  const input = findInput();
  if (!input) {
    return false;
  }

  const currentText = getInputText(input).trim();
  if (currentText !== prompt.trim()) {
    setInputText(input, prompt);
  }

  input.focus();
  await delay(SUBMIT_DELAY_MS);
  submitQuery(input);
  await clearPendingPrompt();
  return true;
}

function findInput() {
  for (const selector of INPUT_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (isVisible(element)) {
        return element;
      }
    }
  }
  return null;
}

function findSubmitButton(input) {
  const scopes = [
    input.closest("form"),
    input.closest('[class*="rounded"]'),
    input.parentElement?.parentElement,
    document,
  ].filter(Boolean);

  for (const scope of scopes) {
    for (const selector of SUBMIT_SELECTORS) {
      const buttons = scope.querySelectorAll(selector);
      for (const button of buttons) {
        if (isSubmitButton(button)) {
          return button;
        }
      }
    }
  }

  const inputRect = input.getBoundingClientRect();
  let closestButton = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const button of document.querySelectorAll("button")) {
    if (!isSubmitButton(button)) {
      continue;
    }

    const rect = button.getBoundingClientRect();
    const distance = Math.hypot(rect.left - inputRect.right, rect.top - inputRect.top);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestButton = button;
    }
  }

  return closestButton;
}

function isSubmitButton(button) {
  if (!isVisible(button) || button.disabled) {
    return false;
  }

  const label = button.getAttribute("aria-label")?.toLowerCase() ?? "";
  if (
    label.includes("submit") ||
    label.includes("send") ||
    label.includes("ask") ||
    label.includes("search")
  ) {
    return true;
  }

  return SUBMIT_SELECTORS.some((selector) => button.matches(selector));
}

function submitQuery(input) {
  const button = findSubmitButton(input);
  if (button) {
    button.click();
    return;
  }

  for (const type of ["keydown", "keypress", "keyup"]) {
    input.dispatchEvent(
      new KeyboardEvent(type, {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      })
    );
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.offsetParent !== null;
}

function getInputText(element) {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent ?? "";
}

function setInputText(element, text) {
  element.focus();

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    );
    descriptor?.set?.call(element, text);
    element.value = text;
  } else {
    element.textContent = text;
    element.innerText = text;
  }

  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function clearPendingPrompt() {
  await browser.storage.local.remove([YTPSend.PENDING_PROMPT_KEY, YTPSend.PENDING_PROMPT_AT_KEY]);
}
