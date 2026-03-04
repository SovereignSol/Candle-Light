window.RewardsPR = (() => {
  const Helpers = window.RewardsHelpers;
  const Role = window.RewardsRole;

  let currentLane = "pending";
  let icons = null;

  function configure(cfg) {
    icons = cfg?.icons || null;
  }

  function laneName(status) {
    if (status === "pending") return "pending";
    if (status === "approved") return "approved";
    if (status === "denied") return "denied";
    if (status === "wishlist") return "wishlist";
    return "pending";
  }

  function pill(status, pleaseCount) {
    const d = document.createElement("div");
    d.className = "pill";
    const img = document.createElement("img");
    img.src = status === "pending" ? icons.status.pending : status === "approved" ? icons.status.approved : icons.status.denied;

    const t = document.createElement("span");
    t.textContent = status.toUpperCase() + (pleaseCount >= 1 ? " • PLEASE" : "");

    d.appendChild(img);
    d.appendChild(t);
    return d;
  }

  function metaText(it) {
    return `Cost: ${it.cost} • Shipping: ${it.shipping_cost} • Sale End: ${it.sale_end_date} • Want: ${it.want_scale}`;
  }

  async function loadAll() {
    const { data, error } = await Supa.client.from("purchase_requests").select("*").order("created_at", { ascending: false });

    if (error) return UI.toast(error.message);

    const items = data || [];
    const pending = items.filter((x) => laneName(x.status) === "pending");
    const approved = items.filter((x) => laneName(x.status) === "approved");
    const denied = items.filter((x) => laneName(x.status) === "denied");
    const wishlist = items.filter((x) => laneName(x.status) === "wishlist");

    document.getElementById("countPending").textContent = `(${pending.length})`;
    document.getElementById("countApproved").textContent = `(${approved.length})`;
    document.getElementById("countDenied").textContent = `(${denied.length})`;

    renderLane(currentLane, { pending, approved, denied });
    renderWishlist(wishlist);
  }

  function attachLaneButtons() {
    const laneBtns = Array.from(document.querySelectorAll(".lane-btn"));
    laneBtns.forEach((b) =>
      b.addEventListener("click", () => {
        laneBtns.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        currentLane = b.getAttribute("data-lane");
        loadAll();
      })
    );
  }

  async function updateStatus(it, status) {
    const { error } = await Supa.client.from("purchase_requests").update({ status }).eq("id", it.id);
    if (error) UI.toast(error.message);
  }

  async function pleaseOnce(it) {
    const current = it.please_count || 0;
    if (current >= 1) return UI.toast("PLEASE can only be used once.");

    const { error } = await Supa.client.from("purchase_requests").update({ status: "pending", please_count: 1 }).eq("id", it.id);

    if (error) UI.toast(error.message);
  }

  function renderLane(lane, groups) {
    const root = document.getElementById("prLaneList");
    root.innerHTML = "";

    let list = [];
    if (lane === "pending") list = groups.pending;
    if (lane === "approved") list = groups.approved;
    if (lane === "denied") list = groups.denied;

    if (!list.length) {
      root.innerHTML = `<div class="muted">No items in this section.</div>`;
      return;
    }

    for (const it of list) {
      const row = document.createElement("div");
      row.className = "list-row";

      const left = document.createElement("div");
      left.className = "card-left";

      const status = laneName(it.status);
      left.appendChild(pill(status, it.please_count || 0));

      const title = document.createElement("div");
      title.className = "pr-title";
      title.textContent = it.title;

      const meta = document.createElement("div");
      meta.className = "muted small";
      meta.textContent = metaText(it);

      const link = document.createElement("a");
      link.className = "link small";
      link.href = it.link;
      link.textContent = "Open link";
      link.target = "_blank";
      link.rel = "noreferrer";

      left.appendChild(title);
      left.appendChild(meta);
      left.appendChild(link);

      const right = document.createElement("div");
      right.className = "pr-actions";

      if (status === "pending") {
        const approve = document.createElement("button");
        approve.className = "btn btn-primary btn-icon";
        approve.innerHTML = `<img src="${icons.actions.approve}" alt="">Approve`;
        approve.onclick = () => updateStatus(it, "approved");

        const deny = document.createElement("button");
        deny.className = "btn btn-danger btn-icon";
        deny.innerHTML = `<img src="${icons.actions.deny}" alt="">Deny`;
        deny.onclick = () => updateStatus(it, "denied");

        if (!Role.owner()) {
          approve.disabled = true;
          deny.disabled = true;
          approve.title = "Owner only";
          deny.title = "Owner only";
        }

        right.appendChild(approve);
        right.appendChild(deny);
      }

      if (status === "approved") {
        const undo = document.createElement("button");
        undo.className = "btn btn-ghost";
        undo.textContent = "Undo";
        undo.onclick = () => updateStatus(it, "denied");
        right.appendChild(undo);
      }

      if (status === "denied") {
        const wl = document.createElement("button");
        wl.className = "btn btn-ghost btn-icon";
        wl.innerHTML = `<img src="${icons.actions.wishlist}" alt="">Wishlist`;
        wl.onclick = () => updateStatus(it, "wishlist");

        const please = document.createElement("button");
        please.className = "btn btn-primary btn-icon";
        please.innerHTML = `<img src="${icons.actions.please}" alt="">PLEASE :(`;
        please.onclick = () => pleaseOnce(it);

        if ((it.please_count || 0) >= 1) {
          please.disabled = true;
          please.title = "Already used";
        }

        right.appendChild(wl);
        right.appendChild(please);
      }

      row.appendChild(left);
      row.appendChild(right);
      root.appendChild(row);
    }
  }

  function renderWishlist(items) {
    const root = document.getElementById("wlList");
    root.innerHTML = "";

    if (!items.length) {
      root.innerHTML = `<div class="muted">No items in wishlist.</div>`;
      return;
    }

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "list-row";

      const left = document.createElement("div");
      left.className = "card-left";

      const title = document.createElement("div");
      title.className = "pr-title";
      title.textContent = it.title;

      const days = Helpers.daysSince(it.wishlist_at);
      const meta = document.createElement("div");
      meta.className = "muted small";
      meta.textContent = `${metaText(it)} • Days in wishlist: ${days}`;

      const link = document.createElement("a");
      link.className = "link small";
      link.href = it.link;
      link.textContent = "Open link";
      link.target = "_blank";
      link.rel = "noreferrer";

      left.appendChild(title);
      left.appendChild(meta);
      left.appendChild(link);

      const right = document.createElement("div");
      right.className = "pr-actions";

      const please = document.createElement("button");
      please.className = "btn btn-primary btn-icon";
      please.innerHTML = `<img src="${icons.actions.please}" alt="">PLEASE :(`;
      please.onclick = () => pleaseOnce(it);

      if ((it.please_count || 0) >= 1) {
        please.disabled = true;
        please.title = "Already used";
      }

      right.appendChild(please);

      row.appendChild(left);
      row.appendChild(right);
      root.appendChild(row);
    }
  }

  async function submit() {
    const title = (document.getElementById("prTitle").value || "").trim();
    const cost = Helpers.toNumberRequired(document.getElementById("prCost").value);
    const link = (document.getElementById("prLink").value || "").trim();
    const shipping = Helpers.toNumberRequired(document.getElementById("prShip").value);
    const saleEnd = (document.getElementById("prSaleEnd").value || "").trim();
    const want = Helpers.toIntRequired(document.getElementById("prWant").value);

    const userId = await Auth.getUserId();
    if (!userId) return UI.toast("Not signed in.");

    if (!title) return UI.toast("Title is required.");
    if (cost === null) return UI.toast("Cost is required.");
    if (!link) return UI.toast("Link is required.");
    if (shipping === null) return UI.toast("Shipping is required.");
    if (!saleEnd) return UI.toast("Sale End Date is required.");
    if (want === null || want < 1 || want > 10) return UI.toast("Want Scale (1-10) is required.");

    const payload = {
      title,
      link,
      cost,
      shipping_cost: shipping,
      sale_end_date: saleEnd,
      want_scale: want,
      status: "pending",
      created_by: userId,
      please_count: 0
    };

    const { error } = await Supa.client.from("purchase_requests").insert(payload);
    if (error) return UI.toast(error.message);

    document.getElementById("prTitle").value = "";
    document.getElementById("prCost").value = "";
    document.getElementById("prLink").value = "";
    document.getElementById("prShip").value = "";
    document.getElementById("prSaleEnd").value = "";
    document.getElementById("prWant").value = "";
  }

  function wire() {
    attachLaneButtons();
    document.getElementById("btnSubmitPR").addEventListener("click", submit);
  }

  function subscribeRealtime() {
    const ch = Supa.client.channel("rt-pr");
    ch.on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, () => loadAll());
    ch.subscribe();
  }

  return { configure, wire, loadAll, subscribeRealtime };
})();
