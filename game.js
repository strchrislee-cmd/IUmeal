/* ==========================================================
 * IUmeal 픽셀 게임 엔진 (게더타운 스타일 2D)
 * - 16px 타일을 코드로 직접 그리는 도트 그래픽 (외부 이미지 없음)
 * - 부드러운 연속 이동 + 충돌 + 카메라 추적
 * - 근접 오브젝트 하이라이트 & 상호작용
 * ========================================================== */

const Game = (() => {
  const TILE = 16;

  /* ---------- 팔레트 ---------- */
  const PAL = {
    k: "#1a1423", // 외곽선
    W: "#f8f4ec", // 흰색(모자)
    w: "#d8d2c8",
    s: "#f2c9a1", // 피부
    S: "#d19a6a",
    O: "#e8734a", // 앞치마
    o: "#c25233",
    B: "#3b5dc9", // 바지
    h: "#5a3620", // 신발
    Y: "#f0c34e", // 아기 옷
  };

  /* ---------- 스프라이트 (12x16) ---------- */
  const SPR = {
    down: [[
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..kskssksk..",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      ".ksOOOOOOsk.",
      ".ksOOooOOsk.",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBkkBk...",
      "...kh..hk...",
    ], [
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..kskssksk..",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      ".ksOOOOOOsk.",
      ".ksOOooOOsk.",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBkkBk...",
      "..kh....hk..",
    ]],
    up: [[
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..kssssssk..",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      ".ksOOOOOOsk.",
      ".ksOOOOOOsk.",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBkkBk...",
      "...kh..hk...",
    ], [
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..kssssssk..",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      ".ksOOOOOOsk.",
      ".ksOOOOOOsk.",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBkkBk...",
      "..kh....hk..",
    ]],
    side: [[
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..ksssskssk.",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      "..ksOOOOsk..",
      "..kOOooOOk..",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBBkBk...",
      "...kh.hk....",
    ], [
      "....kkkk....",
      "...kWWWWk...",
      "..kWWWWWWk..",
      "..kWWWWWWk..",
      "...kssssk...",
      "..kssssssk..",
      "..ksssskssk.",
      "..kssssssk..",
      "...kssssk...",
      "..kOOOOOOk..",
      "..ksOOOOsk..",
      "..kOOooOOk..",
      "..kOOOOOOk..",
      "...kBBBBk...",
      "...kBBkBk...",
      "....khhk....",
    ]],
  };

  const BABY = [
    "....kk....",
    "...kssk...",
    "..kssssk..",
    ".kskssksk.",
    ".kssssssk.",
    "..kssssk..",
    ".kYYYYYYk.",
    ".kYYYYYYk.",
    "..kYYYYk..",
    "..kk..kk..",
  ];

  function buildSprite(rows) {
    const c = document.createElement("canvas");
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext("2d");
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ".") continue;
        g.fillStyle = PAL[ch] || "#f0f";
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  const sprites = {
    down: SPR.down.map(buildSprite),
    up: SPR.up.map(buildSprite),
    side: SPR.side.map(buildSprite),
    baby: buildSprite(BABY),
  };

  /* ---------- 맵 ---------- */
  const MAPS = {
    market: {
      name: "🛒 세계 식자재 마트",
      spawn: { x: 9.5 * TILE, y: 10.5 * TILE },
      rows: [
        "####################",
        "#VVVV..FFFF..MMMM..#",
        "#..................#",
        "#..................#",
        "#GGGG........DDDD..#",
        "#..................#",
        "#P................P#",
        "#.....CC...........#",
        "#..................#",
        "#..................#",
        "#P................P#",
        "#..................#",
        "########EE##########",
      ],
      meta: {
        V: { label: "채소 코너",        action: "shop:veg" },
        F: { label: "과일 코너",        action: "shop:fruit" },
        M: { label: "정육·수산 코너",   action: "shop:meat" },
        G: { label: "곡물 코너",        action: "shop:grain" },
        D: { label: "유제품·기타 코너", action: "shop:dairy" },
        C: { label: "계산대 · 장바구니", action: "cart" },
        E: { label: "주방으로 가는 문", door: "kitchen" },
      },
    },
    kitchen: {
      name: "🍳 우리집 주방",
      spawn: { x: 9.5 * TILE, y: 10.5 * TILE },
      rows: [
        "####WW######WW######",
        "#RR..BB.KK.........#",
        "#..................#",
        "#..................#",
        "#JJ......rrrr......#",
        "#........rTTr......#",
        "#........rTTr......#",
        "#........rrrr......#",
        "#..................#",
        "#P................P#",
        "#..................#",
        "#..................#",
        "########EE##########",
      ],
      meta: {
        R: { label: "냉장고 · 보유 식자재", action: "fridge" },
        B: { label: "조리대 · 레시피북",   action: "recipes" },
        T: { label: "식탁 · 식사 일지",     action: "journal" },
        J: { label: "책장 · 이유식 가이드", action: "guide" },
        E: { label: "마트로 가는 문",       door: "market" },
      },
      baby: { x: 13, y: 6 }, // 아기 NPC (타일 좌표)
    },
  };

  const SOLID = new Set(["#", "V", "F", "M", "G", "D", "C", "P", "R", "B", "K", "T", "J", "W"]);
  const INTERACTIVE = new Set(["V", "F", "M", "G", "D", "C", "R", "B", "T", "J"]);

  /* ---------- 타일 페인터 ---------- */
  function rct(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }

  function paintFloor(g, x, y, scene, tx, ty) {
    if (scene === "market") {
      rct(g, x, y, TILE, TILE, (tx + ty) % 2 ? "#e6d5b0" : "#eeddba");
      rct(g, x + 3, y + 3, 1, 1, "#d8c49c");
      rct(g, x + 11, y + 9, 1, 1, "#d8c49c");
    } else {
      rct(g, x, y, TILE, TILE, (tx + ty) % 2 ? "#c8dccc" : "#d2e4d6");
      rct(g, x, y, TILE, 1, "#b6ccba");
      rct(g, x, y, 1, TILE, "#b6ccba");
    }
  }

  function paintWall(g, x, y) {
    rct(g, x, y, TILE, TILE, "#6e4a2f");
    rct(g, x, y, TILE, 4, "#8a5c3a");
    rct(g, x, y + 13, TILE, 3, "#4e3018");
    rct(g, x, y + 8, TILE, 1, "#5a3a22");
    rct(g, x + 7, y + 4, 1, 4, "#5a3a22");
    rct(g, x + 3, y + 9, 1, 4, "#5a3a22");
    rct(g, x + 12, y + 9, 1, 4, "#5a3a22");
  }

  function paintWindow(g, x, y) {
    paintWall(g, x, y);
    rct(g, x + 2, y + 3, 12, 9, "#1a1423");
    rct(g, x + 3, y + 4, 10, 7, "#8ec9e8");
    rct(g, x + 3, y + 4, 4, 3, "#c3e6f7");
    rct(g, x + 7, y + 4, 1, 7, "#1a1423");
    rct(g, x + 3, y + 7, 10, 1, "#1a1423");
  }

  const SHELF_COLORS = {
    V: ["#57a559", "#e8883a", "#3c7440"],
    F: ["#d94f4f", "#f0c34e", "#7bc47f"],
    M: ["#e08a8a", "#c0392b", "#f2c9a1"],
    G: ["#d9b98a", "#c9a06a", "#f4e6c8"],
    D: ["#f8f4ec", "#f0c34e", "#cfdcec"],
  };

  function paintShelf(g, x, y, ch) {
    rct(g, x, y, TILE, TILE, "#7a4a2b");
    rct(g, x, y, TILE, 1, "#1a1423");
    rct(g, x, y + 15, TILE, 1, "#4e3018");
    rct(g, x + 1, y + 4, 14, 2, "#5a3620");
    rct(g, x + 1, y + 11, 14, 2, "#5a3620");
    const cols = SHELF_COLORS[ch];
    [2, 9].forEach((sy) => {
      rct(g, x + 2, y + sy, 3, 3, cols[0]);
      rct(g, x + 6, y + sy, 3, 3, cols[1]);
      rct(g, x + 10, y + sy, 3, 3, cols[2]);
      rct(g, x + 2, y + sy, 3, 1, "rgba(255,255,255,0.35)");
      rct(g, x + 6, y + sy, 3, 1, "rgba(255,255,255,0.35)");
      rct(g, x + 10, y + sy, 3, 1, "rgba(255,255,255,0.35)");
    });
  }

  function paintCheckout(g, x, y, first) {
    rct(g, x, y + 3, TILE, 13, "#9a6a3f");
    rct(g, x, y + 3, TILE, 2, "#b98d5f");
    rct(g, x, y + 14, TILE, 2, "#6e4a2f");
    if (first) {
      rct(g, x + 3, y - 0 + 4, 8, 7, "#3a3a4a");
      rct(g, x + 4, y + 5, 6, 4, "#7fe6a0");
      rct(g, x + 5, y + 6, 2, 1, "#e6fff0");
    } else {
      rct(g, x + 3, y + 6, 9, 4, "#e8734a");
      rct(g, x + 4, y + 7, 7, 2, "#f0c34e");
    }
  }

  function paintPlant(g, x, y) {
    rct(g, x + 5, y + 10, 6, 5, "#b5563a");
    rct(g, x + 5, y + 10, 6, 1, "#d1704f");
    rct(g, x + 3, y + 2, 10, 8, "#3c7440");
    rct(g, x + 5, y + 1, 6, 3, "#57a559");
    rct(g, x + 4, y + 4, 3, 3, "#57a559");
    rct(g, x + 9, y + 5, 3, 3, "#57a559");
  }

  function paintDoor(g, x, y) {
    rct(g, x, y, TILE, TILE, "#3a2415");
    rct(g, x + 1, y, 14, 15, "#8a5c3a");
    rct(g, x + 3, y + 2, 10, 6, "#6e4a2f");
    rct(g, x + 4, y + 3, 8, 4, "#c3e6f7");
    rct(g, x + 12, y + 9, 2, 2, "#f0c34e");
  }

  function paintFridge(g, x, y, first) {
    rct(g, x, y, TILE, TILE, "#cfdcec");
    rct(g, x, y, TILE, 1, "#1a1423");
    rct(g, x, y + 15, TILE, 1, "#8a99ac");
    rct(g, x, y, 1, TILE, first ? "#1a1423" : "#aebccc");
    rct(g, x + 15, y, 1, TILE, first ? "#aebccc" : "#1a1423");
    rct(g, x + 2, y + 2, 12, 1, "#e8f0f8");
    rct(g, x, y + 9, TILE, 1, "#8a99ac");
    rct(g, x + (first ? 12 : 2), y + 4, 2, 4, "#5a6a7c");
    rct(g, x + (first ? 12 : 2), y + 11, 2, 3, "#5a6a7c");
  }

  function paintCounter(g, x, y) {
    rct(g, x, y, TILE, 6, "#e6d5b0");
    rct(g, x, y, TILE, 1, "#f4e6c8");
    rct(g, x, y + 6, TILE, 10, "#9a6a3f");
    rct(g, x, y + 6, TILE, 1, "#6e4a2f");
    rct(g, x + 4, y + 9, 3, 4, "#7a4a2b");
    rct(g, x + 10, y + 9, 3, 4, "#7a4a2b");
  }

  function paintCounterBook(g, x, y, first) {
    paintCounter(g, x, y);
    if (first) {
      rct(g, x + 3, y - 2, 12, 7, "#1a1423");
      rct(g, x + 4, y - 1, 5, 5, "#f8f4ec");
      rct(g, x + 10, y - 1, 4, 5, "#f8f4ec");
      rct(g, x + 5, y + 0, 3, 1, "#c0392b");
      rct(g, x + 5, y + 2, 3, 1, "#8a99ac");
      rct(g, x + 10, y + 0, 3, 1, "#3b5dc9");
      rct(g, x + 10, y + 2, 3, 1, "#8a99ac");
    } else {
      rct(g, x + 2, y - 1, 8, 5, "#3a3a4a");
      rct(g, x + 3, y + 0, 6, 3, "#6e4a2f");
      rct(g, x + 4, y - 3, 1, 3, "#8a99ac");
      rct(g, x + 6, y - 4, 1, 4, "#aebccc");
    }
  }

  function paintTable(g, x, y, tx, ty) {
    rct(g, x, y, TILE, TILE, "#a3703f");
    rct(g, x, y, TILE, 2, "#c08b52");
    rct(g, x, y + 14, TILE, 2, "#7a4a2b");
    if ((tx + ty) % 2 === 0) {
      rct(g, x + 4, y + 5, 8, 7, "#f8f4ec");
      rct(g, x + 6, y + 7, 4, 3, "#e8734a");
    }
  }

  function paintBookshelf(g, x, y) {
    rct(g, x, y, TILE, TILE, "#5a3620");
    rct(g, x, y, TILE, 1, "#1a1423");
    rct(g, x + 1, y + 2, 14, 5, "#3a2415");
    rct(g, x + 1, y + 9, 14, 5, "#3a2415");
    const books = ["#c0392b", "#3b5dc9", "#57a559", "#f0c34e", "#e8734a"];
    for (let i = 0; i < 5; i++) {
      rct(g, x + 2 + i * 3, y + 3, 2, 4, books[i]);
      rct(g, x + 2 + i * 3, y + 10, 2, 4, books[(i + 2) % 5]);
    }
  }

  function paintRug(g, x, y, scene, tx, ty) {
    paintFloor(g, x, y, scene, tx, ty);
    rct(g, x, y, TILE, TILE, "#d9788a");
    rct(g, x + 1, y + 1, 14, 14, "#e694a4");
    rct(g, x + 3, y + 3, 10, 10, "#d9788a");
    rct(g, x + 7, y + 7, 2, 2, "#f4c2cc");
  }

  function paintTile(g, ch, tx, ty, scene, rows) {
    const x = tx * TILE, y = ty * TILE;
    switch (ch) {
      case "#": paintWall(g, x, y); break;
      case "W": paintWindow(g, x, y); break;
      case ".": paintFloor(g, x, y, scene, tx, ty); break;
      case "r": paintRug(g, x, y, scene, tx, ty); break;
      case "V": case "F": case "M": case "G": case "D": paintShelf(g, x, y, ch); break;
      case "C": paintCheckout(g, x, y, rows[ty][tx - 1] !== "C"); break;
      case "P": paintFloor(g, x, y, scene, tx, ty); paintPlant(g, x, y); break;
      case "E": paintDoor(g, x, y); break;
      case "R": paintFridge(g, x, y, rows[ty][tx - 1] !== "R"); break;
      case "B": paintCounterBook(g, x, y, rows[ty][tx - 1] !== "B"); break;
      case "K": paintCounter(g, x, y); break;
      case "T": paintTable(g, x, y, tx, ty); break;
      case "J": paintBookshelf(g, x, y); break;
      default: paintFloor(g, x, y, scene, tx, ty);
    }
  }

  /* ---------- 엔진 상태 ---------- */
  let canvas, ctx, wrap;
  let scene = "market";
  let mapCanvas = null;
  let mapW = 0, mapH = 0;         // 타일 수
  let px = 0, py = 0;             // 플레이어 발 중심 (월드 px)
  let facing = "down", flip = false, moving = false;
  let keys = { up: false, down: false, left: false, right: false };
  let SCALE = 3;
  let highlight = null;           // { tx, ty, label, action?, door? }
  let doorLock = false;           // 씬 전환 직후, 키를 모두 뗄 때까지 문 재작동 잠금
  let lastT = 0;
  let started = false;
  let playerName = "셰프";
  let babyName = "아기";

  let onActionCb = () => {};
  let onDoorCb = () => {};
  const SPEED = 74; // 월드 px/초

  function rowsOf() { return MAPS[scene].rows; }
  function tileAt(wx, wy) {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const rows = rowsOf();
    if (ty < 0 || ty >= rows.length || tx < 0 || tx >= rows[0].length) return "#";
    return rows[ty][tx];
  }
  function isSolidAt(wx, wy) {
    if (SOLID.has(tileAt(wx, wy))) return true;
    const b = MAPS[scene].baby;
    if (b) {
      const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
      if (tx === b.x && ty === b.y) return true;
    }
    return false;
  }

  /* 충돌 박스: 발 주변 10x6 */
  function collides(nx, ny) {
    return (
      isSolidAt(nx - 5, ny - 3) || isSolidAt(nx + 5, ny - 3) ||
      isSolidAt(nx - 5, ny + 2) || isSolidAt(nx + 5, ny + 2)
    );
  }

  function prerender() {
    const rows = rowsOf();
    mapH = rows.length; mapW = rows[0].length;
    mapCanvas = document.createElement("canvas");
    mapCanvas.width = mapW * TILE; mapCanvas.height = mapH * TILE;
    const g = mapCanvas.getContext("2d");
    for (let y = 0; y < mapH; y++)
      for (let x = 0; x < mapW; x++)
        paintTile(g, rows[y][x], x, y, scene, rows);
  }

  function resize() {
    if (!wrap) return;
    canvas.width = Math.max(320, wrap.clientWidth);
    canvas.height = Math.max(240, wrap.clientHeight);
    // 화면에 10x14타일 정도가 보이도록 정수 배율 선택 (부족하면 카메라가 따라감)
    SCALE = Math.floor(Math.min(canvas.width / (14 * TILE), canvas.height / (10 * TILE)));
    SCALE = Math.max(2, Math.min(5, SCALE || 2));
    ctx.imageSmoothingEnabled = false;
  }

  function modalOpen() {
    const ov = document.getElementById("modal-overlay");
    return ov && !ov.classList.contains("hidden");
  }

  /* ---------- 업데이트 ---------- */
  function update(dt) {
    if (modalOpen()) { moving = false; return; }
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    moving = dx !== 0 || dy !== 0;
    if (!moving) doorLock = false; // 키를 모두 떼면 문 잠금 해제
    if (moving) {
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      if (Math.abs(dx) > Math.abs(dy)) { facing = "side"; flip = dx < 0; }
      else if (dy < 0) facing = "up";
      else if (dy > 0) facing = "down";

      const nx = px + dx * SPEED * dt;
      const ny = py + dy * SPEED * dt;
      if (!collides(nx, py)) px = nx;
      if (!collides(px, ny)) py = ny;

      // 문 체크
      if (tileAt(px, py) === "E" && !doorLock) {
        doorLock = true;
        onDoorCb(MAPS[scene].meta.E.door);
        return;
      }
    }
    updateHighlight();
  }

  function updateHighlight() {
    const rows = rowsOf();
    const meta = MAPS[scene].meta;
    const cx = px, cy = py - 6;
    let best = null, bestD = 30;
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const ch = rows[ty][tx];
        if (!INTERACTIVE.has(ch)) continue;
        const d = Math.hypot(tx * TILE + 8 - cx, ty * TILE + 8 - cy);
        if (d < bestD) { bestD = d; best = { tx, ty, ch, ...meta[ch] }; }
      }
    }
    const changed = (best?.tx !== highlight?.tx) || (best?.ty !== highlight?.ty) || (!best !== !highlight);
    highlight = best;
    if (changed) renderHint();
  }

  function renderHint() {
    const hint = document.getElementById("hintbar");
    if (!hint) return;
    if (highlight) {
      hint.innerHTML = `<span class="key">SPACE / A</span> ${highlight.label}`;
      hint.classList.add("active");
    } else {
      hint.innerHTML = `<span class="key">←↑↓→</span> 이동 · 가구 가까이에서 <span class="key">SPACE / A</span>`;
      hint.classList.remove("active");
    }
  }

  function interact() {
    if (modalOpen()) return;
    if (highlight && highlight.action) { onActionCb(highlight.action); return; }
    // 문 위에 서 있으면 문 통과
    if (tileAt(px, py) === "E") { onDoorCb(MAPS[scene].meta.E.door); return; }
  }

  /* ---------- 렌더 ---------- */
  function draw(t) {
    const cw = canvas.width, chh = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#241c2c";
    ctx.fillRect(0, 0, cw, chh);

    const viewW = cw / SCALE, viewH = chh / SCALE;
    const worldW = mapW * TILE, worldH = mapH * TILE;
    let camX = px - viewW / 2, camY = py - 8 - viewH / 2;
    let offX = 0, offY = 0;
    if (worldW <= viewW) { camX = 0; offX = (cw - worldW * SCALE) / 2; }
    else camX = Math.max(0, Math.min(worldW - viewW, camX));
    if (worldH <= viewH) { camY = 0; offY = (chh - worldH * SCALE) / 2; }
    else camY = Math.max(0, Math.min(worldH - viewH, camY));

    ctx.setTransform(SCALE, 0, 0, SCALE, offX - camX * SCALE, offY - camY * SCALE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCanvas, 0, 0);

    // 하이라이트 (노란 브래킷)
    if (highlight && !modalOpen()) {
      const hx = highlight.tx * TILE, hy = highlight.ty * TILE;
      const pulse = 0.55 + 0.45 * Math.sin(t / 180);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#f0c34e";
      const L = 5, TH = 2;
      ctx.fillRect(hx - 1, hy - 1, L, TH); ctx.fillRect(hx - 1, hy - 1, TH, L);
      ctx.fillRect(hx + TILE - L + 1, hy - 1, L, TH); ctx.fillRect(hx + TILE - 1, hy - 1, TH, L);
      ctx.fillRect(hx - 1, hy + TILE - 1, L, TH); ctx.fillRect(hx - 1, hy + TILE - L + 1, TH, L);
      ctx.fillRect(hx + TILE - L + 1, hy + TILE - 1, L, TH); ctx.fillRect(hx + TILE - 1, hy + TILE - L + 1, TH, L);
      ctx.globalAlpha = 1;
    }

    // 아기 NPC
    const baby = MAPS[scene].baby;
    if (baby) {
      const bob = Math.sin(t / 400) > 0 ? 0 : -1;
      ctx.drawImage(sprites.baby, baby.x * TILE + 3, baby.y * TILE + 5 + bob);
    }

    // 플레이어
    const frame = moving ? (Math.floor(t / 140) % 2) : 0;
    const bob = moving && frame ? -1 : 0;
    const spr = sprites[facing][frame];
    const sx = Math.round(px - 6), sy = Math.round(py - 14 + bob);
    // 그림자
    ctx.fillStyle = "rgba(26,20,35,0.25)";
    ctx.fillRect(Math.round(px - 5), Math.round(py + 1), 10, 3);
    if (facing === "side" && flip) {
      ctx.save();
      ctx.translate(sx + 12, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(spr, sx, sy);
    }

    /* ----- 스크린 좌표 레이어 (이름표, 라벨) ----- */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const toScreen = (wx, wy) => [offX + (wx - camX) * SCALE, offY + (wy - camY) * SCALE];
    const fontPx = Math.max(10, SCALE * 4);
    ctx.font = `${fontPx}px DungGeunMo, "Malgun Gothic", sans-serif`;
    ctx.textAlign = "center";

    function nameTag(wx, wy, text, bg) {
      const [x, y] = toScreen(wx, wy);
      const w = ctx.measureText(text).width + 10;
      ctx.fillStyle = bg;
      ctx.fillRect(x - w / 2, y - fontPx - 6, w, fontPx + 6);
      ctx.fillStyle = "#f8f4ec";
      ctx.fillText(text, x, y - 4);
    }

    nameTag(px, py - 16, playerName, "rgba(26,20,35,0.75)");
    if (baby) nameTag(baby.x * TILE + 8, baby.y * TILE + 3, babyName, "rgba(59,93,201,0.8)");
    if (highlight && !modalOpen()) {
      nameTag(highlight.tx * TILE + 8, highlight.ty * TILE - 3, highlight.label, "rgba(192,82,51,0.9)");
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    if (started) { update(dt); draw(t); }
    requestAnimationFrame(loop);
  }

  /* ---------- 입력 ---------- */
  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right",
    ㅈ: "up", ㄴ: "down", ㅁ: "left", ㅇ: "right",
  };

  function bindInput() {
    document.addEventListener("keydown", (e) => {
      if (!started) return;
      const dir = KEYMAP[e.key];
      if (dir && !modalOpen()) { keys[dir] = true; e.preventDefault(); }
      if ((e.key === " " || e.key === "Enter") && !modalOpen()) { e.preventDefault(); interact(); }
    });
    document.addEventListener("keyup", (e) => {
      const dir = KEYMAP[e.key];
      if (dir) keys[dir] = false;
    });
    window.addEventListener("blur", () => { keys = { up: false, down: false, left: false, right: false }; });

    document.querySelectorAll("#dpad button").forEach((b) => {
      const dir = b.dataset.dir;
      const on = (e) => { e.preventDefault(); keys[dir] = true; };
      const off = (e) => { e.preventDefault(); keys[dir] = false; };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off);
      b.addEventListener("pointercancel", off);
    });
    const act = document.getElementById("act-btn");
    if (act) act.addEventListener("click", interact);
    window.addEventListener("resize", resize);
  }

  /* ---------- 공개 API ---------- */
  return {
    start(initialScene, names) {
      canvas = document.getElementById("game");
      wrap = document.getElementById("map-wrap");
      ctx = canvas.getContext("2d");
      scene = MAPS[initialScene] ? initialScene : "market";
      playerName = names?.player || "셰프";
      babyName = names?.baby || "아기";
      prerender();
      resize();
      const sp = MAPS[scene].spawn;
      px = sp.x; py = sp.y;
      if (!started) { started = true; bindInput(); requestAnimationFrame(loop); }
      renderHint();
      return MAPS[scene].name;
    },
    setScene(target) {
      scene = target;
      prerender();
      resize();
      const sp = MAPS[scene].spawn;
      px = sp.x; py = sp.y;
      doorLock = true;
      highlight = null;
      renderHint();
      return MAPS[scene].name;
    },
    setNames(names) {
      if (names?.player) playerName = names.player;
      if (names?.baby) babyName = names.baby;
    },
    onAction(cb) { onActionCb = cb; },
    onDoor(cb) { onDoorCb = cb; },
    sceneName(id) { return MAPS[id]?.name || ""; },
    /* 테스트/디버그용 */
    debug: {
      pos: () => ({ x: px, y: py, scene }),
      teleport(wx, wy) { px = wx; py = wy; updateHighlight(); },
      interact,
      highlight: () => highlight,
    },
  };
})();
