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
    wireTopTabs();

    PR.configure({ icons: ICONS });
    PR.wire();
    Allowance.wire();

    await refreshAll();

    PR.subscribeRealtime();
    Realtime.subscribeOtherRealtime();
  }

  return { init };
})();
