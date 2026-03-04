window.RewardsStickerbook = (() => {
  const Helpers = window.RewardsHelpers;
  const StickerStore = window.RewardsStickerStore;

  async function loadStickerAwards() {
    const { data, error } = await Supa.client
      .from("allowance_ledger")
      .select("id,user_id,amount,message,sticker_id,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return UI.toast(error.message);

    const root = document.getElementById("stickerbookList");
    if (!root) return;
    root.innerHTML = "";

    const awards = (data || []).filter((x) => x.message && x.message.trim().length);
    if (!awards.length) {
      root.innerHTML = `<div class="muted">No sticker awards yet.</div>`;
      return;
    }

    for (const a of awards) {
      const row = document.createElement("div");
      row.className = "list-row";

      const left = document.createElement("div");
      left.className = "award-row";

      const st = a.sticker_id ? StickerStore.get(a.sticker_id) : null;
      const imgUrl = a.sticker_id ? StickerStore.urlForStickerId(a.sticker_id) : null;

      if (imgUrl) {
        const img = document.createElement("img");
        img.className = "sticker-img";
        img.src = imgUrl;
        img.alt = st?.label || "sticker";
        left.appendChild(img);
      }

      const text = document.createElement("div");
      text.className = "card-left";

      const title = document.createElement("div");
      title.className = "pr-title";
      title.textContent = `${st?.label ? st.label + " • " : ""}${Helpers.fmtMoney(a.amount)}`;

      const msg = document.createElement("div");
      msg.className = "muted";
      msg.textContent = a.message || "";

      const meta = document.createElement("div");
      meta.className = "muted small";
      meta.textContent = `${new Date(a.created_at).toLocaleString()}`;

      text.appendChild(title);
      text.appendChild(msg);
      text.appendChild(meta);

      left.appendChild(text);
      row.appendChild(left);
      root.appendChild(row);
    }
  }

  async function loadStickerOptions() {
    const root = document.getElementById("stickerOptionsList");
    if (!root) return;
    root.innerHTML = "";

    const stickers = StickerStore.all();
    if (!stickers.length) {
      root.innerHTML = `<div class="muted">No stickers found. Add rows in Supabase table <code>stickers</code>.</div>`;
      return;
    }

    for (const s of stickers) {
      const row = document.createElement("div");
      row.className = "list-row";

      const left = document.createElement("div");
      left.className = "award-row";

      const imgUrl = StickerStore.urlForStickerId(s.id);
      if (imgUrl) {
        const img = document.createElement("img");
        img.className = "sticker-img";
        img.src = imgUrl;
        img.alt = s.label;
        left.appendChild(img);
      }

      const text = document.createElement("div");
      text.className = "card-left";

      const title = document.createElement("div");
      title.className = "pr-title";
      title.textContent = s.label;

      const meta = document.createElement("div");
      meta.className = "muted small";
      meta.textContent = `Active: ${s.is_active ? "yes" : "no"} • sort: ${s.sort_order}${s.image_path ? " • image: yes" : ""}`;

      text.appendChild(title);
      text.appendChild(meta);

      left.appendChild(text);
      row.appendChild(left);
      root.appendChild(row);
    }
  }

  return { loadStickerAwards, loadStickerOptions };
})();
