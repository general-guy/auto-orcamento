(function () {
  const ZOOM_STEP = 0.1;
  const ZOOM_DEFAULT = 1;

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

  async function adjustZoom(delta) {
    return AppApi.adjustZoom(delta);
  }

  async function resetZoom() {
    return AppApi.setZoom(ZOOM_DEFAULT);
  }

  async function initZoomControls() {
    await AppApi.waitForBackend();

    if (!AppApi.isTauri()) {
      return;
    }

    await AppApi.getZoom();

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
