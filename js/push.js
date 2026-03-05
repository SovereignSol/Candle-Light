window.PushNotifications = (() => {
  const el = (id) => document.getElementById(id);

  function setStatus(text) {
    const node = el("pushStatus");
    if (node) node.textContent = text;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function browserSupportsPush() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  async function ensureRegisteredServiceWorker() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    return navigator.serviceWorker.register("./sw.js");
  }

  async function saveSubscription(subscription) {
    const uid = await Auth.getUserId();
    if (!uid) throw new Error("Sign in before enabling notifications.");

    const json = subscription.toJSON();
    const endpoint = json.endpoint || subscription.endpoint;
    const p256dh = json.keys?.p256dh || null;
    const auth = json.keys?.auth || null;

    const { error } = await Supa.client.from("push_subscriptions").upsert(
      {
        user_id: uid,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;
  }

  async function subscribe() {
    if (!browserSupportsPush()) {
      throw new Error("Push notifications are not supported on this device/browser.");
    }

    const vapid = (window.APP_CONFIG && window.APP_CONFIG.VAPID_PUBLIC_KEY) || "";
    if (!vapid) {
      throw new Error("Missing VAPID public key in js/config.js.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission not granted.");
    }

    const reg = await ensureRegisteredServiceWorker();
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid)
      }));

    await saveSubscription(sub);
    return sub;
  }

  async function bindEnableButton() {
    const btn = el("btnEnablePush");
    if (!btn) return;

    if (!browserSupportsPush()) {
      btn.disabled = true;
      setStatus("Not supported on this browser.");
      return;
    }

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      setStatus("Enabling notifications...");
      try {
        await subscribe();
        setStatus("Notifications enabled.");
      } catch (err) {
        setStatus(err?.message || "Could not enable notifications.");
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function initUI() {
    await bindEnableButton();
  }

  return { initUI, subscribe };
})();
