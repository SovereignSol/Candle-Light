window.RewardsRealtime = (() => {
  const Allowance = window.RewardsAllowance;
  const StickerStore = window.RewardsStickerStore;
  const Stickerbook = window.RewardsStickerbook;

  function subscribeOtherRealtime() {
    const ch1 = Supa.client.channel("rt-ledger");
    ch1.on("postgres_changes", { event: "*", schema: "public", table: "allowance_ledger" }, async () => {
      await Allowance.loadMyBalance();
      await Allowance.loadBalances();
      await Allowance.loadLedger();
      await Stickerbook.loadStickerAwards();
    });
    ch1.subscribe();

    const ch2 = Supa.client.channel("rt-stickers");
    ch2.on("postgres_changes", { event: "*", schema: "public", table: "stickers" }, async () => {
      await StickerStore.refresh();
      await Allowance.loadStickersSelect();
      await Stickerbook.loadStickerOptions();
      await Stickerbook.loadStickerAwards();
    });
    ch2.subscribe();
  }

  return { subscribeOtherRealtime };
})();
