export function getResumeJobIdFromLocation(location: string) {
  const [pathname, queryString = ""] = location.split("?");
  const fallbackQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  const queryId = new URLSearchParams(queryString || fallbackQuery).get("resumeJobId");
  const pathId = pathname.match(/^\/quote\/(\d+)$/)?.[1];
  const parsed = Number(queryId || pathId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function shouldResetQuoteFormForResumeChange(currentResumeJobId: number | null, nextResumeJobId: number | null) {
  if (currentResumeJobId === nextResumeJobId) return false;
  if (currentResumeJobId === null && nextResumeJobId !== null) return false;
  return true;
}
