(function () {
  const DISMISS_MS = 5500;

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

  function showToast(payload) {
    const root = ensureContainer();
    const item = document.createElement("div");
    item.className = `axis-sync-toast ${levelClass(payload.level)}`;
    item.textContent = String(payload.message || "Sync com o Axis");
    root.appendChild(item);

    requestAnimationFrame(() => {
      item.classList.add("axis-sync-toast--visible");
    });

    window.setTimeout(() => {
      item.classList.remove("axis-sync-toast--visible");
      window.setTimeout(() => item.remove(), 220);
    }, DISMISS_MS);
  }

  function connect() {
    const host = window.location.hostname;
    if (!window.EventSource || (host !== "localhost" && host !== "127.0.0.1")) {
      return;
    }

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
    source.onerror = () => {
      source.close();
      window.setTimeout(connect, 8000);
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connect);
  } else {
    connect();
  }
})();
