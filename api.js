(function () {
  /** @type {"tauri" | "web" | null} */
  let backendMode = null;

  function detectTauriInvoke() {
    return typeof window.__TAURI__?.core?.invoke === "function";
  }

  function isTauri() {
    if (backendMode === "web") {
      return false;
    }

    return backendMode === "tauri" || detectTauriInvoke();
  }

  async function waitForBackend() {
    if (backendMode) {
      return backendMode;
    }

    if (detectTauriInvoke()) {
      backendMode = "tauri";
      return backendMode;
    }

    if (window.location.port === "3000") {
      backendMode = "web";
      return backendMode;
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (detectTauriInvoke()) {
        backendMode = "tauri";
        return backendMode;
      }
    }

    throw new Error("Backend Tauri indisponível neste ambiente.");
  }

  function invoke(command, payload) {
    if (!detectTauriInvoke()) {
      throw new Error(`Comando Tauri indisponível: ${command}`);
    }

    return window.__TAURI__.core.invoke(command, payload);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const message = data?.error || `Falha na requisição: ${url}`;
      throw new Error(message);
    }

    return data;
  }

  async function getHistory(store) {
    if (isTauri()) {
      return invoke("history_list", { store });
    }

    return fetchJson(`/api/${store}`);
  }

  async function addHistory(store, value) {
    if (isTauri()) {
      return invoke("history_add", { store, value });
    }

    return fetchJson(`/api/${store}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }

  async function removeHistory(store, value) {
    if (isTauri()) {
      return invoke("history_remove", { store, value });
    }

    return fetchJson(`/api/${store}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }

  async function replaceHistory(store, items) {
    if (isTauri()) {
      return invoke("history_replace", { store, items });
    }

    return fetchJson(`/api/${store}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  async function getTechnologies() {
    if (isTauri()) {
      return invoke("technologies_list");
    }

    return fetchJson("/api/tecnologias");
  }

  async function addTechnology(nome, valor) {
    if (isTauri()) {
      return invoke("technologies_add", { nome, valor });
    }

    return fetchJson("/api/tecnologias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, valor }),
    });
  }

  async function removeTechnology(nome) {
    if (isTauri()) {
      return invoke("technologies_remove", { nome });
    }

    return fetchJson("/api/tecnologias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
  }

  async function replaceTechnologies(items) {
    if (isTauri()) {
      return invoke("technologies_replace", { items });
    }

    return fetchJson("/api/tecnologias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2;
  const ZOOM_DEFAULT = 1;

  let webZoomFactor = 1;

  function clampZoom(scale) {
    const value = Number(scale);
    if (!Number.isFinite(value)) {
      return ZOOM_DEFAULT;
    }

    const rounded = Math.round(value * 10) / 10;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
  }

  function applyWebZoom(scale) {
    const zoom = clampZoom(scale);
    webZoomFactor = zoom;
    document.documentElement.style.setProperty("--ui-zoom", String(zoom));
    document.documentElement.style.zoom = "";

    if (zoom === 1) {
      document.body.style.removeProperty("transform");
      document.body.style.removeProperty("width");
      document.body.style.removeProperty("height");
    } else {
      document.body.style.transformOrigin = "top left";
      document.body.style.transform = `scale(${zoom})`;
      document.body.style.width = `${100 / zoom}%`;
      document.body.style.height = `${100 / zoom}%`;
    }

    window.dispatchEvent(new Event("resize"));
    return zoom;
  }

  function getWebZoomFactor() {
    if (isTauri()) {
      return 1;
    }

    return webZoomFactor;
  }

  async function getZoom() {
    if (isTauri()) {
      return invoke("zoom_get");
    }

    const data = await fetchJson("/api/settings");
    return applyWebZoom(data.zoom ?? ZOOM_DEFAULT);
  }

  async function setZoom(scale) {
    if (isTauri()) {
      return invoke("zoom_set", { scale });
    }

    const data = await fetchJson("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoom: scale }),
    });

    return applyWebZoom(data.zoom);
  }

  async function adjustZoom(delta) {
    if (isTauri()) {
      return invoke("zoom_adjust", { delta });
    }

    const current = await getZoom();
    return setZoom(current + Number(delta || 0));
  }

  async function loadTable(table) {
    if (isTauri()) {
      return invoke("table_load", { table });
    }

    const url =
      table === "hospitalares"
        ? "data/tabelas-hospitalares.json"
        : table === "implantes"
          ? "data/tabela-implantes.json"
          : null;

    if (!url) {
      throw new Error(`Tabela desconhecida: ${table}`);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${url}`);
    }

    return response.json();
  }

  async function exportPdf(patientName, pagesHtml, snapshot) {
    const html = typeof pagesHtml === "string" ? pagesHtml.trim() : "";
    if (!html) {
      throw new Error("Informe o conteúdo do documento para exportar.");
    }

    if (isTauri()) {
      const documentHtml = await PdfBuild.buildPdfDocumentHtml(html);
      return invoke("export_pdf", { patientName, documentHtml });
    }

    return fetchJson("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName,
        pagesHtml: html,
        snapshot: snapshot && typeof snapshot === "object" ? snapshot : undefined,
      }),
    });
  }

  async function openSnapshot() {
    if (isTauri()) {
      throw new Error("Abrir snapshot não está disponível no Tauri congelado.");
    }

    return fetchJson("/api/open-snapshot", { method: "POST" });
  }

  async function shutdownApp() {
    if (isTauri()) {
      await window.__TAURI__.window.getCurrentWindow().close();
      return;
    }

    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch {
      // O servidor pode encerrar antes de responder completamente.
    }
  }

  window.AppApi = {
    isTauri,
    waitForBackend,
    getHistory,
    addHistory,
    removeHistory,
    replaceHistory,
    getTechnologies,
    addTechnology,
    removeTechnology,
    replaceTechnologies,
    loadTable,
    getZoom,
    setZoom,
    adjustZoom,
    getWebZoomFactor,
    exportPdf,
    openSnapshot,
    shutdownApp,
  };
})();
