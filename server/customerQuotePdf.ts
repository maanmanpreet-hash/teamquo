import { spawn } from "child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";

const PDF_BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function safePdfFilename(filename: string) {
  const base = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  return base.replace(/[\\/:*?"<>|]+/g, "-");
}

async function findPdfBrowserExecutable() {
  for (const candidate of PDF_BROWSER_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("No supported PDF browser was found on the server.");
}

async function runPdfCommand(executable: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });

    let stderr = "";
    child.stderr.on("data", chunk => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `PDF export failed with exit code ${code}`));
    });
  });
}

async function createOptimizedLogo(tempDir: string) {
  const sourcePath = path.resolve(process.cwd(), "client/public/skywall-brand.png");
  const outputPath = path.join(tempDir, "skywall-brand-export.jpg");

  try {
    await access(sourcePath);
  } catch {
    return null;
  }

  const command = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.Drawing",
    `$src='${sourcePath.replace(/'/g, "''")}'`,
    `$dest='${outputPath.replace(/'/g, "''")}'`,
    "$image=[System.Drawing.Image]::FromFile($src)",
    "$width=360",
    "$height=[int]([double]$image.Height * $width / $image.Width)",
    "$bitmap=New-Object System.Drawing.Bitmap $width,$height",
    "$graphics=[System.Drawing.Graphics]::FromImage($bitmap)",
    "$graphics.Clear([System.Drawing.Color]::White)",
    "$graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic",
    "$graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality",
    "$graphics.DrawImage($image,0,0,$width,$height)",
    "$codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1",
    "$params=New-Object System.Drawing.Imaging.EncoderParameters 1",
    "$params.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,55L)",
    "$bitmap.Save($dest,$codec,$params)",
    "$graphics.Dispose()",
    "$bitmap.Dispose()",
    "$image.Dispose()",
  ].join("; ");

  await runPdfCommand("C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", ["-Command", command]);
  return outputPath;
}

export async function renderCustomerQuotePdfBuffer(html: string, filename: string) {
  const browserExecutable = await findPdfBrowserExecutable();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "teamquo-customer-quote-"));
  const htmlPath = path.join(tempDir, "quote.html");
  const pdfPath = path.join(tempDir, safePdfFilename(filename));

  try {
    const optimizedLogoPath = await createOptimizedLogo(tempDir);
    const pdfHtml =
      optimizedLogoPath
        ? html
            .replaceAll("/skywall-brand.png", pathToFileURL(optimizedLogoPath).href)
            .replaceAll(pathToFileURL(path.resolve(process.cwd(), "client/public/skywall-brand.png")).href, pathToFileURL(optimizedLogoPath).href)
        : html;

    await writeFile(htmlPath, pdfHtml, "utf8");
    await runPdfCommand(browserExecutable, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=2000",
      `--print-to-pdf=${pdfPath}`,
      "--no-pdf-header-footer",
      "--print-to-pdf-no-header",
      pathToFileURL(htmlPath).href,
    ]);

    return await readFile(pdfPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
