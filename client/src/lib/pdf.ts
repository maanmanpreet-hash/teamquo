const PDF_PREVIEW_STORAGE_PREFIX = "pdf-preview:";

export type PdfPreviewPayload = {
  html: string;
  filename: string;
  backPath?: string;
};

function normaliseQuoteHtml(html: string) {
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
${autoPrint ? `<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.title = ${JSON.stringify(pdfFilename)};
      window.focus();
      window.print();
    }, 250);
  });
<\/script>` : ""}
</body>
</html>`;
}

export function createPdfPreview(html: string, filename: string, backPath?: string) {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload: PdfPreviewPayload = {
    html: normaliseQuoteHtml(html),
    filename: safePdfFilename(filename),
    backPath,
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
