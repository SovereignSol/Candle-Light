window.RewardsRole = (() => {
  let isOwner = false;

  async function load() {
    const uid = await Auth.getUserId();
    if (!uid) return false;
    const { data, error } = await Supa.client
      .from("app_members")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return false;
    isOwner = data?.role === "owner";
    return isOwner;
  }

  function owner() {
    return isOwner;
  }

  return { load, owner };
})();
