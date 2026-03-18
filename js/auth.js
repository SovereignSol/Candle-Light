window.Auth = (() => {
  const el = (id) => document.getElementById(id);
  const DEV_MODE_KEY = "DEV_DISABLE_AUTH";
  const CONFIG_BYPASS = !!(window.APP_CONFIG && window.APP_CONFIG.DEV_DISABLE_AUTH);
  const DEV_USER_ID =
    (window.APP_CONFIG && window.APP_CONFIG.DEV_USER_ID) ||
    "00000000-0000-0000-0000-000000000001";

  function isBypassed() {
    const raw = localStorage.getItem(DEV_MODE_KEY);
    if (!CONFIG_BYPASS && raw === "true") return false;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return CONFIG_BYPASS;
  }

  function setBypassed(nextValue) {
    localStorage.setItem(DEV_MODE_KEY, nextValue ? "true" : "false");
  }

  function getBasePath() {
    const p = window.location.pathname;
    const idxPages = p.indexOf("/pages/");
    if (idxPages !== -1) return p.slice(0, idxPages + 1);
    if (p.endsWith("/index.html")) return p.slice(0, p.length - "index.html".length);
    if (p.endsWith("/")) return p;
    return p.replace(/[^/]+$/, "");
  }

  function indexUrl() {
    return window.location.origin + getBasePath() + "index.html";
  }

  async function getSession() {
    if (isBypassed()) {
      return {
        session: {
          user: {
            id: DEV_USER_ID,
            email: "local-ui-mode@dev.local"
          }
        },
        error: null
      };
    }

    const { data, error } = await Supa.client.auth.getSession();
    if (error) return { session: null, error };
    return { session: data.session, error: null };
  }

  async function getUserId() {
    if (isBypassed()) return DEV_USER_ID;

    const { data, error } = await Supa.client.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  }

  function normalizeEmail(raw) {
    return String(raw || "").trim().toLowerCase();
  }

  async function signInWithPasswordPrompt() {
    if (isBypassed()) {
      UI.toast("Local UI mode: auth is disabled.");
      await refreshAuthStatus();
      return;
    }

    const emailInput = await UI.prompt("Enter your account email.", "", "Sign In", "name@example.com");
    const email = normalizeEmail(emailInput);
    if (!email) {
      UI.toast("Email is required.");
      return;
    }

    const password = await UI.prompt("Enter your password.", "", "Sign In", "Password", "password");
    if (!password) {
      UI.toast("Password is required.");
      return;
    }

    const { data: signInData, error: signInError } = await Supa.client.auth.signInWithPassword({ email, password });

    if (!signInError) {
      UI.toast("Signed in.");
      await refreshAuthStatus();
      return;
    }

    const msg = String(signInError.message || "").toLowerCase();

    if (msg.includes("email not confirmed")) {
      UI.toast("Email not confirmed yet. Check your inbox for the confirmation email, then try again.");
      return;
    }

    if (msg.includes("invalid login credentials")) {
      UI.toast("Invalid email or password.");
      return;
    }

    const wantsSignup = await UI.confirm(
      "Sign-in failed. If this is your first time, create a new account with this email and password?",
      "Create Account"
    );
    if (!wantsSignup) {
      UI.toast(signInError.message);
      return;
    }

    const { data: signupData, error: signupError } = await Supa.client.auth.signUp({ email, password });

    if (signupError) {
      const sMsg = String(signupError.message || "").toLowerCase();
      if (sMsg.includes("already registered") || sMsg.includes("duplicate key value")) {
        UI.toast("Account already exists. Try signing in or reset your password.");
      } else {
        UI.toast(signupError.message);
      }
      return;
    }

    if (!signupData?.session) {
      UI.toast("Account created. Check your email to confirm, then sign in.");
      return;
    }

    UI.toast("Account created and signed in.");
    await refreshAuthStatus();
  }

  async function signOut() {
    if (isBypassed()) {
      UI.toast("Local UI mode: sign out skipped.");
      await refreshAuthStatus();
      return;
    }

    const { error } = await Supa.client.auth.signOut();
    if (error) UI.toast(error.message);
    window.location.href = indexUrl();
  }

  async function initAuthUI() {
    const btnIn = el("btnSignIn");
    const btnOut = el("btnSignOut");

    if (btnIn) btnIn.addEventListener("click", signInWithPasswordPrompt);
    if (btnOut) btnOut.addEventListener("click", signOut);

    if (!isBypassed()) {
      Supa.client.auth.onAuthStateChange(async () => {
        await refreshAuthStatus();
      });
    }

    await refreshAuthStatus();
  }

  async function initHeaderUI() {
    const btnOut = el("btnSignOut");
    if (btnOut) {
      btnOut.classList.remove("hidden");
      btnOut.addEventListener("click", signOut);
    }
    await refreshAuthStatus();
  }

  async function refreshAuthStatus() {
    const status = el("authStatus");
    const btnIn = el("btnSignIn");
    const btnOut = el("btnSignOut");

    if (isBypassed()) {
      if (status) status.textContent = "Local UI mode";
      if (btnIn) btnIn.classList.add("hidden");
      if (btnOut) btnOut.classList.add("hidden");
      return;
    }

    const { session } = await getSession();

    if (session?.user) {
      if (status) status.textContent = "Signed in";
      if (btnIn) btnIn.classList.add("hidden");
      if (btnOut) btnOut.classList.remove("hidden");
    } else {
      if (status) status.textContent = "Signed out";
      if (btnIn) btnIn.classList.remove("hidden");
      if (btnOut) btnOut.classList.add("hidden");
    }
  }

  async function requireSessionOrRedirect() {
    if (isBypassed()) return true;

    for (let i = 0; i < 3; i++) {
      const { session } = await getSession();
      if (session?.user) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    window.location.href = indexUrl();
    return false;
  }

  return {
    initAuthUI,
    initHeaderUI,
    requireSessionOrRedirect,
    getUserId,
    isBypassed,
    setBypassed
  };
})();
