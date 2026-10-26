(function () {
  async function waitForBackend() {
    if (window.location.port === "3000") {
      return "web";
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (window.location.port === "3000") {
        return "web";
      }
    }

    throw new Error("Servidor local indisponível na porta 3000.");
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const rawText = await response.text();
    let data = {};

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        const snippet = rawText.trim().slice(0, 160);
        if (snippet.includes("Arquivo não encontrado")) {
          throw new Error(
            "Servidor desatualizado na porta 3000. Feche a janela (X), aguarde alguns segundos e abra de novo com abrir-auto-orcamento.bat.",
          );
        }

        throw new Error(snippet ? `Resposta inválida do servidor: ${snippet}` : `Falha na requisição: ${url}`);
      }
    }

    if (!response.ok) {
      const message = data?.error || `Falha na requisição: ${url}`;
      throw new Error(message);
    }

    return data;
  }

  function catalogLabel(entry) {
    if (typeof entry === "string") {
      return entry.trim();
    }

    return String(entry?.label ?? entry?.nome ?? "").trim();
  }

  function catalogValor(entry) {
    if (!entry || typeof entry === "string") {
      return "";
    }

    return String(entry.valor ?? "").trim();
  }

  function unwrapCatalogItems(data) {
    return Array.isArray(data?.items) ? data.items : [];
  }

  function toCatalogPutItems(items) {
    return items.map((entry) => {
      if (typeof entry === "string") {
        return { label: entry };
      }

      const item = {
        id: entry.id,
        label: catalogLabel(entry),
      };
      const valor = catalogValor(entry);
      if (valor) {
        item.valor = valor;
      }
      return item;
    });
  }

  async function getHistory(store) {
    const data = await fetchJson(`/api/${store}`);
    return unwrapCatalogItems(data);
  }

  async function upsertPatient(payload) {
    const data = await fetchJson("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data;
  }

  async function removePatient(payload) {
    const data = await fetchJson("/api/pacientes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data;
  }

  async function replacePatients(items) {
    const data = await fetchJson("/api/pacientes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: toCatalogPutItems(items) }),
    });
    return unwrapCatalogItems(data);
  }

  async function upsertCatalog(store, payload) {
    const data = await fetchJson(`/api/${store}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return unwrapCatalogItems(data);
  }

  async function removeCatalog(store, payload) {
    const data = await fetchJson(`/api/${store}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return unwrapCatalogItems(data);
  }

  async function addHistory(store, value) {
    const data = await fetchJson(`/api/${store}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    return unwrapCatalogItems(data);
  }

  async function removeHistory(store, value) {
    const data = await fetchJson(`/api/${store}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    return unwrapCatalogItems(data);
  }

  async function replaceHistory(store, items) {
    const data = await fetchJson(`/api/${store}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: toCatalogPutItems(items) }),
    });
    return unwrapCatalogItems(data);
  }

  async function getTechnologies() {
    const data = await fetchJson("/api/tecnologias");
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function addTechnology(nome, valor) {
    const data = await fetchJson("/api/tecnologias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, valor }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function removeTechnology(nome) {
    const data = await fetchJson("/api/tecnologias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function replaceTechnologies(items) {
    const data = await fetchJson("/api/tecnologias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: toCatalogPutItems(items) }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function getUnimedNProcedures() {
    const data = await fetchJson("/api/unimed-n");
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function addUnimedNProcedure(nome, valor) {
    const data = await fetchJson("/api/unimed-n", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, valor }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function removeUnimedNProcedure(nome) {
    const data = await fetchJson("/api/unimed-n", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
  }

  async function replaceUnimedNProcedures(items) {
    const data = await fetchJson("/api/unimed-n", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: toCatalogPutItems(items) }),
    });
    return unwrapCatalogItems(data).map((item) => ({ ...item, nome: catalogLabel(item) }));
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
    return webZoomFactor;
  }

  async function getZoom() {
    const data = await fetchJson("/api/settings");
    return applyWebZoom(data.zoom ?? ZOOM_DEFAULT);
  }

  async function setZoom(scale) {
    const data = await fetchJson("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoom: scale }),
    });

    return applyWebZoom(data.zoom);
  }

  async function adjustZoom(delta) {
    const current = await getZoom();
    return setZoom(current + Number(delta || 0));
  }

  async function loadTable(table) {
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
    return fetchJson("/api/open-snapshot", { method: "POST" });
  }

  async function listSnapshots() {
    return fetchJson("/api/snapshots");
  }

  async function loadSnapshot(name) {
    return fetchJson(`/api/snapshots/${encodeURIComponent(name)}`);
  }

  window.AppApi = {
    waitForBackend,
    catalogLabel,
    catalogValor,
    getHistory,
    upsertCatalog,
    removeCatalog,
    upsertPatient,
    removePatient,
    replacePatients,
    addHistory,
    removeHistory,
    replaceHistory,
    getTechnologies,
    addTechnology,
    removeTechnology,
    replaceTechnologies,
    getUnimedNProcedures,
    addUnimedNProcedure,
    removeUnimedNProcedure,
    replaceUnimedNProcedures,
    loadTable,
    getZoom,
    setZoom,
    adjustZoom,
    getWebZoomFactor,
    exportPdf,
    openSnapshot,
    listSnapshots,
    loadSnapshot,
  };
})();
