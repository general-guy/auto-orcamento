(function () {
  const form = document.querySelector("#login-form");
  const errorBox = document.querySelector("#loginError");
  const submitButton = form.querySelector(".login-submit");

  function getNextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (!next || !next.startsWith("/") || next.startsWith("//")) {
      return "/";
    }

    return next;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  async function ensureLoginRequired() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (window.AppApi?.getAuthStatus) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!window.AppApi?.getAuthStatus) {
      showError("Não foi possível carregar o app. Atualize a página.");
      return false;
    }

    const status = await AppApi.getAuthStatus();

    if (!status.authRequired) {
      window.location.replace("/");
      return false;
    }

    if (status.authenticated) {
      window.location.replace(getNextPath());
      return false;
    }

    return true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    submitButton.disabled = true;

    try {
      if (!window.AppApi?.login) {
        throw new Error("Carregando… tente de novo em instantes.");
      }

      await AppApi.login(form.token.value.trim());
      window.location.replace(getNextPath());
    } catch (error) {
      showError(error.message || "Não foi possível entrar.");
      submitButton.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    void ensureLoginRequired();
  });
})();
