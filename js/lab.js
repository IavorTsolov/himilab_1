/* ============================================================
   ХимиЛаб — Лабораторен двигател (lab.js)
   ============================================================ */

let beakerSlots = [];      // max 2 reactant IDs
let heated = false;
let lastReaction = null;
let bubbleTimer = null, pptTimer = null, steamTimer = null, spillTimer = null;
let heatTemp = 20, heatRamp = null;
let heatApplied = false;

// Helpers
function solidColor(c) {
  return c.includes('rgba') ? c.replace(/[\d.]+\)$/, '0.92)') : c;
}

// Generate Reactants Shelf UI
function renderReagentsShelf() {
  const rEl = document.getElementById('reagents');
  if (!rEl) return;
  rEl.innerHTML = '';

  Object.entries(REAGENTS).forEach(([id, r]) => {
    const d = document.createElement('div');
    d.className = 'reagent';
    d.dataset.id = id;
    d.draggable = false;
    d.innerHTML = `
      <div class="swatch" style="background:${solidColor(r.color)}"></div>
      <div class="f">${r.f}</div>
      <span class="n">${r.n}</span>
    `;
    
    // pointer drag (supports mouse + touch screens)
    d.addEventListener('pointerdown', e => startReagentDrag(e, id, d));
    rEl.appendChild(d);
  });
}

/* --- Drag & Drop Mechanics --- */
let dragState = null;

function killGhosts() {
  document.querySelectorAll('.drag-ghost').forEach(g => g.remove());
}

function startReagentDrag(e, id, card) {
  if (e.button && e.button !== 0) return;
  e.preventDefault();
  killGhosts(); 

  dragState = { id, card, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, pid: e.pointerId };
  try {
    card.setPointerCapture(e.pointerId);
  } catch (_) {}

  card.addEventListener('pointermove', onDragMove);
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);
  card.addEventListener('lostpointercapture', endDrag);
}

function onDragMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.sx;
  const dy = e.clientY - dragState.sy;

  if (!dragState.moved) {
    if (Math.hypot(dx, dy) < 7) return;
    dragState.moved = true;
    dragState.card.classList.add('dragging');
    
    const r = REAGENTS[dragState.id];
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.innerHTML = `<div class="dg-bottle" style="--c:${solidColor(r.color)}"></div><span>${r.f}</span>`;
    document.body.appendChild(g);
    dragState.ghost = g;
    
    document.getElementById('beaker').classList.add('drop-ready');
  }

  if (dragState.ghost) {
    dragState.ghost.style.left = e.clientX + 'px';
    dragState.ghost.style.top = e.clientY + 'px';
  }

  document.getElementById('beaker').classList.toggle('drop-hover', overBeaker(e.clientX, e.clientY));
}

function endDrag(e) {
  if (!dragState) return;
  const ds = dragState;
  dragState = null; // Prevent double-triggering
  
  const card = ds.card;
  card.removeEventListener('pointermove', onDragMove);
  card.removeEventListener('pointerup', endDrag);
  card.removeEventListener('pointercancel', endDrag);
  card.removeEventListener('lostpointercapture', endDrag);

  try {
    card.releasePointerCapture(ds.pid);
  } catch (_) {}

  const isUp = e && e.type === 'pointerup';
  if (ds.moved) {
    if (isUp && overBeaker(e.clientX, e.clientY)) {
      addReagent(ds.id);
    } else if (isUp) {
      flashHint('Пусни реактива върху чашата 🧪');
    }
  } else if (isUp) {
    addReagent(ds.id); // Standard click fallback
  }

  if (ds.ghost) ds.ghost.remove();
  killGhosts();
  card.classList.remove('dragging');
  
  const b = document.getElementById('beaker');
  b.classList.remove('drop-ready', 'drop-hover');
}

// Check if pointer is coordinates over the beaker
function overBeaker(x, y) {
  const beaker = document.getElementById('beaker');
  if (!beaker) return false;
  const r = beaker.getBoundingClientRect();
  const pad = 45;
  return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
}

// Add reagent to the beaker slots
function addReagent(id) {
  if (beakerSlots.includes(id)) return;
  if (beakerSlots.length >= 2) {
    flashHint('Чашата е пълна — изчисти я първо ↺');
    return;
  }
  beakerSlots.push(id);
  renderSlots();

  if (beakerSlots.length === 2) {
    document.getElementById('reactBtn').disabled = false;
  }
  animatePour(id);
}

// Animate pouring liquid from a tilted cylinder with splash effects
function animatePour(id) {
  const r = REAGENTS[id];
  const col = solidColor(r.color);
  const lvl = beakerSlots.length;
  const targetH = Math.min(20 + lvl * 32, 72);
  const wrap = document.querySelector('.beaker-wrap');
  
  const bottle = document.createElement('div');
  bottle.className = 'pour-bottle';
  bottle.style.setProperty('--c', col);
  bottle.innerHTML = '<i></i>';
  wrap.appendChild(bottle);

  const stream = document.createElement('div');
  stream.className = 'pour-stream';
  stream.style.background = `linear-gradient(${col}, ${col} 60%, transparent)`;
  wrap.appendChild(stream);

  setTimeout(() => {
    const liq = document.getElementById('liquid');
    liq.style.height = targetH + '%';
    liq.style.background = r.color;
    splash(col, targetH);
  }, 480);

  setTimeout(() => {
    bottle.classList.add('pour-done');
    stream.style.transition = 'opacity .3s';
    stream.style.opacity = 0;
  }, 1150);

  setTimeout(() => {
    bottle.remove();
    stream.remove();
  }, 1600);
}

// Splash droplet particles inside the beaker
function splash(col, heightPct) {
  const beaker = document.getElementById('beaker');
  const topPct = Math.max(8, 100 - heightPct);
  
  for (let i = 0; i < 9; i++) {
    const d = document.createElement('div');
    d.className = 'splash-drop';
    d.style.background = col;
    d.style.left = (44 + Math.random() * 12) + '%';
    d.style.top = 'calc(' + topPct + '% - 4px)';
    beaker.appendChild(d);

    const dx = (Math.random() - 0.5) * 80;
    const dy = -(15 + Math.random() * 35);
    const dur = 450 + Math.random() * 350;

    d.animate([
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx * 1.3}px,${dy + 50}px)`, opacity: 0 }
    ], { duration: dur, easing: 'ease-out' });

    setTimeout(() => d.remove(), dur + 50);
  }
}

// Render selected reagents slots
function renderSlots() {
  for (let i = 0; i < 2; i++) {
    const s = document.getElementById('slot' + i);
    const id = beakerSlots[i];
    if (id) {
      s.classList.add('filled');
      s.innerHTML = `<div><div class="sf">${REAGENTS[id].f}</div><div style="font-size:.62rem;color:var(--muted)">${REAGENTS[id].n}</div></div>`;
    } else {
      s.classList.remove('filled');
      s.innerHTML = '<span>празно</span>';
    }
  }

  // Highlight selected shelf cards
  document.querySelectorAll('.reagent').forEach(r => {
    r.classList.toggle('sel', beakerSlots.includes(r.dataset.id));
  });

  document.getElementById('reactBtn').disabled = beakerSlots.length < 2;
  document.getElementById('heatBtn').disabled = beakerSlots.length === 0;
}

// Clear the beaker state
function clearBeaker() {
  beakerSlots = [];
  lastReaction = null;
  heated = false;
  heatApplied = false;
  heatTemp = 20;
  clearInterval(heatRamp);
  stopEffects();

  const liq = document.getElementById('liquid');
  liq.style.height = '0%';
  liq.style.background = 'rgba(60,150,255,0)';
  
  document.getElementById('glow').style.opacity = 0;
  document.getElementById('burner').classList.remove('on');
  document.getElementById('tripod').classList.remove('on');
  
  setTemp(20);
  document.getElementById('rName').textContent = '';
  document.getElementById('rEq').innerHTML = 'Чашата е празна — добави реактиви ↖';
  document.getElementById('rDesc').textContent = '';
  document.getElementById('rTags').innerHTML = '';
  document.getElementById('heatBtn').textContent = '🔥 Загрей';
  
  renderSlots();
}

function quickMix(a, b) {
  go('lab');
  clearBeaker();
  setTimeout(() => {
    addReagent(a);
    addReagent(b);
    setTimeout(runReaction, 500);
  }, 250);
}

function flashHint(t) {
  const e = document.getElementById('rDesc');
  const o = e.textContent;
  e.textContent = t;
  e.style.color = 'var(--amber)';
  setTimeout(() => { e.style.color = ''; }, 1500);
}

function findReaction(a, b) {
  return REACTIONS.find(r => (r.p[0] === a && r.p[1] === b) || (r.p[0] === b && r.p[1] === a));
}

function fmtEq(s) {
  return s.replace(/<s>(\d+)<\/s>/g, '<sub>$1</sub>')
          .replace(/<ar\/>/g, '<span class="arrow">→</span>')
          .replace(/<dn\/>/g, '<span class="down">↓</span>')
          .replace(/<up\/>/g, '<span class="up">↑</span>');
}

// Trigger chemical reactions inside the beaker
function runReaction() {
  if (beakerSlots.length < 2) return;
  stopEffects();
  
  const [a, b] = beakerSlots;
  const r = findReaction(a, b);
  const liq = document.getElementById('liquid');

  if (!r) {
    document.getElementById('rName').textContent = 'Няма видима реакция';
    document.getElementById('rEq').innerHTML = `${REAGENTS[a].f} + ${REAGENTS[b].f} <span class="arrow">→</span> ?`;
    document.getElementById('rDesc').textContent = 'Тези вещества не реагират забележимо при тези условия. Опитай друга комбинация или ги загрей.';
    document.getElementById('rTags').innerHTML = '';
    liq.style.background = 'rgba(150,180,220,.25)';
    liq.style.height = '60%';
    swirlMix();
    return;
  }

  lastReaction = r;
  liq.style.height = '62%';
  liq.style.background = r.liquid;
  swirlMix(); 
  flashLiquid();

  // Highlight indicator colors
  const glow = document.getElementById('glow');
  if (r.liquid.includes('255,95,162') || r.liquid.includes('40,1')) {
    glow.style.background = `radial-gradient(circle at 50% 70%,${r.liquid},transparent 70%)`;
    glow.style.opacity = .5;
  } else {
    glow.style.opacity = 0;
  }

  // Trigger visual reaction effects
  if (r.ppt) startPrecipitate(r.ppt);
  if (r.gas) startBubbles(r.foam);
  if (r.foam) foamSpill();
  if (r.exo) { setTemp(45); heatGlow(); }
  if (r.gas || r.exo || r.foam) shakeBeaker();

  // Print reaction descriptions
  document.getElementById('rName').textContent = '✓ ' + r.name;
  document.getElementById('rEq').innerHTML = fmtEq(r.eq);
  document.getElementById('rDesc').textContent = r.desc;
  renderTags(r);
}

function renderTags(r) {
  const tags = [...(r.tags || [])];
  let html = '';
  tags.forEach(t => {
    let cls = 'tag';
    if (/газ/.test(t)) cls += ' gas';
    if (/утайк/.test(t)) cls += ' ppt';
    if (/екзо|загрява/.test(t)) cls += ' hot';
    html += `<span class="${cls}">${t}</span>`;
  });
  document.getElementById('rTags').innerHTML = html;
}

// Volumetric gas bubbles rising inside the liquid
function startBubbles(foam) {
  const beaker = document.getElementById('beaker');
  bubbleTimer = setInterval(() => {
    const n = foam ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const b = document.createElement('div');
      const size = foam ? (4 + Math.random() * 8) : (3 + Math.random() * 5);
      b.style.cssText = `position:absolute;bottom:6px;left:${15 + Math.random() * 70}%;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,${foam ? .7 : .45});pointer-events:none;z-index:4`;
      beaker.appendChild(b);
      const dur = 900 + Math.random() * 700;
      b.animate([
        { transform: 'translateY(0)', opacity: .8 },
        { transform: `translateY(-${120 + Math.random() * 40}px)`, opacity: 0 }
      ], { duration: dur, easing: 'ease-out' });
      setTimeout(() => b.remove(), dur);
    }
  }, foam ? 90 : 240);
}

// Precipitate falling crystals forming u-shapes at the bottom of the beaker
function startPrecipitate(color) {
  const liq = document.getElementById('liquid');
  let count = 0;
  pptTimer = setInterval(() => {
    if (count++ > 40) { clearInterval(pptTimer); return; }
    const p = document.createElement('div');
    const size = 4 + Math.random() * 7;
    p.style.cssText = `position:absolute;top:-6px;left:${10 + Math.random() * 80}%;width:${size}px;height:${size}px;border-radius:40%;background:${color};box-shadow:0 0 6px ${color};pointer-events:none;z-index:4;opacity:.95`;
    liq.appendChild(p);
    const fall = 120 + Math.random() * 60;
    p.animate([
      { transform: 'translateY(0)' },
      { transform: `translateY(${fall}px)` }
    ], { duration: 1200 + Math.random() * 900, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
  }, 70);
}

function stopEffects() {
  clearInterval(bubbleTimer);
  clearInterval(pptTimer);
  clearInterval(steamTimer);
  clearInterval(spillTimer);
  document.querySelectorAll('#beaker > div:not(.lip):not(.glow):not(.liquid)').forEach(e => e.remove());
  document.querySelectorAll('#liquid > div').forEach(e => e.remove());
  document.querySelectorAll('.beaker-wrap > .pour-bottle, .beaker-wrap > .pour-stream, .beaker-wrap > .foam-b').forEach(e => e.remove());
}

// Swirling animation
function swirlMix() {
  const liq = document.getElementById('liquid');
  const s = document.createElement('div');
  s.className = 'swirl';
  liq.appendChild(s);
  void s.offsetWidth; 
  s.classList.add('go');
  setTimeout(() => s.remove(), 1300);
}

function flashLiquid() {
  const b = document.getElementById('beaker');
  const f = document.createElement('div');
  f.style.cssText = 'position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 60%,#fff,transparent 62%);opacity:.8;z-index:5;pointer-events:none';
  b.appendChild(f);
  f.animate([{ opacity: .8 }, { opacity: 0 }], { duration: 450, easing: 'ease-out' });
  setTimeout(() => f.remove(), 500);
}

function shakeBeaker() {
  const w = document.querySelector('.beaker-wrap');
  w.classList.remove('shake');
  void w.offsetWidth;
  w.classList.add('shake');
  setTimeout(() => w.classList.remove('shake'), 600);
}

function heatGlow() {
  const glow = document.getElementById('glow');
  glow.style.background = 'radial-gradient(circle at 50% 80%,#ff9e4588,transparent 65%)';
  glow.style.opacity = .6;
  glow.animate([{ opacity: .2 }, { opacity: .7 }, { opacity: .35 }], { duration: 1400, iterations: 2, easing: 'ease-in-out' });
}

// Overflowing bubbles spilling over the sides of the beaker (Volcano foam)
function foamSpill() {
  const wrap = document.querySelector('.beaker-wrap');
  let t = 0;
  spillTimer = setInterval(() => {
    if (t++ > 55) { clearInterval(spillTimer); return; }
    for (let i = 0; i < 2; i++) {
      const f = document.createElement('div');
      f.className = 'foam-b';
      const side = Math.random() < .5 ? -1 : 1;
      const sz = 6 + Math.random() * 12;
      f.style.cssText += `width:${sz}px;height:${sz}px;top:-6px;left:${42 + Math.random() * 16}%`;
      wrap.appendChild(f);
      const dx = side * (18 + Math.random() * 45);
      const dur = 1300 + Math.random() * 600;
      f.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: .95 },
        { transform: `translate(${dx * 0.4}px,-16px) scale(1)`, opacity: 1, offset: .3 },
        { transform: `translate(${dx}px,95px) scale(.8)`, opacity: 0 }
      ], { duration: dur, easing: 'ease-in' });
      setTimeout(() => f.remove(), dur + 50);
    }
  }, 110);
}

// Thermometer value display update
function setTemp(t) {
  const valSpan = document.getElementById('tempVal');
  const fillDiv = document.getElementById('tempFill');
  if (valSpan) valSpan.textContent = Math.round(t) + '°C';
  if (fillDiv) fillDiv.style.width = Math.min(100, (t / 100) * 100) + '%';
}

// Toggle heating state using Bunsen burner
function toggleHeat() {
  heated = !heated;
  const burner = document.getElementById('burner');
  const tripod = document.getElementById('tripod');
  const btn = document.getElementById('heatBtn');
  
  if (burner) burner.classList.toggle('on', heated);
  if (tripod) tripod.classList.toggle('on', heated);
  if (btn) btn.textContent = heated ? '🔥 Изключи горелката' : '🔥 Загрей';

  clearInterval(heatRamp);
  if (heated) {
    heatRamp = setInterval(() => {
      heatTemp = Math.min(heatTemp + 4, 100);
      setTemp(heatTemp);
      if (heatTemp > 40) startSteam();
      if (heatTemp >= 70) applyHeatReaction();
    }, 300);
  } else {
    heatRamp = setInterval(() => {
      heatTemp = Math.max(heatTemp - 3, 20);
      setTemp(heatTemp);
      if (heatTemp <= 40) clearInterval(steamTimer);
      if (heatTemp <= 20) clearInterval(heatRamp);
    }, 300);
  }
}

// Rising steam animations
function startSteam() {
  if (steamTimer) return;
  const beaker = document.getElementById('beaker');
  steamTimer = setInterval(() => {
    const s = document.createElement('div');
    s.style.cssText = `position:absolute;top:8px;left:${30 + Math.random() * 40}%;width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;border-radius:50%;background:rgba(255,255,255,.4);filter:blur(2px);pointer-events:none;z-index:5`;
    beaker.appendChild(s);
    const d = 1600 + Math.random() * 800;
    s.animate([
      { transform: 'translateY(0) scale(.6)', opacity: .6 },
      { transform: `translateY(-90px) scale(1.6)`, opacity: 0 }
    ], { duration: d, easing: 'ease-out' });
    setTimeout(() => s.remove(), d);
  }, 200);
}

// Handle chemical changes triggered by heating (thermal decomposition)
function applyHeatReaction() {
  if (heatApplied || beakerSlots.length < 2) return;
  const key = beakerSlots.slice().sort().join('+');
  const norm = Object.keys(HEAT_REACTIONS).find(k => k.split('+').sort().join('+') === key);
  const hr = norm ? HEAT_REACTIONS[norm] : null;

  if (hr) {
    heatApplied = true;
    const liq = document.getElementById('liquid');
    liq.style.transition = 'background 1.6s';
    liq.style.background = hr.liquid;
    
    stopEffects();
    startSteam();
    swirlMix();
    shakeBeaker();
    flashLiquid();
    
    if (hr.ppt) startPrecipitate(hr.ppt);
    
    document.getElementById('rName').textContent = '🔥 ' + hr.name;
    document.getElementById('rEq').innerHTML = fmtEq(hr.eq);
    document.getElementById('rDesc').textContent = hr.desc;
    renderTags(hr);
  }
}

// Override original runReaction for clean resets on mixing
const originalRunReaction = runReaction;
runReaction = function() {
  heatApplied = false;
  heatTemp = 20;
  heated = false;
  const burner = document.getElementById('burner');
  const tripod = document.getElementById('tripod');
  const btn = document.getElementById('heatBtn');
  if (burner) burner.classList.remove('on');
  if (tripod) tripod.classList.remove('on');
  if (btn) btn.textContent = '🔥 Загрей';
  clearInterval(heatRamp);
  setTemp(20);
  originalRunReaction();
};

// Start binding shelf on page load
document.addEventListener('DOMContentLoaded', () => {
  renderReagentsShelf();
  renderSlots();
});
