const fs = require("node:fs");
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
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPdfFilename(patientName, createdAt = new Date()) {
  const safePatient = sanitizeFilenamePart(patientName) || "Paciente";
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

  return `${safePatient} ${date} ${time}.pdf`;
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
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error("Chrome ou Edge não encontrado para gerar PDF.");
  }

  const html = buildPdfDocumentHtml(pagesHtml, rootDir);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
  });

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
  }
}

module.exports = {
  buildPdfFilename,
  buildPdfDocumentHtml,
  getChromePath,
  renderPdf,
  resolveUniqueOutputPath,
  sanitizeFilenamePart,
};
