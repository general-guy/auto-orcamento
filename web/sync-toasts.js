(function () {
  const DISMISS_MS = 5500;
  const DISMISS_WAKE_MS = 20000;
  const HISTORY_MAX = 10;

  /** @type {{ at: Date, level: string, message: string, phase?: string }[]} */
  const historyEntries = [];

  let historyUi = null;

  function ensureContainer() {
    let root = document.getElementById("axis-sync-toasts");
    if (!root) {
      root = document.createElement("div");
      root.id = "axis-sync-toasts";
      root.className = "axis-sync-toasts";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    return root;
  }

  function levelClass(level) {
    if (level === "ok" || level === "success") {
      return "axis-sync-toast--ok";
    }
    if (level === "warn" || level === "warning") {
      return "axis-sync-toast--warn";
    }
    return "axis-sync-toast--error";
  }

  function dismissMs(payload) {
    if (payload.phase === "wake") {
      return payload.level === "warn" ? DISMISS_WAKE_MS : DISMISS_MS;
    }
    return DISMISS_MS;
  }

  function formatHistoryTime(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  function pushHistory(payload) {
    historyEntries.unshift({
      at: new Date(),
      level: String(payload.level || "error"),
      message: String(payload.message || "Sync com o Axis"),
      phase: payload.phase ? String(payload.phase) : undefined,
    });
    if (historyEntries.length > HISTORY_MAX) {
      historyEntries.length = HISTORY_MAX;
    }
    if (historyUi?.panel && !historyUi.panel.hidden) {
      renderHistoryList();
    }
  }

  function renderHistoryList() {
    if (!historyUi?.list) {
      return;
    }
    const list = historyUi.list;
    list.replaceChildren();
    if (!historyEntries.length) {
      const empty = document.createElement("li");
      empty.className = "axis-sync-history-empty";
      empty.textContent = "Nenhum aviso nesta sessão.";
      list.appendChild(empty);
      return;
    }
    for (const entry of historyEntries) {
      const item = document.createElement("li");
      item.className = `axis-sync-history-item axis-sync-history-item--${levelClass(entry.level).replace("axis-sync-toast--", "")}`;

      const time = document.createElement("time");
      time.className = "axis-sync-history-time";
      time.dateTime = entry.at.toISOString();
      time.textContent = formatHistoryTime(entry.at);

      const text = document.createElement("span");
      text.className = "axis-sync-history-message";
      text.textContent = entry.message;

      item.append(time, text);
      list.appendChild(item);
    }
  }

  function setHistoryOpen(open) {
    if (!historyUi) {
      return;
    }
    historyUi.panel.hidden = !open;
    historyUi.button.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      renderHistoryList();
    }
  }

  function ensureHistoryUi() {
    if (historyUi) {
      return historyUi;
    }

    const wrap = document.createElement("div");
    wrap.className = "axis-sync-history-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "axis-sync-history-btn";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "axis-sync-history-panel");
    button.setAttribute("aria-label", "Histórico dos avisos de sincronização com o Axis");
    button.title = "Histórico de sync";
    button.innerHTML =
      '<svg class="axis-sync-history-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.98 6.98 0 0 1-4.94-2.06l-1.42 1.42A8.98 8.98 0 0 0 12 21a9 9 0 0 0 9-9 9 9 0 0 0-8-9Zm-1 5v5l4.25 2.52.75-1.23-3.5-2.08V8H12Z"/></svg>';

    const panel = document.createElement("div");
    panel.id = "axis-sync-history-panel";
    panel.className = "axis-sync-history-panel";
    panel.hidden = true;

    const title = document.createElement("p");
    title.className = "axis-sync-history-title";
    title.textContent = "Últimos avisos de sync";

    const list = document.createElement("ol");
    list.className = "axis-sync-history-list";

    panel.append(title, list);
    wrap.append(button, panel);

    const toolbar = document.querySelector(".preview-toolbar");
    if (toolbar) {
      toolbar.appendChild(wrap);
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setHistoryOpen(panel.hidden);
    });

    document.addEventListener("click", (event) => {
      if (!historyUi || historyUi.panel.hidden) {
        return;
      }
      if (!wrap.contains(event.target)) {
        setHistoryOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setHistoryOpen(false);
      }
    });

    historyUi = { wrap, button, panel, list };
    return historyUi;
  }

  function showToast(payload) {
    pushHistory(payload);
    const root = ensureContainer();
    const item = document.createElement("div");
    item.className = `axis-sync-toast ${levelClass(payload.level)}`;
    item.textContent = String(payload.message || "Sync com o Axis");
    root.appendChild(item);

    requestAnimationFrame(() => {
      item.classList.add("axis-sync-toast--visible");
    });

    const hideAfter = dismissMs(payload);
    window.setTimeout(() => {
      item.classList.remove("axis-sync-toast--visible");
      window.setTimeout(() => item.remove(), 220);
    }, hideAfter);
  }

  function isLocalAtlasHost() {
    const host = String(window.location.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  function connect() {
    if (!window.EventSource || !isLocalAtlasHost()) {
      return;
    }

    ensureHistoryUi();

    const source = new EventSource("/api/sync/events");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "toast") {
          showToast(payload);
        }
      } catch {
        // ignore
      }
    };
    source.addEventListener("open", () => {
      ensureContainer();
    });
    source.onerror = () => {
      source.close();
      window.setTimeout(connect, 8000);
    };
  }

  function connectWhenIdle() {
    const run = () => connect();
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 100);
    }
  }

  window.AutoOrcamentoSyncUi = {
    showToast,
    ensureContainer,
    connect,
  };

  if (document.readyState === "complete") {
    connectWhenIdle();
  } else {
    window.addEventListener("load", connectWhenIdle, { once: true });
  }
})();
