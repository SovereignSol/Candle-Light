window.RewardsAllowance = (() => {
  const Helpers = window.RewardsHelpers;
  const Role = window.RewardsRole;
  const StickerStore = window.RewardsStickerStore;

  const el = (id) => document.getElementById(id);

  async function loadMyBalance() {
    const uid = await Auth.getUserId();
    if (!uid) return;
    const { data, error } = await Supa.client
      .from("allowance_balances")
      .select("balance")
      .eq("user_id", uid)
      .maybeSingle();
    if (!error && el("myBalance")) el("myBalance").textContent = Helpers.fmtMoney(data?.balance || 0);
  }

  async function loadBalances() {
    const { data, error } = await Supa.client
      .from("allowance_balances")
      .select("*")
      .order("user_id", { ascending: true });
    if (error) return UI.toast(error.message);

    const root = el("balances");
    if (!root) return;
    root.innerHTML = "";
    if (!data || !data.length) {
      root.innerHTML = `<div class="muted">No balances yet.</div>`;
      return;
    }
    for (const b of data) {
      const box = document.createElement("div");
      box.className = "box";
      box.innerHTML = `
        <div class="muted small">User</div>
        <div class="small">${b.user_id}</div>
        <div class="muted small" style="margin-top:10px;">Balance</div>
        <div class="value">${Helpers.fmtMoney(b.balance)}</div>
      `;
      root.appendChild(box);
    }
  }

  async function loadMembersSelect() {
    const sel = el("awUser");
    if (!sel) return;
    sel.innerHTML = "";
    const { data, error } = await Supa.client
      .from("app_members")
      .select("user_id,role")
      .order("role", { ascending: true });
    if (error) return UI.toast(error.message);

    for (const u of data || []) {
      const opt = document.createElement("option");
      opt.value = u.user_id;
      opt.textContent = `${u.user_id} (${u.role})`;
      sel.appendChild(opt);
    }
  }

  async function loadStickersSelect() {
    const sel = el("awSticker");
    if (!sel) return;
    sel.innerHTML = "";
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "No sticker";
    sel.appendChild(optNone);

    const stickers = StickerStore.all().filter((s) => s.is_active);
    for (const s of stickers) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      sel.appendChild(opt);
    }
  }

  async function award() {
    if (!Role.owner()) return UI.toast("Only owner can award allowance.");

    const created_by = await Auth.getUserId();
    if (!created_by) return UI.toast("Not signed in.");

    const user_id = el("awUser").value;
    const amount = Helpers.toNumberRequired(el("awAmount").value);
    const sticker_id = el("awSticker").value || null;
    const message = (el("awMessage").value || "").trim();

    if (!user_id) return UI.toast("Recipient is required.");
    if (amount === null) return UI.toast("Amount is required.");
    if (!message) return UI.toast("Message is required.");

    const payload = { user_id, amount, reason: "Allowance Award", message, sticker_id, created_by };
    const { error } = await Supa.client.from("allowance_ledger").insert(payload);
    if (error) return UI.toast(error.message);

    el("awAmount").value = "";
    el("awMessage").value = "";
    el("awSticker").value = "";
  }

  async function loadLedger() {
    const { data, error } = await Supa.client
      .from("allowance_ledger")
      .select("id,user_id,amount,reason,message,sticker_id,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return UI.toast(error.message);

    const root = el("ledger");
    if (!root) return;
    root.innerHTML = "";
    if (!data || !data.length) {
      root.innerHTML = `<div class="muted">No ledger entries yet.</div>`;
      return;
    }

    for (const it of data) {
      const row = document.createElement("div");
      row.className = "list-row";

      const left = document.createElement("div");
      left.className = "card-left";

      const title = document.createElement("div");
      title.className = "pr-title";
      title.textContent = `${it.reason || "Ledger"} (${it.amount >= 0 ? "+" : ""}${Number(it.amount).toFixed(2)})`;

      const meta = document.createElement("div");
      meta.className = "muted small";
      meta.textContent = `user: ${it.user_id} • ${new Date(it.created_at).toLocaleString()}`;

      const msg = document.createElement("div");
      msg.className = "muted small";
      msg.textContent = it.message ? `message: ${it.message}` : "";

      left.appendChild(title);
      left.appendChild(meta);
      if (it.message) left.appendChild(msg);

      row.appendChild(left);
      root.appendChild(row);
    }
  }

  function wire() {
    const btn = document.getElementById("btnAward");
    if (btn) btn.addEventListener("click", award);
  }

  return { loadMyBalance, loadBalances, loadMembersSelect, loadStickersSelect, loadLedger, wire };
})();
