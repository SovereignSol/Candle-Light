window.Auth = (() => {
  const el = (id) => document.getElementById(id);

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

    // Keep redirects on same origin.
    const redirectTo = window.location.origin + "/index.html";

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
    window.location.href = window.location.origin + "/index.html";
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
    const { session } = await getSession();
    if (session?.user) return true;

    window.location.href = "../index.html";
    return false;
  }

  return {
    initAuthUI,
    initHeaderUI,
    requireSessionOrRedirect,
    getUserId
  };
})();
