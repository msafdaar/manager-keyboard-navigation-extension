(() => {
  const runCustomDateRowsGenerator = async () => {
    const resolveAccount = () => {
      try {
        if (typeof window.date_heading === "string" && window.date_heading.trim())
          return { value: window.date_heading.trim(), from: "window.date_heading" };
        if (typeof date_heading === "string" && date_heading.trim())
          return { value: date_heading.trim(), from: "date_heading (local)" };
      } catch(_) {}

      const elById = document.getElementById("date_heading")
        || document.querySelector('[name="date_heading"]')
        || document.querySelector('.date_heading, [data-field="date_heading"]');
      if (elById){
        const v = (elById.value || elById.textContent || "").trim();
        if (v) return { value: v, from: "DOM element (id/name/class=date_heading)" };
      }

      const containing = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,span,div,label,th,td")]
        .find(n => n.children.length === 0 && /date_heading/i.test(n.textContent || ""));
      if (containing) return { value: containing.textContent.trim(), from: "text node containing 'date_heading'" };

      return { value: "", from: "not found" };
    };

    const askDates = (prefill) => new Promise((resolve) => {
      const today = new Date().toISOString().slice(0,10);
      const ov = document.createElement("div");
      ov.className = "mgx-modal-overlay";
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;";
      const box = document.createElement("div");
      box.style.cssText = "background:#fff;border-radius:10px;padding:20px 24px;width:360px;box-shadow:0 12px 40px rgba(0,0,0,.3);font-size:14px;color:#222;";
      box.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:14px;">Fill table with dates</div>
        <label style="display:block;margin-bottom:10px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">Start date</span>
          <input id="__af_start" type="date" value="${today}"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <label style="display:block;margin-bottom:10px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">End date <span style="color:#999;">(empty = today)</span></span>
          <input id="__af_end" type="date" value="${today}"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <label style="display:block;margin-bottom:16px;">
          <span style="display:block;margin-bottom:4px;font-size:12px;color:#666;">
            Account <span style="color:#999;">(resolved: ${prefill.from})</span>
          </span>
          <input id="__af_acct" type="text" value="${prefill.value.replace(/"/g,"&quot;")}"
            placeholder="account name"
            style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </label>
        <div id="__af_err" style="color:#c00;font-size:12px;min-height:16px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="__af_cancel" type="button" style="padding:8px 14px;border:1px solid #ccc;background:#f5f5f5;border-radius:6px;cursor:pointer;">Cancel</button>
          <button id="__af_ok" type="button" style="padding:8px 14px;border:0;background:#2563eb;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Fill</button>
        </div>
      `;
      ov.appendChild(box);
      document.body.appendChild(ov);

      const startEl = box.querySelector("#__af_start");
      const endEl   = box.querySelector("#__af_end");
      const acctEl  = box.querySelector("#__af_acct");
      const errEl   = box.querySelector("#__af_err");

      const close = (val) => { ov.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
      const onKey = (e) => {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter") submit();
      };
      document.addEventListener("keydown", onKey);

      const submit = () => {
        const s = startEl.value;
        const e = endEl.value || today;
        const acct = acctEl.value.trim();
        if (!s){ errEl.textContent = "Start date is required."; return; }
        if (!acct){ errEl.textContent = "Account is required (date_heading not resolved)."; return; }
        const sd = new Date(s + "T00:00:00");
        const ed = new Date(e + "T00:00:00");
        if (isNaN(sd) || isNaN(ed)){ errEl.textContent = "Invalid date."; return; }
        if (sd > ed){ errEl.textContent = "Start must be on or before end."; return; }
        close({ start: s, end: e, account: acct });
      };

      box.querySelector("#__af_ok").onclick = submit;
      box.querySelector("#__af_cancel").onclick = () => close(null);
      startEl.focus();
      startEl.select();
    });

    const URDU = {0:"اتوار",1:"پیر",2:"منگل",3:"بدھ",4:"جمعرات",5:"جمعہ",6:"ہفتہ"};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fmt = d => `📆/☀\n\n${String(d.getDate()).padStart(2,"0")} ${d.toLocaleString("en-US",{month:"short"})}, ${URDU[d.getDay()]}`;
    const pd  = s => { const d = new Date(s+"T00:00:00"); if (isNaN(d)) throw new Error("Bad date: "+s); return d; };
    const range = (a,b) => { const s=pd(a), e=b?pd(b):new Date(); e.setHours(0,0,0,0); const o=[]; for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)) o.push(new Date(d)); return o; };
    const setVal = (el,v) => { const ds=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value"); if(ds&&ds.set)ds.set.call(el,v);else el.value=v; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); };
    const fireMouse = (el,type) => el.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window}));

    try {
      const resolved = resolveAccount();
      const answer = await askDates(resolved);
      if (!answer) return;

      const ACCOUNT = answer.account;
      const TABLE = [...document.querySelectorAll("table")].find(t =>
        t.querySelector("tbody tr .select2-container") && t.querySelector("tbody tr textarea")
      );
      if (!TABLE) throw new Error("Line-items table not found");
      const TBODY = TABLE.querySelector("tbody");
      const allRows = () => [...TBODY.querySelectorAll("tr")];

      const before = new Set(allRows());
      const findAddBtn = () => {
        const byText = [...document.querySelectorAll("button")].find(b => b.textContent.trim().toLowerCase() === "add line");
        if (byText) return byText;
        const scope = TABLE.closest("form") || TABLE.parentElement;
        return [...scope.querySelectorAll("button")].find(b => /add\s*line/i.test(b.textContent));
      };
      const addBtn = findAddBtn();
      if (!addBtn) throw new Error('No "Add line" button found');

      const dates = range(answer.start, answer.end);
      const rowsNeeded = dates.length * 2;

      for (let i = 0; i < rowsNeeded; i++){
        const countBefore = allRows().length;
        addBtn.click();
        let ok = false;
        for (let t = 0; t < 25; t++){ 
          await wait(20); 
          if (allRows().length > countBefore){ ok = true; break; } 
        }
        if (!ok) throw new Error(`Add-line click #${i+1} did not create a row`);
      }

      const newRows = allRows().filter(r => !before.has(r));
      if (newRows.length < rowsNeeded) throw new Error(`Only ${newRows.length}/${rowsNeeded} new rows`);
      const targets = newRows.slice(-rowsNeeded);

      const closeAllDrops = () => {
        document.querySelectorAll(".select2-drop").forEach(d => {
          d.classList.remove("select2-drop-active");
          d.classList.add("select2-display-none");
          d.style.display = "none";
        });
        document.querySelectorAll(".select2-container-active").forEach(c => c.classList.remove("select2-container-active"));
      };
      const activeDrop = () => document.querySelector(".select2-drop.select2-drop-active");

      const openFor = async (row) => {
        const c = row.querySelector(".select2-container"); if(!c) throw new Error("No select2");
        closeAllDrops(); await wait(15);
        const tryOpen = async (how) => {
          await how();
          for (let i = 0; i < 8; i++){ 
            await wait(25); 
            const d = activeDrop(); 
            if (d) return d; 
          }
          return null;
        };
        const choice = c.querySelector("a.select2-choice");
        const focusser = c.querySelector(".select2-focusser");
        if (choice){
          const d = await tryOpen(() => { fireMouse(choice,"mousedown"); fireMouse(choice,"mouseup"); fireMouse(choice,"click"); });
          if (d) return d;
        }
        if (focusser){
          const d = await tryOpen(() => {
            focusser.focus();
            focusser.dispatchEvent(new KeyboardEvent("keydown",{key:" ",keyCode:32,which:32,bubbles:true}));
            focusser.dispatchEvent(new KeyboardEvent("keyup",  {key:" ",keyCode:32,which:32,bubbles:true}));
          });
          if (d) return d;
        }
        const $ = window.jQuery || window.$;
        if ($ && focusser){
          try {
            const $f = $(focusser);
            if ($f.data("select2")){
              const d = await tryOpen(() => { $f.select2("open"); });
              if (d) return d;
            }
          } catch(_){}
        }
        throw new Error(`Could not open drop (container id=${c.id})`);
      };

      const pick = async (row, q) => {
        const drop = await openFor(row);
        const inp = drop.querySelector(".select2-input"); if(!inp) throw new Error("No search input");
        inp.focus();
        
        setVal(inp, q);
        inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));

        let items = [];
        for (let t = 0; t < 30; t++) {
          await wait(50);
          items = [...drop.querySelectorAll("li.select2-result-selectable, li")].filter(l => 
            l.textContent.trim() && 
            !l.classList.contains('select2-no-results') && 
            !l.classList.contains('select2-searching')
          );
          if (items.length > 0) break;
        }

        if (!items.length) throw new Error(`No results for "${q}"`);

        const ql = q.toLowerCase();
        const m = items.find(l => l.textContent.trim().toLowerCase().includes(ql)) || items[0];
        
        fireMouse(m, "mouseover"); 
        fireMouse(m, "mouseup"); 
        m.click();
        await wait(100);
        return m.textContent.trim();
      };

      for (let i = 0; i < dates.length; i++){
        const d = dates[i];
        const dataRow = targets[i * 2];       
        dataRow.scrollIntoView({block:"center"});
        try {
          const chosen = await pick(dataRow, ACCOUNT);
          setVal(dataRow.querySelector("textarea"), fmt(d));
        } catch(e){
          console.error(`[autofill] ✗ date ${i+1} ${d.toDateString()}:`, e.message);
          break;
        }
        await wait(50);
      }
    } catch(err) {
      console.error("[autofill] FATAL:", err.message);
    }
  };

  (window.MGX_FEATURES = window.MGX_FEATURES || []).push({
    id: 'dateRowsGenerator',
    name: 'Custom Date Rows Generator',
    desc: 'Automatically populates table rows with custom date ranges and account entries for Manager.io accounting tables.',
    featureScope: 'button',
    actionLabel: 'Generate Date Rows',
    action() {
      runCustomDateRowsGenerator();
    },
  });
})();
