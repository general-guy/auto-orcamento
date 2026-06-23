(function () {
  const ZOOM_STEP = 0.1;
  const ZOOM_DEFAULT = 1;
  const ZOOM_FLAG_HIDE_MS = 3500;

  let currentZoom = ZOOM_DEFAULT;
  let hideTimer = null;

  const flagEl = document.getElementById("zoomFlag");
  const levelEl = document.getElementById("zoomFlagLevel");
  const outButton = document.getElementById("zoomFlagOut");
  const inButton = document.getElementById("zoomFlagIn");
  const resetButton = document.getElementById("zoomFlagReset");

  function isZoomModifier(event) {
    return event.ctrlKey || event.metaKey;
  }

  function isZoomInKey(event) {
    return event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
  }

  function isZoomOutKey(event) {
    return event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
  }

  function isZoomResetKey(event) {
    return event.key === "0" || event.code === "Numpad0";
  }

  function formatZoomPercent(scale) {
    return `${Math.round(scale * 100)}%`;
  }

  function isDefaultZoom(scale) {
    return Math.abs(scale - ZOOM_DEFAULT) < 0.001;
  }

  function showZoomFlag(options = {}) {
    const { persistent = false } = options;

    if (!flagEl) {
      return;
    }

    flagEl.hidden = false;
    flagEl.classList.add("is-visible");

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (!persistent && isDefaultZoom(currentZoom)) {
      hideTimer = window.setTimeout(() => {
        flagEl.classList.remove("is-visible");
        flagEl.hidden = true;
      }, ZOOM_FLAG_HIDE_MS);
    }
  }

  function updateZoomFlag(scale) {
    currentZoom = scale;

    if (levelEl) {
      levelEl.textContent = formatZoomPercent(scale);
    }

    if (resetButton) {
      resetButton.hidden = isDefaultZoom(scale);
    }

    showZoomFlag({ persistent: !isDefaultZoom(scale) });
  }

  async function adjustZoom(delta) {
    const next = await AppApi.adjustZoom(delta);
    updateZoomFlag(next);
    return next;
  }

  async function resetZoom() {
    const next = await AppApi.setZoom(ZOOM_DEFAULT);
    updateZoomFlag(next);
    return next;
  }

  async function initZoomControls() {
    await AppApi.waitForBackend();

    const initialZoom = await AppApi.getZoom();
    currentZoom = initialZoom;

    if (levelEl) {
      levelEl.textContent = formatZoomPercent(initialZoom);
    }

    if (resetButton) {
      resetButton.hidden = isDefaultZoom(initialZoom);
    }

    if (flagEl && !isDefaultZoom(initialZoom)) {
      flagEl.hidden = false;
      flagEl.classList.add("is-visible");
    }

    outButton?.addEventListener("click", () => {
      void adjustZoom(-ZOOM_STEP);
    });

    inButton?.addEventListener("click", () => {
      void adjustZoom(ZOOM_STEP);
    });

    resetButton?.addEventListener("click", () => {
      void resetZoom();
    });

    document.addEventListener(
      "wheel",
      (event) => {
        if (!isZoomModifier(event)) {
          return;
        }

        event.preventDefault();
        const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        void adjustZoom(delta);
      },
      { passive: false },
    );

    document.addEventListener("keydown", (event) => {
      if (!isZoomModifier(event)) {
        return;
      }

      if (isZoomInKey(event)) {
        event.preventDefault();
        void adjustZoom(ZOOM_STEP);
        return;
      }

      if (isZoomOutKey(event)) {
        event.preventDefault();
        void adjustZoom(-ZOOM_STEP);
        return;
      }

      if (isZoomResetKey(event)) {
        event.preventDefault();
        void resetZoom();
      }
    });
  }

  void initZoomControls();
})();
