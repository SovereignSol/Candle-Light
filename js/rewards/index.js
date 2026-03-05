window.RewardsPage = (() => {
  const Role = window.RewardsRole;
  const StickerStore = window.RewardsStickerStore;
  const Allowance = window.RewardsAllowance;
  const Stickerbook = window.RewardsStickerbook;
  const PR = window.RewardsPR;
  const Realtime = window.RewardsRealtime;

  const ICONS = {
    tabs: {
      purchase: "../icons/tab_purchase.webp",
      allowance: "../icons/tab_allowance.webp",
      stickerbook: "../icons/tab_stickerbook.webp",
      wishlist: "../icons/tab_wishlist.webp"
    },
    status: {
      pending: "../icons/status_pending.webp",
      approved: "../icons/status_approved.webp",
      denied: "../icons/status_denied.webp"
    },
    actions: {
      approve: "../icons/btn_approve.webp",
      deny: "../icons/btn_deny.webp",
      wishlist: "../icons/btn_wishlist.webp",
      please: "../icons/btn_please.webp"
    }
  };

  function wireTopTabs() {
    const btns = Array.from(document.querySelectorAll(".top-tab"));
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        btns.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const id = b.getAttribute("data-panel");
        document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
        document.getElementById(id).classList.add("active");
      })
    );
  }

  function wireModeToggle() {
    const btn = document.getElementById("btnModeToggle");
    if (!btn) return;

    const bypassed = Auth.isBypassed && Auth.isBypassed();
    btn.textContent = bypassed ? "Use Live Data" : "Use Local Preview";
    btn.title = bypassed ? "Switch to Supabase-backed mode" : "Switch to local UI preview mode";

    btn.addEventListener("click", () => {
      const current = Auth.isBypassed && Auth.isBypassed();
      if (Auth.setBypassed) Auth.setBypassed(!current);
      window.location.reload();
    });
  }

  function loadLocalPreviewState() {
    const myBalance = document.getElementById("myBalance");
    if (myBalance) myBalance.textContent = "$42.00";

    const balances = document.getElementById("balances");
    if (balances) {
      balances.innerHTML = `
        <div class="box">
          <div class="muted small">User</div>
          <div class="small">local-user</div>
          <div class="muted small" style="margin-top:10px;">Balance</div>
          <div class="value">$42.00</div>
        </div>
      `;
    }

    const ledger = document.getElementById("ledger");
    if (ledger) ledger.innerHTML = `<div class="muted">Local UI mode: database calls are disabled.</div>`;

    const stickerbookList = document.getElementById("stickerbookList");
    if (stickerbookList) stickerbookList.innerHTML = `<div class="muted">Local UI mode: sticker awards preview is disabled.</div>`;

    const stickerOptionsList = document.getElementById("stickerOptionsList");
    if (stickerOptionsList) stickerOptionsList.innerHTML = `<div class="muted">Local UI mode: sticker options preview is disabled.</div>`;

    const prLaneList = document.getElementById("prLaneList");
    if (prLaneList) {
      prLaneList.innerHTML = `
        <div class="list-row">
          <div class="card-left">
            <div class="pill"><img src="../icons/status_pending.webp" alt=""><span>PENDING</span></div>
            <div class="pr-title">Sample Purchase Item</div>
            <div class="muted small">Cost: 19.99 • Shipping: 3.99 • Sale End: 2026-12-31 • Want: 9</div>
            <a class="link small" href="#" onclick="return false;">Open link</a>
          </div>
          <div class="pr-actions">
            <button class="btn btn-primary btn-icon" disabled><img src="../icons/btn_approve.webp" alt="">Approve</button>
            <button class="btn btn-danger btn-icon" disabled><img src="../icons/btn_deny.webp" alt="">Deny</button>
          </div>
        </div>
      `;
    }

    const wlList = document.getElementById("wlList");
    if (wlList) wlList.innerHTML = `<div class="muted">Local UI mode: no wishlist data.</div>`;

    const countPending = document.getElementById("countPending");
    const countApproved = document.getElementById("countApproved");
    const countDenied = document.getElementById("countDenied");
    if (countPending) countPending.textContent = "(1)";
    if (countApproved) countApproved.textContent = "(0)";
    if (countDenied) countDenied.textContent = "(0)";
  }

  async function refreshAll() {
    await StickerStore.refresh();
    await Role.load();

    await Allowance.loadMyBalance();
    await Allowance.loadBalances();
    await Allowance.loadMembersSelect();
    await Allowance.loadStickersSelect();
    await Allowance.loadLedger();

    await Stickerbook.loadStickerAwards();
    await Stickerbook.loadStickerOptions();

    await PR.loadAll();
  }

  async function init() {
    const ok = await Auth.requireSessionOrRedirect();
    if (!ok) return;

    await Auth.initHeaderUI();
    wireModeToggle();
    wireTopTabs();

    PR.configure({ icons: ICONS });

    if (Auth.isBypassed && Auth.isBypassed()) {
      loadLocalPreviewState();
      return;
    }

    PR.wire();
    Allowance.wire();

    await refreshAll();

    PR.subscribeRealtime();
    Realtime.subscribeOtherRealtime();
  }

  return { init };
})();
