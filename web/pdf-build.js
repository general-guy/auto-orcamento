(function () {
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

  function resolveMimeType(assetUrl) {
    const extension = assetUrl.slice(assetUrl.lastIndexOf(".")).toLowerCase();
    return fontMimeTypes[extension] || imageMimeTypes[extension] || null;
  }

  async function assetToDataUrl(assetUrl) {
    if (/^(https?:|data:|file:|blob:)/.test(assetUrl)) {
      return null;
    }

    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const mimeType = blob.type || resolveMimeType(assetUrl);
      if (!mimeType) {
        return null;
      }

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      return `data:${mimeType};base64,${btoa(binary)}`;
    } catch {
      return null;
    }
  }

  async function inlineStylesheetAssets(css) {
    const pattern = /url\((["']?)([^"')]+)\1\)/g;
    const matches = [...css.matchAll(pattern)];
    let nextCss = css;

    for (const match of matches) {
      const dataUrl = await assetToDataUrl(match[2]);
      if (dataUrl) {
        nextCss = nextCss.replace(match[0], `url("${dataUrl}")`);
      }
    }

    return nextCss;
  }

  async function rewritePagesHtmlAssets(pagesHtml) {
    const pattern = /\ssrc=(["'])([^"']+)\1/g;
    const matches = [...pagesHtml.matchAll(pattern)];
    let nextHtml = pagesHtml;

    for (const match of matches) {
      const dataUrl = await assetToDataUrl(match[2]);
      if (dataUrl) {
        nextHtml = nextHtml.replace(match[0], ` src=${match[1]}${dataUrl}${match[1]}`);
      }
    }

    return nextHtml;
  }

  async function buildPdfDocumentHtml(pagesHtml) {
    const cssResponse = await fetch("styles.css");
    if (!cssResponse.ok) {
      throw new Error("Não foi possível carregar styles.css para o PDF.");
    }

    const css = await inlineStylesheetAssets(await cssResponse.text());
    const normalizedPages = await rewritePagesHtmlAssets(pagesHtml);

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

  window.PdfBuild = {
    buildPdfDocumentHtml,
  };
})();
