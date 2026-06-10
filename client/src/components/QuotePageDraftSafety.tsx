import { useEffect } from "react";

const QUOTE_DIRTY_KEY = "teamquo.quote.unsavedChanges";
const QUOTE_RECOVERY_KEY = "teamquo.quote.recoverySnapshot";
const LEAVE_WARNING =
  "You have unsaved quote changes. Save Draft before leaving, otherwise information entered on this page may be lost.";

function isQuotePath() {
  return window.location.pathname === "/quote" || window.location.pathname === "/stage1";
}

function markQuoteDirty() {
  if (!isQuotePath()) return;
  sessionStorage.setItem(QUOTE_DIRTY_KEY, "1");
}

function hasUnsavedQuoteChanges() {
  return isQuotePath() && sessionStorage.getItem(QUOTE_DIRTY_KEY) === "1";
}

function buttonText(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

function isSaveButton(element: Element | null) {
  const text = buttonText(element);
  return text === "save draft" || text === "save quote";
}

function isInternalNavigationIntent(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const anchor = target.closest("a[href]");
  if (anchor) return true;

  const button = target.closest("button");
  if (!button || isSaveButton(button)) return false;

  const text = buttonText(button);
  return (
    text === "" ||
    text.includes("new quote") ||
    text.includes("resume") ||
    text.includes("edit") ||
    text.includes("admin") ||
    text.includes("dashboard")
  );
}

function collectFieldSnapshot() {
  if (!isQuotePath()) return;

  const fields = Array.from(document.querySelectorAll("input, textarea, select"))
    .map((field, index) => {
      const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const key = element.id || element.name || element.getAttribute("aria-label") || `${element.tagName.toLowerCase()}-${index}`;
      const value = element instanceof HTMLInputElement && element.type === "file" ? "" : element.value;
      return { key, value };
    })
    .filter(field => field.value !== "");

  const visibleQuoteText = document.body?.innerText || "";
  const wallCards = Array.from(document.querySelectorAll(".rounded-lg, .space-y-3"))
    .map(card => (card as HTMLElement).innerText?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 40);

  localStorage.setItem(
    QUOTE_RECOVERY_KEY,
    JSON.stringify({
      capturedAt: new Date().toISOString(),
      url: window.location.href,
      fields,
      wallCards,
      quoteTextPreview: visibleQuoteText.slice(0, 3000),
    })
  );
}

function safeCss(value: string) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function restoreSimpleFields() {
  if (!isQuotePath()) return;

  const raw = localStorage.getItem(QUOTE_RECOVERY_KEY);
  if (!raw) return;

  try {
    const snapshot = JSON.parse(raw) as { fields?: Array<{ key: string; value: string }> };
    if (!Array.isArray(snapshot.fields) || snapshot.fields.length === 0) return;

    for (const { key, value } of snapshot.fields) {
      if (!key || !value) continue;
      const escapedKey = safeCss(key);
      const selector = `#${escapedKey}, [name="${escapedKey}"], [aria-label="${escapedKey}"]`;
      const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!element || element.value) continue;
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch {
    localStorage.removeItem(QUOTE_RECOVERY_KEY);
  }
}

export function QuotePageDraftSafety() {
  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !isQuotePath()) return;
      if (target.closest("input, textarea, select")) {
        markQuoteDirty();
        collectFieldSnapshot();
      }
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!isQuotePath()) return;

      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (button && isSaveButton(button)) {
        collectFieldSnapshot();
        return;
      }

      if (button) collectFieldSnapshot();

      if (!hasUnsavedQuoteChanges() || !isInternalNavigationIntent(event)) return;

      const canLeave = window.confirm(LEAVE_WARNING);
      if (!canLeave) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedQuoteChanges()) return;
      collectFieldSnapshot();
      event.preventDefault();
      event.returnValue = LEAVE_WARNING;
      return LEAVE_WARNING;
    };

    const restoreTimer = window.setTimeout(restoreSimpleFields, 500);

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
