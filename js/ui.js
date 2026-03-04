window.UI = (() => {
  let toastRoot = null;
  let modalRoot = null;

  function ensureToastRoot() {
    if (toastRoot) return toastRoot;
    toastRoot = document.createElement("div");
    toastRoot.style.position = "fixed";
    toastRoot.style.right = "16px";
    toastRoot.style.bottom = "16px";
    toastRoot.style.display = "grid";
    toastRoot.style.gap = "8px";
    toastRoot.style.zIndex = "9999";
    document.body.appendChild(toastRoot);
    return toastRoot;
  }

  function ensureModalRoot() {
    if (modalRoot) return modalRoot;
    modalRoot = document.createElement("div");
    modalRoot.style.position = "fixed";
    modalRoot.style.inset = "0";
    modalRoot.style.display = "none";
    modalRoot.style.zIndex = "10000";
    document.body.appendChild(modalRoot);
    return modalRoot;
  }

  function makeButton(label, primary) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn" + (primary ? " btn-primary" : " btn-ghost");
    btn.textContent = label;
    return btn;
  }

  function toast(msg, ms = 2800) {
    const root = ensureToastRoot();
    const item = document.createElement("div");
    item.textContent = String(msg || "");
    item.style.maxWidth = "320px";
    item.style.padding = "10px 12px";
    item.style.borderRadius = "10px";
    item.style.border = "1px solid rgba(255,255,255,0.12)";
    item.style.background = "rgba(16,24,38,0.96)";
    item.style.color = "#e8eef7";
    item.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    item.style.fontSize = "14px";
    root.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, ms);
  }

  function showDialog({ title, message, withInput = false, inputValue = "", inputPlaceholder = "", inputType = "text" }) {
    const root = ensureModalRoot();
    root.innerHTML = "";
    root.style.display = "block";

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.55)";

    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.inset = "0";
    wrap.style.display = "grid";
    wrap.style.placeItems = "center";
    wrap.style.padding = "16px";

    const card = document.createElement("div");
    card.className = "card";
    card.style.width = "min(460px, 100%)";
    card.style.margin = "0";

    const h = document.createElement("h3");
    h.textContent = title || "Confirm";
    h.style.marginTop = "0";

    const p = document.createElement("div");
    p.className = "muted";
    p.textContent = message || "";

    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "flex-end";

    let input = null;
    if (withInput) {
      input = document.createElement("input");
      input.className = "input";
      input.type = inputType || "text";
      input.value = inputValue || "";
      input.placeholder = inputPlaceholder || "";
      input.style.marginTop = "12px";
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(input);
    } else {
      card.appendChild(h);
      card.appendChild(p);
    }

    const btnCancel = makeButton("Cancel", false);
    const btnOk = makeButton("OK", true);

    row.appendChild(btnCancel);
    row.appendChild(btnOk);
    card.appendChild(row);

    wrap.appendChild(card);
    root.appendChild(overlay);
    root.appendChild(wrap);

    if (input) setTimeout(() => input.focus(), 0);
    else setTimeout(() => btnOk.focus(), 0);

    function close() {
      root.style.display = "none";
      root.innerHTML = "";
    }

    return { btnCancel, btnOk, close, input, overlay };
  }

  function confirm(message, title = "Confirm") {
    return new Promise((resolve) => {
      const d = showDialog({ title, message });
      d.btnCancel.addEventListener("click", () => {
        d.close();
        resolve(false);
      });
      d.btnOk.addEventListener("click", () => {
        d.close();
        resolve(true);
      });
      d.overlay.addEventListener("click", () => {
        d.close();
        resolve(false);
      });
    });
  }

  function prompt(message, value = "", title = "Input", placeholder = "", inputType = "text") {
    return new Promise((resolve) => {
      const d = showDialog({
        title,
        message,
        withInput: true,
        inputValue: value,
        inputPlaceholder: placeholder,
        inputType
      });

      function submit() {
        const v = d.input ? d.input.value : "";
        d.close();
        resolve(v);
      }

      d.btnCancel.addEventListener("click", () => {
        d.close();
        resolve(null);
      });
      d.btnOk.addEventListener("click", submit);
      d.overlay.addEventListener("click", () => {
        d.close();
        resolve(null);
      });
      d.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          d.close();
          resolve(null);
        }
      });
    });
  }

  return { toast, confirm, prompt };
})();
