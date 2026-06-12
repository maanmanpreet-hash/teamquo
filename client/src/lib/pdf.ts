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

/**
 * Opens the quote HTML in a dedicated print window and triggers the browser's
 * native PDF/print flow. This avoids the previous CDN html2pdf dependency,
 * which could hang even after the server returned a successful 200 response.
 */
export async function downloadPDF(html: string, filename: string) {
  return new Promise<boolean>((resolve, reject) => {
    const pdfFilename = safePdfFilename(filename);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");

    if (!printWindow) {
      reject(new Error("Popup blocked. Allow popups for this site and try Quote PDF again."));
      return;
    }

    const content = normaliseQuoteHtml(html);
    const printHtml = `<!doctype html>
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
<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.title = ${JSON.stringify(pdfFilename)};
      window.focus();
      window.print();
    }, 250);
  });
<\/script>
</body>
</html>`;

    try {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      resolve(true);
    } catch (error) {
      printWindow.close();
      reject(error);
    }
  });
}
