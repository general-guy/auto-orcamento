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

async function renderPdf({ pagesHtml, outputPath, baseUrl }) {
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error("Chrome ou Edge não encontrado para gerar PDF.");
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>${pagesHtml}</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      baseURL: baseUrl,
    });
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
  getChromePath,
  renderPdf,
  resolveUniqueOutputPath,
  sanitizeFilenamePart,
};
