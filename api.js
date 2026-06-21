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

  async function getZoom() {
    if (isTauri()) {
      return invoke("zoom_get");
    }

    return 1;
  }

  async function setZoom(scale) {
    if (isTauri()) {
      return invoke("zoom_set", { scale });
    }

    return scale;
  }

  async function adjustZoom(delta) {
    if (isTauri()) {
      return invoke("zoom_adjust", { delta });
    }

    return 1;
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

  async function exportPdf(patientName, pagesHtml) {
    const html = typeof pagesHtml === "string" ? pagesHtml.trim() : "";
    if (!html) {
      throw new Error("Informe o conteúdo do documento para exportar.");
    }

    const documentHtml = await PdfBuild.buildPdfDocumentHtml(html);

    if (isTauri()) {
      return invoke("export_pdf", { patientName, documentHtml });
    }

    return fetchJson("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName,
        pagesHtml: html,
      }),
    });
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
    loadTable,
    getZoom,
    setZoom,
    adjustZoom,
    exportPdf,
    shutdownApp,
  };
})();
