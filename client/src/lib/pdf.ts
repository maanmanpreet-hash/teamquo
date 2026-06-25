const PDF_PREVIEW_STORAGE_PREFIX = "pdf-preview:";

export type PdfPreviewPayload = {
  html: string;
  filename: string;
  backPath?: string;
  kind?: "customer-quote" | "generic";
  jobId?: number;
};

function isFullHtmlDocument(html: string) {
  return /<html[\s>]/i.test(html) || /<!doctype\s+html/i.test(html);
}

function absolutizeRootRelativeImageSrc(html: string) {
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
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload: PdfPreviewPayload = {
    html: normaliseQuoteHtml(html),
    filename: safePdfFilename(filename),
    backPath,
    kind: options?.kind || "generic",
    jobId: options?.jobId,
  };
  sessionStorage.setItem(`${PDF_PREVIEW_STORAGE_PREFIX}${token}`, JSON.stringify(payload));
  return token;
}

export function readPdfPreview(token: string) {
  try {
    const raw = sessionStorage.getItem(`${PDF_PREVIEW_STORAGE_PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PdfPreviewPayload;
    return parsed?.html && parsed?.filename ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPdfPreview(token: string) {
  sessionStorage.removeItem(`${PDF_PREVIEW_STORAGE_PREFIX}${token}`);
}

export function downloadBase64Pdf(base64: string, filename: string) {
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
