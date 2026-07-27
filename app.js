/* ==========================================================
 * IUmeal — UI / 상태 / 기록 로직
 * (2D 도트 게임 엔진은 game.js 의 Game 모듈)
 * 모든 데이터(사진 포함)는 브라우저 localStorage에만 저장됩니다.
 * ========================================================== */

/* ---------- 상태 ---------- */
const STORAGE_KEY = "iumeal_v1";

const state = {
  profile: { name: "", months: 6, allergies: [] },
  scene: "market",          // market | kitchen
  cart: [],                 // ingredient id 배열 (중복 = 수량)
  inventory: {},            // { id: count }
  records: [],              // 요리 기록
  started: false,
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: state.profile, scene: state.scene, cart: state.cart,
      inventory: state.inventory, records: state.records, started: state.started,
    }));
  } catch (e) {
    toast("⚠️ 저장 공간이 가득 찼어요. 일지에서 오래된 기록을 삭제해 주세요.");
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.profile) state.profile = { name: "", months: 6, allergies: [], ...s.profile };
    if (s.scene === "market" || s.scene === "kitchen") state.scene = s.scene;
    if (Array.isArray(s.cart)) state.cart = s.cart;
    if (s.inventory && typeof s.inventory === "object") state.inventory = s.inventory;
    if (Array.isArray(s.records)) state.records = s.records;
    state.started = !!s.started;
  } catch (e) { /* 손상된 데이터는 무시하고 새로 시작 */ }
}

/* ---------- DOM/유틸 ---------- */
const $ = (sel) => document.querySelector(sel);

function toast(msg, ms = 2400) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), ms);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------- 노출 카운터 ---------- */
const EXPOSURE_GOAL = 8;

function exposureCounts() {
  const counts = {};
  for (const r of state.records) {
    for (const id of r.ingredients || []) counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/* ---------- 모달 ---------- */
function openModal(title, html) {
  $("#modal-title").innerHTML = title;
  $("#modal-body").innerHTML = html;
  $("#modal-overlay").classList.remove("hidden");
  $("#modal-body").scrollTop = 0;
  return $("#modal-body");
}
function closeModal() {
  $("#modal-overlay").classList.add("hidden");
}
$("#modal-close").addEventListener("click", closeModal);
$("#modal-overlay").addEventListener("click", (e) => {
  if (e.target === $("#modal-overlay")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal-overlay").classList.contains("hidden")) closeModal();
});

/* ---------- 식자재 태그 ---------- */
function ingTags(ing) {
  const counts = exposureCounts();
  let tags = `<span class="tag month">${ing.minM}개월+</span>`;
  if (ing.iron) tags += `<span class="tag iron">철분</span>`;
  if (ing.allergen) {
    const mine = state.profile.allergies.includes(ing.allergen);
    tags += `<span class="tag allergen">${mine ? "⚠️ " : ""}알레르겐: ${ALLERGENS[ing.allergen]}</span>`;
  }
  if (ing.caution) tags += `<span class="tag caution">주의</span>`;
  const exp = counts[ing.id] || 0;
  if (exp > 0) tags += `<span class="tag exposure">노출 ${exp}회</span>`;
  return tags;
}

/* ---------- 마트: 코너 상점 ---------- */
function openShop(sectionId) {
  const sec = SECTIONS[sectionId];
  const items = INGREDIENTS.filter((i) => i.section === sectionId);
  const months = state.profile.months;

  let html = `<div class="ing-grid">`;
  for (const ing of items) {
    const early = ing.minM > months;
    const myAllergy = ing.allergen && state.profile.allergies.includes(ing.allergen);
    html += `
      <div class="ing-card">
        <div class="head"><span class="em">${ing.emoji}</span>${esc(ing.name)}</div>
        <div class="tagrow">${ingTags(ing)}</div>
        <div class="ing-note">${esc(ing.note || "")}</div>
        ${ing.caution ? `<div class="warn-inline">⚠️ ${esc(ing.caution)}</div>` : ""}
        ${early ? `<div class="warn-inline">⏳ 권장 시작 월령(${ing.minM}개월)보다 아직 일러요</div>` : ""}
        ${myAllergy ? `<div class="warn-inline">🚨 ${esc(state.profile.name || "아기")}의 알레르기 이력 재료예요!</div>` : ""}
        <button class="btn-add" data-add="${ing.id}">🛒 담기</button>
      </div>`;
  }
  html += `</div>`;

  const body = openModal(`${sec.emoji} ${sec.name}`, html);
  body.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ing = ING[btn.dataset.add];
      state.cart.push(ing.id);
      updateCartBadge();
      saveState();
      toast(`${ing.emoji} ${ing.name}을(를) 장바구니에 담았어요! (총 ${state.cart.length}개)`);
    });
  });
}

function updateCartBadge() {
  const b = $("#cart-badge");
  if (state.cart.length > 0) {
    b.textContent = state.cart.length;
    b.classList.remove("hidden");
  } else {
    b.classList.add("hidden");
  }
}

/* ---------- 장바구니 ---------- */
function openCart() {
  if (state.cart.length === 0) {
    openModal("🛒 장바구니", `<p>장바구니가 비어 있어요.<br>마트 코너 앞에서 <b>SPACE / A</b>를 눌러 식자재를 담아 보세요!</p>`);
    return;
  }
  const grouped = {};
  for (const id of state.cart) grouped[id] = (grouped[id] || 0) + 1;

  let html = `<p style="margin-bottom:10px">담은 식자재를 가지고 아래쪽 <b>🚪 문</b>으로 걸어가면 주방 냉장고에 자동으로 정리돼요.</p><div class="ing-grid">`;
  for (const [id, n] of Object.entries(grouped)) {
    const ing = ING[id];
    html += `
      <div class="ing-card">
        <div class="head"><span class="em">${ing.emoji}</span>${esc(ing.name)} × ${n}</div>
        <button class="btn-small" data-remove="${id}">1개 빼기</button>
      </div>`;
  }
  html += `</div>`;
  const body = openModal("🛒 장바구니", html);
  body.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = state.cart.indexOf(btn.dataset.remove);
      if (idx >= 0) state.cart.splice(idx, 1);
      updateCartBadge();
      saveState();
      openCart();
    });
  });
}

/* ---------- 냉장고 (인벤토리) ---------- */
function openFridge() {
  const entries = Object.entries(state.inventory).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    openModal("🧊 냉장고", `<p>냉장고가 비어 있어요.<br>아래쪽 <b>🚪 문</b>으로 나가 마트에서 장을 봐 오세요!</p>`);
    return;
  }
  let html = `<p style="margin-bottom:10px">보유 식자재예요. 조리대에서 <b>레시피북</b>을 펼치면 이 재료로 만들 수 있는 각국 이유식을 알려드려요.</p><div class="ing-grid">`;
  for (const [id, n] of entries) {
    const ing = ING[id];
    html += `
      <div class="ing-card">
        <div class="head"><span class="em">${ing.emoji}</span>${esc(ing.name)} × ${n}</div>
        <div class="tagrow">${ingTags(ing)}</div>
      </div>`;
  }
  html += `</div>`;
  openModal("🧊 냉장고 (보유 식자재)", html);
}

/* ---------- 레시피북 ---------- */
let recipeFilter = "all";

function recipeStatus(r) {
  const missing = r.req.filter((id) => !(state.inventory[id] > 0));
  const craftable = missing.length === 0;
  const early = r.months > state.profile.months;
  const allergens = [...new Set(r.req.concat(r.opt).map((id) => ING[id].allergen).filter(Boolean))];
  const myAllergens = allergens.filter((a) => state.profile.allergies.includes(a));
  return { missing, craftable, early, allergens, myAllergens };
}

function openRecipeBook() {
  const inv = Object.values(state.inventory).some((n) => n > 0);
  let html = `<div class="recipe-filters" id="rb-filters">
    <button data-f="all" class="${recipeFilter === "all" ? "active" : ""}">전체</button>
    <button data-f="craftable" class="${recipeFilter === "craftable" ? "active" : ""}">✅ 지금 가능</button>`;
  for (const [k, c] of Object.entries(COUNTRIES)) {
    html += `<button data-f="${k}" class="${recipeFilter === k ? "active" : ""}">${c.flag} ${c.name}</button>`;
  }
  html += `</div>`;

  if (!inv) {
    html += `<div class="coach-box">🧺 냉장고가 비어 있어요. 재료가 없어도 레시피는 볼 수 있지만, 요리하려면 마트에서 장을 봐 오세요!</div>`;
  }

  let list = RECIPES.slice().map((r) => ({ r, st: recipeStatus(r) }));
  if (recipeFilter === "craftable") list = list.filter((x) => x.st.craftable);
  else if (recipeFilter !== "all") list = list.filter((x) => x.r.country === recipeFilter);
  list.sort((a, b) => (b.st.craftable ? 1 : 0) - (a.st.craftable ? 1 : 0));

  if (list.length === 0) {
    html += `<p>조건에 맞는 레시피가 없어요. 재료를 더 사 오거나 다른 필터를 눌러 보세요!</p>`;
  }

  for (const { r, st } of list) {
    const c = COUNTRIES[r.country];
    const ingLine = r.req.map((id) => {
      const have = state.inventory[id] > 0;
      return `<span class="rc-ing ${have ? "have" : "miss"}">${ING[id].emoji} ${esc(ING[id].name)}${have ? " ✓" : " (없음)"}</span>`;
    }).join("") + r.opt.map((id) =>
      `<span class="rc-ing">${ING[id].emoji} ${esc(ING[id].name)} (선택)</span>`).join("");

    html += `
      <div class="recipe-card ${st.craftable ? "craftable" : ""}" data-rid="${r.id}">
        <div class="rc-head" data-toggle="${r.id}">
          <span class="flag">${c.flag}</span>
          <span class="name">${esc(c.name)} · ${esc(r.name)}</span>
          <span class="tag month">${r.months}개월+</span>
          <span class="rc-status ${st.craftable ? "ok" : "no"}">${st.craftable ? "만들 수 있어요" : `재료 ${st.missing.length}개 부족`}</span>
        </div>
        <div class="rc-body hidden" id="rb-${r.id}">
          <p class="philosophy">“${esc(c.philosophy)}”</p>
          <h4>🧺 재료</h4>
          <div class="rc-ingline">${ingLine}</div>
          ${st.early ? `<div class="warn-inline">⏳ 이 레시피는 ${r.months}개월부터 권장 — ${esc(state.profile.name || "아기")}는 지금 ${state.profile.months}개월이에요.</div>` : ""}
          ${st.myAllergens.length ? `<div class="warn-inline">🚨 알레르기 이력 재료 포함: ${st.myAllergens.map((a) => ALLERGENS[a]).join(", ")} — 소아과와 상의 후 진행하세요.</div>` : ""}
          <h4>👩‍🍳 조리 방법</h4>
          <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
          <h4>👍 이 방식의 장점</h4>
          <ul>${r.pros.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          <h4>👎 이 방식의 단점·주의</h4>
          <ul>${r.cons.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          <div class="tipbox">💡 ${esc(r.tip)}</div>
          <button class="btn-cook" data-cook="${r.id}" ${st.craftable ? "" : "disabled"}>
            ${st.craftable ? "🍳 이 레시피로 요리하기" : `재료가 부족해요: ${st.missing.map((id) => ING[id].name).join(", ")}`}
          </button>
        </div>
      </div>`;
  }

  const body = openModal("📖 세계 이유식 레시피북", html);

  body.querySelectorAll("#rb-filters button").forEach((b) => {
    b.addEventListener("click", () => { recipeFilter = b.dataset.f; openRecipeBook(); });
  });
  body.querySelectorAll("[data-toggle]").forEach((h) => {
    h.addEventListener("click", () => {
      $(`#rb-${h.dataset.toggle}`).classList.toggle("hidden");
    });
  });
  body.querySelectorAll("[data-cook]").forEach((b) => {
    b.addEventListener("click", () => startCooking(b.dataset.cook));
  });
}

/* ---------- 요리 & 기록 ---------- */
let draft = null; // { recipeId, dishPhoto, babyPhoto }

function startCooking(recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId);
  const st = recipeStatus(r);
  if (!st.craftable) { toast("재료가 부족해요!"); return; }

  for (const id of r.req) state.inventory[id] -= 1;
  saveState();

  draft = { recipeId, dishPhoto: null, babyPhoto: null };
  const c = COUNTRIES[r.country];
  const usedOpt = r.opt.filter((id) => state.inventory[id] > 0);

  const html = `
    <div class="coach-box">🎉 <b>${c.flag} ${esc(r.name)}</b> 완성! 필수 재료 ${r.req.length}개를 사용했어요.
    ${usedOpt.length ? `<br>냉장고에 있는 선택 재료(${usedOpt.map((id) => ING[id].name).join(", ")})도 함께 활용해 보세요.` : ""}</div>

    <h4 style="margin:12px 0 4px">📸 1. 완성된 요리 사진</h4>
    <div class="photo-slot" id="slot-dish">
      <button class="ps-btn" data-photo="dish">📷 요리 사진 촬영 / 선택</button>
    </div>

    <h4 style="margin:12px 0 4px">👶 2. 아이가 먹는 모습 (선택)</h4>
    <div class="photo-slot" id="slot-baby">
      <button class="ps-btn" data-photo="baby">📷 아기 사진 촬영 / 선택</button>
    </div>
    <p style="font-size:0.76rem;color:var(--sub)">사진은 이 기기 브라우저에만 저장되며, 어디에도 업로드되지 않아요.</p>

    <h4 style="margin:12px 0 4px">😋 3. ${esc(state.profile.name || "아기")}의 반응</h4>
    <div class="reaction-row">
      ${REACTIONS.map((x) => `
        <label><input type="radio" name="reaction" value="${x.id}">${x.emoji} ${x.label}</label>`).join("")}
    </div>
    <div class="coach-box hidden" id="refuse-coach">
      🌱 거부는 실패가 아니라 <b>정상 반응(neophobia)</b>이에요! 새 음식 수용에는 평균 <b>8~15회 노출</b>이 필요합니다.
      압박하지 말고 다음에 다시 담담하게 제시해 보세요.
    </div>

    <h4 style="margin:12px 0 4px">✍️ 4. 오늘의 경험 메모</h4>
    <textarea class="memo" id="rec-memo" placeholder="예: 처음엔 얼굴을 찡그렸는데 세 숟갈은 먹었다! 다음엔 조금 더 되직하게."></textarea>

    <button class="btn-cook" id="btn-save-record" style="margin-top:14px">💾 기록 저장하기</button>
  `;
  const body = openModal(`🍳 요리 완성 — 기록 남기기`, html);

  body.querySelectorAll("[data-photo]").forEach((btn) => {
    btn.addEventListener("click", () => pickPhoto(btn.dataset.photo));
  });
  body.querySelectorAll('input[name="reaction"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      $("#refuse-coach").classList.toggle("hidden", radio.value !== "refuse" || !radio.checked);
    });
  });
  $("#btn-save-record").addEventListener("click", saveRecord);
}

function pickPhoto(kind) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 640, 0.72);
      draft[kind === "dish" ? "dishPhoto" : "babyPhoto"] = dataUrl;
      const slot = $(kind === "dish" ? "#slot-dish" : "#slot-baby");
      slot.innerHTML = `<img src="${dataUrl}" alt=""><br>
        <button class="ps-btn" style="margin-top:8px" data-photo="${kind}">📷 다시 촬영</button>`;
      slot.querySelector("[data-photo]").addEventListener("click", () => pickPhoto(kind));
    } catch (e) {
      toast("사진을 불러오지 못했어요. 다시 시도해 주세요.");
    }
  });
  input.click();
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveRecord() {
  const r = RECIPES.find((x) => x.id === draft.recipeId);
  const reactionEl = document.querySelector('input[name="reaction"]:checked');
  if (!reactionEl) { toast("아기의 반응을 선택해 주세요!"); return; }

  const record = {
    id: "rec_" + Date.now(),
    date: new Date().toISOString(),
    recipeId: r.id,
    ingredients: r.req.slice(),
    reaction: reactionEl.value,
    memo: $("#rec-memo").value.trim(),
    dishPhoto: draft.dishPhoto,
    babyPhoto: draft.babyPhoto,
  };
  state.records.unshift(record);
  saveState();
  draft = null;

  const counts = exposureCounts();
  const feedback = r.req.map((id) => {
    const n = counts[id] || 0;
    const ing = ING[id];
    return n >= EXPOSURE_GOAL
      ? `${ing.emoji} ${ing.name} ${n}회 노출 — 목표 달성! 🏅`
      : `${ing.emoji} ${ing.name} ${n}회째 노출 (목표 ${EXPOSURE_GOAL}회)`;
  }).join("<br>");

  const html = `
    <div class="coach-box">✅ 기록이 저장됐어요!<br><br><b>반복 노출 트래커</b><br>${feedback}</div>
    <button class="btn-cook" id="btn-share-now">📤 이 경험 공유하기</button>
    <button class="btn-cook" id="btn-to-journal" style="background:var(--blue);margin-top:8px">📔 일지 보러 가기</button>
  `;
  openModal("💾 저장 완료", html);
  $("#btn-share-now").addEventListener("click", () => shareRecord(record.id));
  $("#btn-to-journal").addEventListener("click", openJournal);
}

/* ---------- 공유 ---------- */
function buildShareText(rec) {
  const r = RECIPES.find((x) => x.id === rec.recipeId);
  const c = COUNTRIES[r.country];
  const reaction = REACTIONS.find((x) => x.id === rec.reaction);
  const counts = exposureCounts();
  const expLine = rec.ingredients
    .map((id) => `${ING[id].name} ${counts[id] || 0}회차`)
    .join(", ");
  return [
    `🍼 IUmeal 이유식 기록`,
    `📅 ${fmtDate(rec.date)}`,
    `🍳 ${c.flag} ${c.name}식 · ${r.name}`,
    `👶 ${state.profile.name || "아기"} (${state.profile.months}개월) 반응: ${reaction ? reaction.emoji + " " + reaction.label : "-"}`,
    `🔁 반복 노출: ${expLine}`,
    rec.memo ? `📝 ${rec.memo}` : null,
    ``,
    `#이유식 #IUmeal #세계이유식탐험`,
  ].filter((x) => x !== null).join("\n");
}

async function shareRecord(recordId) {
  const rec = state.records.find((x) => x.id === recordId);
  if (!rec) return;
  const text = buildShareText(rec);
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { /* 사용자가 취소 */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("📋 공유 텍스트를 클립보드에 복사했어요!");
  } catch (e) {
    openModal("📤 경험 공유", `<p>아래 내용을 복사해서 공유하세요:</p>
      <textarea class="memo" style="min-height:160px">${esc(text)}</textarea>`);
  }
}

/* ---------- 일지 ---------- */
function openJournal() {
  const counts = exposureCounts();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  let html = "";

  html += `<h4 style="margin-bottom:6px">🔁 반복 노출 트래커 <span style="font-weight:400;color:var(--sub);font-size:0.8rem">(새 음식 수용엔 평균 8~15회 노출이 필요해요)</span></h4>`;
  if (entries.length === 0) {
    html += `<p style="font-size:0.86rem;color:var(--sub)">아직 기록이 없어요. 조리대에서 첫 요리를 해 보세요!</p>`;
  } else {
    html += `<div class="exposure-list">`;
    for (const [id, n] of entries) {
      const pct = Math.min(100, (n / EXPOSURE_GOAL) * 100);
      html += `
        <div class="exp-row ${n >= EXPOSURE_GOAL ? "done" : ""}">
          <span class="exp-name">${ING[id].emoji} ${esc(ING[id].name)}</span>
          <div class="exp-bar"><div style="width:${pct}%"></div></div>
          <span class="exp-count">${n >= EXPOSURE_GOAL ? "🏅 " : ""}${n}/${EXPOSURE_GOAL}회</span>
        </div>`;
    }
    html += `</div>`;
  }

  html += `<h4 style="margin:16px 0 6px">📔 식사 일지 (${state.records.length}건)</h4>`;
  if (state.records.length === 0) {
    html += `<p style="font-size:0.86rem;color:var(--sub)">요리를 완성하면 사진·반응·메모가 여기에 쌓여요.</p>`;
  }

  for (const rec of state.records) {
    const r = RECIPES.find((x) => x.id === rec.recipeId);
    const c = COUNTRIES[r.country];
    const reaction = REACTIONS.find((x) => x.id === rec.reaction);
    html += `
      <div class="record-card">
        <div class="rec-head">
          <b>${c.flag} ${esc(r.name)}</b>
          <span>${reaction ? reaction.emoji + " " + reaction.label : ""}</span>
          <span class="rec-date">${fmtDate(rec.date)}</span>
        </div>
        <div class="rec-photos">
          ${rec.dishPhoto ? `<figure><img src="${rec.dishPhoto}" alt="요리 사진"><figcaption>🍳 요리</figcaption></figure>` : ""}
          ${rec.babyPhoto ? `<figure><img src="${rec.babyPhoto}" alt="아기 사진"><figcaption>👶 먹는 모습</figcaption></figure>` : ""}
        </div>
        ${rec.memo ? `<p style="font-size:0.88rem">📝 ${esc(rec.memo)}</p>` : ""}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn-small" data-share="${rec.id}">📤 공유</button>
          <button class="btn-small" data-del="${rec.id}" style="color:var(--warn)">🗑 삭제</button>
        </div>
      </div>`;
  }

  const body = openModal("📔 식사 일지 & 경험 공유", html);
  body.querySelectorAll("[data-share]").forEach((b) =>
    b.addEventListener("click", () => shareRecord(b.dataset.share)));
  body.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("이 기록(사진 포함)을 삭제할까요?")) return;
      state.records = state.records.filter((x) => x.id !== b.dataset.del);
      saveState();
      openJournal();
    }));
}

/* ---------- 가이드북 ---------- */
function openGuide() {
  let html = `<h4 style="margin-bottom:8px">🌍 국가별 이유식 접근법 한눈에</h4>`;
  for (const c of Object.values(COUNTRIES)) {
    html += `
      <div class="country-block">
        <div class="cb-head">${c.flag} ${esc(c.name)} — <span style="font-weight:400;font-style:italic">${esc(c.philosophy)}</span></div>
        <div class="good">👍 ${esc(c.strengths)}</div>
        <div class="bad">👎 ${esc(c.weaknesses)}</div>
      </div>`;
  }

  html += `<h4 style="margin:16px 0 8px">🔬 국가와 무관하게 근거가 확립된 5가지</h4>`;
  for (const p of GUIDE.principles) {
    html += `<div class="principle"><b>${esc(p.title)}</b> — ${esc(p.body)}</div>`;
  }

  html += `<h4 style="margin:16px 0 8px">🇰🇷 한국 상황에 맞춘 조합안</h4><ol style="padding-left:20px;display:grid;gap:5px;font-size:0.88rem">`;
  for (const s of GUIDE.koreaPlan) html += `<li>${esc(s)}</li>`;
  html += `</ol>`;

  html += `<div class="disclaimer-box" style="margin-top:16px">⚕️ ${esc(GUIDE.disclaimer)}</div>`;

  openModal("📚 이유식 가이드북", html);
}

/* ---------- 프로필 ---------- */
function allergyCheckboxes(selected) {
  return Object.entries(ALLERGENS).map(([k, v]) =>
    `<label><input type="checkbox" value="${k}" ${selected.includes(k) ? "checked" : ""}> ${v}</label>`
  ).join("");
}

function openProfile() {
  const p = state.profile;
  const html = `
    <label class="field" style="display:block;font-weight:700;margin-bottom:4px">아기 이름 (별명)</label>
    <input type="text" id="pf-name" value="${esc(p.name)}" maxlength="12" class="pixel-input">
    <label class="field" style="display:block;font-weight:700;margin:12px 0 4px">아기 월령 (개월)</label>
    <input type="number" id="pf-months" value="${p.months}" min="4" max="36" class="pixel-input">
    <label class="field" style="display:block;font-weight:700;margin:12px 0 6px">알레르기 이력</label>
    <div class="allergy-grid" id="pf-allergy">${allergyCheckboxes(p.allergies)}</div>
    <button class="btn-cook" id="pf-save" style="margin-top:16px">저장</button>
  `;
  openModal("👶 아기 프로필", html);
  $("#pf-save").addEventListener("click", () => {
    p.name = $("#pf-name").value.trim();
    p.months = Math.max(4, Math.min(36, parseInt($("#pf-months").value, 10) || 6));
    p.allergies = [...document.querySelectorAll("#pf-allergy input:checked")].map((c) => c.value);
    saveState();
    Game.setNames({ player: chefName(), baby: p.name || "아기" });
    closeModal();
    toast("프로필을 저장했어요!");
  });
}

function chefName() {
  return state.profile.name ? `${state.profile.name}네 셰프` : "우리집 셰프";
}

/* ---------- 게임 연결 ---------- */
Game.onAction((action) => {
  if (action.startsWith("shop:")) openShop(action.slice(5));
  else if (action === "cart") openCart();
  else if (action === "fridge") openFridge();
  else if (action === "recipes") openRecipeBook();
  else if (action === "journal") openJournal();
  else if (action === "guide") openGuide();
});

Game.onDoor((target) => {
  const from = state.scene;
  state.scene = target;

  if (from === "market" && target === "kitchen") {
    if (state.cart.length > 0) {
      for (const id of state.cart) state.inventory[id] = (state.inventory[id] || 0) + 1;
      const n = state.cart.length;
      state.cart = [];
      updateCartBadge();
      toast(`🏠 주방 도착! 장바구니 식자재 ${n}개를 냉장고에 정리했어요.`);
    } else {
      toast("🏠 주방에 도착했어요. 냉장고·조리대·식탁·책장을 둘러보세요!");
    }
  } else if (target === "market") {
    toast("🛒 마트에 도착했어요. 코너 앞에서 SPACE / A를 눌러 담아 보세요!");
  }

  const name = Game.setScene(target);
  $("#scene-name").textContent = name;
  saveState();
});

/* ---------- 상단 버튼 ---------- */
$("#btn-cart").addEventListener("click", openCart);
$("#btn-journal").addEventListener("click", openJournal);
$("#btn-guide").addEventListener("click", openGuide);
$("#btn-profile").addEventListener("click", openProfile);

/* ---------- 시작 화면 ---------- */
function initStartScreen() {
  $("#allergy-grid").innerHTML = allergyCheckboxes(state.profile.allergies);
  $("#start-disclaimer").textContent = "⚕️ " + GUIDE.disclaimer;
  if (state.profile.name) $("#baby-name").value = state.profile.name;
  $("#baby-months").value = state.profile.months || 6;

  $("#btn-start").addEventListener("click", () => {
    state.profile.name = $("#baby-name").value.trim();
    state.profile.months = Math.max(4, Math.min(36, parseInt($("#baby-months").value, 10) || 6));
    state.profile.allergies = [...document.querySelectorAll("#allergy-grid input:checked")].map((c) => c.value);
    state.started = true;
    saveState();
    startGame();
  });
}

function startGame() {
  $("#start-screen").classList.add("hidden");
  $("#game-screen").classList.remove("hidden");
  const name = Game.start(state.scene, { player: chefName(), baby: state.profile.name || "아기" });
  $("#scene-name").textContent = name;
  updateCartBadge();
  toast(`🧑‍🍳 환영해요! 방향키(또는 패드)를 꾹 누르면 캐릭터가 움직여요.`, 3200);
}

/* ---------- 부팅 ---------- */
loadState();
initStartScreen();
if (state.started) startGame();
