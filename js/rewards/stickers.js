window.RewardsStickerStore = (() => {
  const BUCKET = "stickers";
  let list = [];
  let map = new Map();

  function publicUrl(path) {
    if (!path) return null;
    const { data } = Supa.client.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function refresh() {
    const { data, error } = await Supa.client
      .from("stickers")
      .select("id,label,image_path,is_active,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      UI.toast(error.message);
      return;
    }

    list = data || [];
    map = new Map(list.map((s) => [s.id, s]));
  }

  function all() {
    return list;
  }

  function get(id) {
    return map.get(id) || null;
  }

  function urlForStickerId(id) {
    const s = get(id);
    if (!s) return null;
    return publicUrl(s.image_path);
  }

  return { refresh, all, get, urlForStickerId };
})();
