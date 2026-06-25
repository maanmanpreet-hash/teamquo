const PDF_PREVIEW_STORAGE_PREFIX = "pdf-preview:";
const PDF_PREVIEW_LOCAL_TTL_MS = 24 * 60 * 60 * 1000;

export type PdfPreviewPayload = {
  html: string;
  filename: string;
  backPath?: string;
  kind?: "customer-quote" | "generic";
  jobId?: number;
  createdAt?: number;
};

function isFullHtmlDocument(html: string) {
  return /<html[\s>]/i.test(html) || /<!doctype\s+html/i.test(html);
}

function absolutizeRootRelativeImageSrc(html: string) {
  if (typeof window === "undefined") return html;
  return html.replace(/(<img\b[^>]*\bsrc=["'])(\/[^"']*)(["'][^>]*>)/gi, (_, prefix: string, src: string, suffix: string) => {
    return `${prefix}${window.location.origin}${src}${suffix}`;
  });
}

function buildAutoPrintScript(pdfFilename: string) {
  return `<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.title = ${JSON.stringify(pdfFilename)};
      window.focus();
      window.print();
    }, 250);
  });
<\/script>`;
}

function normaliseQuoteHtml(html: string) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return isFullHtmlDocument(html) ? absolutizeRootRelativeImageSrc(html) : html;
  }

  if (isFullHtmlDocument(html)) {
    return absolutizeRootRelativeImageSrc(html);
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src && src.startsWith("/")) {
      img.setAttribute("src", `${window.location.origin}${src}`);
    }
  });

  return wrapper.innerHTML;
}

function safePdfFilename(filename: string) {
  const base = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  return base.replace(/[\\/:*?"<>|]+/g, "-");
}

function getSessionStorage() {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function getPreviewStorageKey(token: string) {
  return `${PDF_PREVIEW_STORAGE_PREFIX}${token}`;
}

function cleanupExpiredLocalPreviews(now = Date.now()) {
  const storage = getLocalStorage();
  if (!storage) return;

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key?.startsWith(PDF_PREVIEW_STORAGE_PREFIX)) continue;

    try {
      const parsed = JSON.parse(storage.getItem(key) || "null") as PdfPreviewPayload | null;
      if (!parsed?.createdAt || now - parsed.createdAt > PDF_PREVIEW_LOCAL_TTL_MS) {
        storage.removeItem(key);
      }
    } catch {
      storage.removeItem(key);
    }
  }
}

function isValidPreviewPayload(payload: PdfPreviewPayload | null, now = Date.now()) {
  if (!payload?.html || !payload?.filename) return false;
  if (payload.createdAt && now - payload.createdAt > PDF_PREVIEW_LOCAL_TTL_MS) return false;
  return true;
}

export function buildPrintHtml(content: string, pdfFilename: string, autoPrint = false) {
  if (isFullHtmlDocument(content)) {
    if (!autoPrint) return content;
    return content.includes("</body>")
      ? content.replace("</body>", `${buildAutoPrintScript(pdfFilename)}</body>`)
      : `${content}${buildAutoPrintScript(pdfFilename)}`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${pdfFilename}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${content}
${autoPrint ? buildAutoPrintScript(pdfFilename) : ""}
</body>
</html>`;
}

export function createPdfPreview(
  html: string,
  filename: string,
  backPath?: string,
  options?: { kind?: "customer-quote" | "generic"; jobId?: number }
) {
  cleanupExpiredLocalPreviews();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload: PdfPreviewPayload = {
    html: normaliseQuoteHtml(html),
    filename: safePdfFilename(filename),
    backPath,
    kind: options?.kind || "generic",
    jobId: options?.jobId,
    createdAt: Date.now(),
  };
  const serialized = JSON.stringify(payload);
  const key = getPreviewStorageKey(token);
  getSessionStorage()?.setItem(key, serialized);
  getLocalStorage()?.setItem(key, serialized);
  return token;
}

export function readPdfPreview(token: string) {
  const key = getPreviewStorageKey(token);
  const now = Date.now();

  try {
    const storages = [getSessionStorage(), getLocalStorage()].filter((value): value is Storage => Boolean(value));

    for (const storage of storages) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as PdfPreviewPayload;
      if (isValidPreviewPayload(parsed, now)) {
        return parsed;
      }

      clearPdfPreview(token);
      return null;
    }

    return null;
  } catch {
    clearPdfPreview(token);
    return null;
  }
}

export function clearPdfPreview(token: string) {
  const key = getPreviewStorageKey(token);
  getSessionStorage()?.removeItem(key);
  getLocalStorage()?.removeItem(key);
}

export function downloadBase64Pdf(base64: string, filename: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safePdfFilename(filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
