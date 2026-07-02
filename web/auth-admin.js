(function () {
  const adminBar = document.querySelector("#authAdminBar");
  const userLabel = document.querySelector("#authUserLabel");
  const createGuestButton = document.querySelector("#createGuestButton");
  const logoutButton = document.querySelector("#logoutButton");
  const credentialsPanel = document.querySelector("#guestCredentialsPanel");
  const guestAccessToken = document.querySelector("#guestAccessToken");
  const guestCredentialExpiry = document.querySelector("#guestCredentialExpiry");
  const copyGuestTokenButton = document.querySelector("#copyGuestTokenButton");
  const dismissGuestCredentialsButton = document.querySelector("#dismissGuestCredentialsButton");

  let currentGuestToken = "";

  function formatExpiry(isoDate) {
    if (!isoDate) {
      return "Sem prazo";
    }

    return new Date(isoDate).toLocaleString("pt-BR");
  }

  function showGuestToken(result) {
    currentGuestToken = result.token;
    guestAccessToken.textContent = result.token;
    guestCredentialExpiry.textContent = formatExpiry(result.guest.expiresAt);
    copyGuestTokenButton.textContent = "Copiar token";
    credentialsPanel.hidden = false;
  }

  async function copyGuestToken() {
    if (!currentGuestToken) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentGuestToken);
      } else {
        const helper = document.createElement("textarea");
        helper.value = currentGuestToken;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.left = "-9999px";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }

      copyGuestTokenButton.textContent = "Copiado!";
      window.setTimeout(() => {
        copyGuestTokenButton.textContent = "Copiar token";
      }, 2000);
    } catch {
      window.alert("Não foi possível copiar automaticamente. Selecione o token e use Ctrl+C.");
    }
  }

  async function initializeAuthAdmin() {
    if (AppApi.isTauri()) {
      return;
    }

    adminBar.hidden = true;
    credentialsPanel.hidden = true;

    await AppApi.waitForBackend();

    let status;

    try {
      status = await AppApi.getAuthStatus();
    } catch {
      return;
    }

    if (!status.authRequired) {
      return;
    }

    if (status.localAccess) {
      adminBar.hidden = false;
      userLabel.textContent = "PC local";
      createGuestButton.hidden = false;
      logoutButton.hidden = true;
      return;
    }

    if (!status.authenticated) {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.replace(`/login.html?next=${next}`);
      return;
    }

    adminBar.hidden = false;
    userLabel.textContent = status.user?.label || "Sessão ativa";
    createGuestButton.hidden = true;
    logoutButton.hidden = false;
  }

  createGuestButton?.addEventListener("click", async () => {
    const label = window.prompt("Identificação do acesso (opcional):", "Consultório remoto");

    if (label === null) {
      return;
    }

    createGuestButton.disabled = true;

    try {
      const result = await AppApi.createGuest(label, 24);
      showGuestToken(result);
    } catch (error) {
      window.alert(error.message || "Não foi possível criar o acesso.");
    } finally {
      createGuestButton.disabled = false;
    }
  });

  logoutButton?.addEventListener("click", async () => {
    try {
      await AppApi.logout();
    } finally {
      window.location.replace("/login.html");
    }
  });

  copyGuestTokenButton?.addEventListener("click", () => {
    void copyGuestToken();
  });

  dismissGuestCredentialsButton?.addEventListener("click", () => {
    credentialsPanel.hidden = true;
  });

  document.addEventListener("DOMContentLoaded", () => {
    void initializeAuthAdmin();
  });
})();
