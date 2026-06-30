const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const browserCandidates = [
  process.env.AUTO_ORCAMENTO_BROWSER,
  path.join(process.env.ProgramFiles || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LocalAppData || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.LocalAppData || "", "Microsoft", "Edge", "Application", "msedge.exe"),
].filter(Boolean);

const fontMimeTypes = {
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const imageMimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function getChromePath() {
  return getBrowserPaths()[0] || null;
}

function getBrowserPaths() {
  const seen = new Set();

  return browserCandidates.filter((candidate) => {
    if (!candidate || seen.has(candidate) || !fs.existsSync(candidate)) {
      return false;
    }

    seen.add(candidate);
    return true;
  });
}

function createBrowserProfileDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "auto-orcamento-pdf-"));
}

function removeBrowserProfileDir(profileDir) {
  if (!profileDir) {
    return;
  }

  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // profile may still be locked briefly after browser.close()
  }
}

async function launchPdfBrowser() {
  const browserPaths = getBrowserPaths();
  if (browserPaths.length === 0) {
    throw new Error("Chrome ou Edge não encontrado para gerar PDF.");
  }

  let lastError = null;

  for (const executablePath of browserPaths) {
    const profileDir = createBrowserProfileDir();

    try {
      const browser = await puppeteer.launch({
        executablePath,
        headless: "shell",
        userDataDir: profileDir,
        args: [
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-extensions",
        ],
      });

      return { browser, profileDir };
    } catch (error) {
      removeBrowserProfileDir(profileDir);
      lastError = error;
    }
  }

  throw new Error(
    `Não foi possível iniciar o Chrome/Edge para gerar o PDF.${lastError?.message ? ` ${lastError.message}` : ""}`,
  );
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPdfFilename(patientName, createdAt = new Date(), surgeryName = "") {
  const safePatient = sanitizeFilenamePart(patientName) || "Paciente";
  const safeSurgery = sanitizeFilenamePart(surgeryName);
  const date = [
    createdAt.getFullYear(),
    String(createdAt.getMonth() + 1).padStart(2, "0"),
    String(createdAt.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    createdAt.getHours(),
    createdAt.getMinutes(),
    createdAt.getSeconds(),
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  const dateTime = `${date} ${time}`;
  const namePart = safeSurgery ? `${safePatient} - ${safeSurgery}` : safePatient;

  return `${namePart} ${dateTime}.pdf`;
}

function resolveUniqueOutputPath(outputDir, filename) {
  const extension = path.extname(filename);
  const baseName = filename.slice(0, -extension.length);
  let candidate = path.join(outputDir, filename);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(outputDir, `${baseName} (${counter})${extension}`);
    counter += 1;
  }

  return candidate;
}

function toDataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = fontMimeTypes[extension] || imageMimeTypes[extension];

  if (!mimeType || !fs.existsSync(filePath)) {
    return null;
  }

  const encoded = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${encoded}`;
}

function inlineStylesheetAssets(css, rootDir) {
  return css.replace(/url\((["']?)([^"')]+)\1\)/g, (match, quote, assetUrl) => {
    if (/^(https?:|data:|file:|blob:)/.test(assetUrl)) {
      return match;
    }

    const absolutePath = path.resolve(rootDir, assetUrl);
    const dataUrl = toDataUrl(absolutePath);
    return dataUrl ? `url("${dataUrl}")` : match;
  });
}

function loadStylesForPdf(rootDir) {
  const stylesPath = path.join(rootDir, "styles.css");
  const css = fs.readFileSync(stylesPath, "utf8");
  return inlineStylesheetAssets(css, rootDir);
}

function rewritePagesHtmlAssets(pagesHtml, rootDir) {
  return pagesHtml.replace(/\ssrc=(["'])([^"']+)\1/g, (match, quote, assetUrl) => {
    if (/^(https?:|data:|file:|blob:)/.test(assetUrl)) {
      return match;
    }

    const absolutePath = path.resolve(rootDir, assetUrl);
    const dataUrl = toDataUrl(absolutePath);
    return dataUrl ? ` src=${quote}${dataUrl}${quote}` : match;
  });
}

function buildPdfDocumentHtml(pagesHtml, rootDir) {
  const css = loadStylesForPdf(rootDir);
  const normalizedPages = rewritePagesHtmlAssets(pagesHtml, rootDir);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>${css}</style>
  <style>
    body {
      background: #ffffff;
      margin: 0;
    }

    .print-page {
      box-shadow: none;
      margin: 0;
    }
  </style>
</head>
<body>${normalizedPages}</body>
</html>`;
}

async function renderPdf({ pagesHtml, outputPath, rootDir }) {
  const html = buildPdfDocumentHtml(pagesHtml, rootDir);
  const { browser, profileDir } = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");
    await page.pdf({
      path: outputPath,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });
  } finally {
    await browser.close();
    removeBrowserProfileDir(profileDir);
  }
}

function writeBudgetSnapshotJson(outputPath, snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const jsonPath = outputPath.replace(/\.pdf$/i, ".json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return jsonPath;
}

module.exports = {
  buildPdfFilename,
  buildPdfDocumentHtml,
  getBrowserPaths,
  getChromePath,
  renderPdf,
  resolveUniqueOutputPath,
  sanitizeFilenamePart,
  writeBudgetSnapshotJson,
};
