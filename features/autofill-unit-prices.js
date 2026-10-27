(() => {
  const notify = (message) => window.MGX.showToast(message);

  const runAutofillUnitPrices = () => {
    const setVal = (el, v) => {
      const ds = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      if (ds && ds.set) ds.set.call(el, v); else el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const TABLE = [...document.querySelectorAll("table")].find(t =>
      t.querySelector("tbody tr .select2-container") && t.querySelector("tbody tr textarea")
    );
    if (!TABLE) {
      notify("Line-items table not found");
      throw new Error("Line-items table not found");
    }
    const TBODY = TABLE.querySelector("tbody");

    const headers = (() => {
      const hr = TABLE.querySelector("thead tr");
      if (!hr) return {};
      const out = {};
      [...hr.children].forEach((th, i) => {
        const t = (th.textContent || "").trim().toLowerCase();
        if (!t) return;
        if (/unit\s*price|rate|price/.test(t) && out.unitPrice == null) out.unitPrice = i;
        if (/amount|total|line\s*total|subtotal/.test(t) && out.amount == null) out.amount = i;
        if (/\bqty\b|quantity|^qty$/i.test(t) && out.qty == null) out.qty = i;
        if (/description|desc|details|narration/.test(t) && out.description == null) out.description = i;
      });
      return out;
    })();

    const descTextarea = row => row.querySelector("textarea");

    const rowInputs = (row) => {
      const out = [];
      [...row.children].forEach((td, i) => {
        for (const inp of td.querySelectorAll('input[type="text"], input:not([type])')){
          if (inp.offsetParent === null) continue;
          if (inp.readOnly || inp.disabled) continue;
          out.push({ input: inp, colIndex: i });
        }
      });
      return out;
    };

    const findAmountInputs = (row) => {
      const inputs = rowInputs(row);
      if (!inputs.length) return { qty: null, unitPrice: null, amount: null };

      if (headers.unitPrice != null){
        const byCol = (col) => inputs.find(x => x.colIndex === col)?.input || null;
        return {
          qty: headers.qty != null ? byCol(headers.qty) : null,
          unitPrice: byCol(headers.unitPrice),
          amount: headers.amount != null ? byCol(headers.amount) : null,
        };
      }

      const last3 = inputs.slice(-3).map(x => x.input);
      return {
        qty: last3.length === 3 ? last3[0] : null,
        unitPrice: last3.length >= 2 ? last3[last3.length - 2] : last3[0] || null,
        amount: last3.length >= 1 ? last3[last3.length - 1] : null,
      };
    };

    const looksLikeDateRow = (row) => {
      const ta = descTextarea(row);
      return !!ta && (ta.value || "").includes("📆/☀");
    };

    const NUMBER_RE = /(?<![\w\u0600-\u06FF])(-?\d{1,3}(?:[,.]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?)(?![\w\u0600-\u06FF])/g;

    const extractNumbers = (text) => {
      if (!text) return [];
      const out = [];
      let m;
      NUMBER_RE.lastIndex = 0;
      while ((m = NUMBER_RE.exec(text)) !== null){
        let raw = m[1];
        if (raw.includes(",") && raw.includes(".")){
          if (raw.lastIndexOf(",") > raw.lastIndexOf(".")){
            raw = raw.replace(/\./g, "").replace(",", ".");
          } else {
            raw = raw.replace(/,/g, "");
          }
        } else if (raw.includes(",")){
          raw = /^-?\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, "") : raw.replace(",", ".");
        }
        const n = parseFloat(raw);
        if (!isNaN(n)) out.push(n);
      }
      return out;
    };

    const rows = [...TBODY.querySelectorAll("tr")];
    let filled = 0;

    for (const row of rows){
      const ta = descTextarea(row);
      if (!ta) continue;

      if (looksLikeDateRow(row)) continue;

      const { qty, unitPrice, amount } = findAmountInputs(row);
      if (!unitPrice) continue;

      const qtyVal = (qty?.value || "").trim();
      const unitPriceVal = (unitPrice.value || "").trim();
      const amountVal = (amount?.value || "").trim();

      if (qtyVal !== "" || unitPriceVal !== "" || amountVal !== "") continue;

      const nums = extractNumbers(ta.value || "");
      if (!nums.length) continue;

      const text = nums.join("+");
      setVal(unitPrice, text);
      filled++;
    }

    notify(`Autofilled ${filled} unit price(s) from descriptions.`);
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || {}).autofillUnitPrices = {
    name: 'Autofill Unit Price From Descriptions',
    desc: 'Automatically extracts numerical values from table description text boxes and populates corresponding unit price fields.',
    featureScope: 'button',
    actionLabel: 'Autofill Prices',
    action() {
      runAutofillUnitPrices();
    },
  };
})();
