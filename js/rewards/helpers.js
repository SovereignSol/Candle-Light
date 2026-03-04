window.RewardsHelpers = (() => {
  function toNumberRequired(v) {
    const s = (v || "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function toIntRequired(v) {
    const s = (v || "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isInteger(n) ? n : null;
  }

  function fmtMoney(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "$0.00";
    return "$" + num.toFixed(2);
  }

  function daysSince(ts) {
    if (!ts) return 0;
    const t = new Date(ts).getTime();
    if (!Number.isFinite(t)) return 0;
    const diff = Date.now() - t;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  return { toNumberRequired, toIntRequired, fmtMoney, daysSince };
})();
