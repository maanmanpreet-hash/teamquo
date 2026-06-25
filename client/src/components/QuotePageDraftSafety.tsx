import { useEffect } from "react";
import { hasUnsavedQuoteDraftChanges } from "@/lib/quoteDraftStore";

const LEAVE_WARNING =
  "You have unsaved quote changes. Save Draft before leaving, otherwise information entered on this page may be lost.";

function isQuotePath() {
  const { pathname } = window.location;
  return pathname === "/quote" || pathname.startsWith("/quote/") || pathname === "/stage1";
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
    text.includes("new quote") ||
    text.includes("resume") ||
    text.includes("admin") ||
    text.includes("dashboard") ||
    text === "back"
  );
}

export function QuotePageDraftSafety() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (!isQuotePath()) return;

      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (button && isSaveButton(button)) return;

      if (!hasUnsavedQuoteDraftChanges() || !isInternalNavigationIntent(event)) return;

      const canLeave = window.confirm(LEAVE_WARNING);
      if (!canLeave) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isQuotePath() || !hasUnsavedQuoteDraftChanges()) return;
      event.preventDefault();
      event.returnValue = LEAVE_WARNING;
      return LEAVE_WARNING;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
