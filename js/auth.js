window.Auth = (() => {
  const el = (id) => document.getElementById(id);

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
    const { data, error } = await Supa.client.auth.getSession();
    if (error) return { session: null, error };
    return { session: data.session, error: null };
  }

  async function getUserId() {
    const { data, error } = await Supa.client.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  }

  async function signInWithPasswordPrompt() {
    const email = prompt("Email:");
    if (!email) return;

    const password = prompt("Password:");
    if (!password) return;

    const { error } = await Supa.client.auth.signInWithPassword({ email, password });

    if (!error) {
      UI.toast("Signed in.");
      return;
    }

    // If the user doesn't exist yet, offer to sign up.
    const wantsSignup = confirm(
      "Sign-in failed. If this is your first time, click OK to create the account with this email/password."
    );
    if (!wantsSignup) {
      UI.toast(error.message);
      return;
    }

    const { error: signupError } = await Supa.client.auth.signUp({ email, password });
    if (signupError) UI.toast(signupError.message);
    else UI.toast("Account created. You are signed in.");
  }

  async function signOut() {
    const { error } = await Supa.client.auth.signOut();
    if (error) UI.toast(error.message);
    window.location.href = indexUrl();
  }

  async function initAuthUI() {
    const btnIn = el("btnSignIn");
    const btnOut = el("btnSignOut");

    if (btnIn) btnIn.addEventListener("click", signInWithPasswordPrompt);
    if (btnOut) btnOut.addEventListener("click", signOut);

    Supa.client.auth.onAuthStateChange(async () => {
      await refreshAuthStatus();
    });

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
    getUserId
  };
})();
