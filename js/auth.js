window.Auth = (() => {
  const el = (id) => document.getElementById(id);

  function getBasePath() {
    // Supports GitHub Pages project sites (https://user.github.io/repo/...)
    // and user sites (https://user.github.io/...).
    // Returns a path that ends with "/".
    const p = window.location.pathname;

    // If on a feature page: /<base>/pages/<file>.html
    const idxPages = p.indexOf("/pages/");
    if (idxPages !== -1) return p.slice(0, idxPages + 1);

    // If on index.html: /<base>/index.html
    if (p.endsWith("/index.html")) return p.slice(0, p.length - "index.html".length);

    // If on root dir (rare): /<base>/
    if (p.endsWith("/")) return p;

    // Fallback: strip filename
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

  async function signInPrompt() {
    const email = prompt("Email to sign in:");
    if (!email) return;

    const redirectTo = indexUrl();

    const { error } = await Supa.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) UI.toast(error.message);
    else UI.toast("Check your email for the sign-in link.");
  }

  async function signOut() {
    const { error } = await Supa.client.auth.signOut();
    if (error) UI.toast(error.message);
    window.location.href = indexUrl();
  }

  async function initAuthUI() {
    const btnIn = el("btnSignIn");
    const btnOut = el("btnSignOut");

    if (btnIn) btnIn.addEventListener("click", signInPrompt);
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
    // Sometimes session restoration can lag right after navigation.
    // Try a couple of times before redirecting.
    for (let i = 0; i < 3; i++) {
      const { session } = await getSession();
      if (session?.user) return true;
      await new Promise(r => setTimeout(r, 150));
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
