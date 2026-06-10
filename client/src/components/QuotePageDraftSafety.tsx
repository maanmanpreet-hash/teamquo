import { useEffect } from "react";

const QUOTE_DIRTY_KEY = "teamquo.quote.unsavedChanges";
const LEAVE_WARNING =
  "You have unsaved quote changes. Save Draft before leaving, otherwise information entered on this page may be lost.";

function isQuotePath() {
  return window.location.pathname === "/quote" || window.location.pathname === "/stage1";
}

function markQuoteDirty() {
  if (!isQuotePath()) return;
  sessionStorage.setItem(QUOTE_DIRTY_KEY, "1");
}

function clearQuoteDirty() {
  sessionStorage.removeItem(QUOTE_DIRTY_KEY);
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

export function QuotePageDraftSafety() {
  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !isQuotePath()) return;
      if (target.closest("input, textarea, select")) markQuoteDirty();
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!isQuotePath()) return;

      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (button && isSaveButton(button)) {
        clearQuoteDirty();
        return;
      }

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
      event.preventDefault();
      event.returnValue = LEAVE_WARNING;
      return LEAVE_WARNING;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
