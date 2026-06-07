/* ============================================================
   ХимиЛаб — Периодична Таблица (ptable.js)
   ============================================================ */

const ptEl = document.getElementById('ptableGrid');
const ptFiltersEl = document.getElementById('ptFilters');
let activeFilter = 'all';
let currentEl = null;

// Determine grid row and column based on atomic number Z (standard 18-column grid layout)
function elPos(z) {
  let r, c;
  if (z === 1) { r = 1; c = 1; }
  else if (z === 2) { r = 1; c = 18; }
  else if (z <= 4) { r = 2; c = z - 2; } // Li, Be
  else if (z <= 10) { r = 2; c = z + 8; } // B..Ne
  else if (z <= 12) { r = 3; c = z - 10; } // Na, Mg
  else if (z <= 18) { r = 3; c = z; } // Al..Ar
  else if (z <= 36) { r = 4; c = z - 18; } // K..Kr
  else if (z <= 54) { r = 5; c = z - 36; } // Rb..Xe
  else if (z === 55 || z === 56) { r = 6; c = z - 54; } // Cs, Ba
  else if (z >= 57 && z <= 71) { r = 9; c = z - 54; } // Lanthanides (La-Lu)
  else if (z <= 86) { r = 6; c = z - 68; } // Hf..Rn
  else if (z === 87 || z === 88) { r = 7; c = z - 86; } // Fr, Ra
  else if (z >= 89 && z <= 103) { r = 10; c = z - 86; } // Actinides (Ac-Lr)
  else { r = 7; c = z - 100; } // Rf..Og
  return { r, c };
}

// Generate the Periodic Table Grid
function renderPTable() {
  if (!ptEl) return;
  ptEl.innerHTML = '';

  // Lanthanides & Actinides spacing gap markers (Row 6 Col 3, Row 7 Col 3)
  const markers = [
    { r: 6, c: 3, t: '57–71' },
    { r: 7, c: 3, t: '89–103' }
  ];

  ELEMENTS.forEach(([z, sym, name, mass, cat]) => {
    const { r, c } = elPos(z);
    const cell = document.createElement('div');
    const ci = CATS[cat] || { color: 'var(--panel)', t: 'var(--text)' };

    cell.className = 'el';
    cell.style.gridColumn = c;
    cell.style.gridRow = r;
    cell.style.background = ci.color;
    cell.style.color = ci.t;

    // Filter dimming
    if (activeFilter !== 'all' && cat !== activeFilter) {
      cell.classList.add('dim');
    }

    cell.innerHTML = `
      <span class="num">${z}</span>
      <span class="sym">${sym}</span>
      <span class="nm">${name}</span>
    `;
    
    cell.onclick = () => openElement(z);
    ptEl.appendChild(cell);
  });

  // Render range indicators for Lanthanides and Actinides rows
  markers.forEach(m => {
    const d = document.createElement('div');
    d.className = 'el placeholder';
    d.style.gridColumn = m.c;
    d.style.gridRow = m.r;
    d.style.cssText += ';display:flex;align-items:center;justify-content:center;font-size:.55rem;color:var(--muted);border:1px dashed var(--line);background:transparent;pointer-events:none';
    d.textContent = m.t;
    d.classList.remove('placeholder');
    ptEl.appendChild(d);
  });
}

// Initialize Category Filters
function initPTableFilters() {
  if (!ptFiltersEl) return;
  ptFiltersEl.innerHTML = '';

  // "All" Filter Button
  const allBtn = document.createElement('button');
  allBtn.className = 'pt-filter active';
  allBtn.textContent = 'Всички';
  allBtn.onclick = () => {
    activeFilter = 'all';
    setActiveFilterClass(allBtn);
    renderPTable();
  };
  ptFiltersEl.appendChild(allBtn);

  // Group Categories Buttons
  Object.entries(CATS).forEach(([key, val]) => {
    const btn = document.createElement('button');
    btn.className = 'pt-filter';
    btn.innerHTML = `<span class="dot" style="background:${val.color}"></span>${val.label}`;
    btn.onclick = () => {
      activeFilter = key;
      setActiveFilterClass(btn);
      renderPTable();
    };
    ptFiltersEl.appendChild(btn);
  });
}

function setActiveFilterClass(activeBtn) {
  document.querySelectorAll('.pt-filter').forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

// Modal view handlers for element details
function openElement(z) {
  const match = ELEMENTS.find(e => e[0] === z);
  if (!match) return;
  const [, sym, name, mass, cat] = match;

  currentEl = { z, sym, name, cat, mass };
  const ci = CATS[cat] || { label: 'Други', color: '#ccc', t: '#000' };
  const pos = elPos(z);

  // Detail Modal Elements
  const mBig = document.getElementById('mBig');
  mBig.style.background = ci.color;
  mBig.style.color = ci.t;
  
  document.getElementById('mSym').textContent = sym;
  document.getElementById('mNum').textContent = '№ ' + z;
  document.getElementById('mName').textContent = name;
  document.getElementById('mCat').textContent = ci.label;
  document.getElementById('mMass').textContent = mass;

  // Compute periodic group & period
  let group = pos.r <= 7 && (cat !== 'lanthanide' && cat !== 'actinide') ? pos.c : '—';
  const period = (cat === 'lanthanide') ? 6 : (cat === 'actinide') ? 7 : pos.r;
  document.getElementById('mGroup').textContent = group;
  document.getElementById('mPeriod').textContent = period;

  // Retrieve Element description & applications
  const det = ELDETAIL[sym];
  document.getElementById('mDesc').textContent = det ? det.d : `${name} е химичен елемент с пореден номер №${z}, принадлежащ към групата на „${ci.label.toLowerCase()}“.`;
  document.getElementById('mUses').innerHTML = det ? `<b>Приложения:</b> ${det.u}` : '<b>Приложения:</b> научно изследване, експерименти.';

  document.getElementById('elModal').classList.add('open');

  // Ensure modal-body uses flex layout for side-by-side layout
  const modalBody = document.querySelector('.modal-body');
  if (modalBody) {
    modalBody.style.display = 'flex';
    modalBody.style.flex = '1';
    modalBody.style.overflow = 'hidden';
  }

  // Launch Three.js 3D Atom model rendering
  setTimeout(() => {
    const canvasContainer = document.getElementById('atom3dCanvas');
    if (canvasContainer) {
      init3DScene(canvasContainer);
      updateAtomStructure(z, mass, cat);
      
      // Bind button controls in modal
      document.getElementById('atomPauseBtn').textContent = '⏸ Пауза';
      document.getElementById('atomPauseBtn').onclick = () => {
        isPlaying = !isPlaying;
        toggleAtomPlay(isPlaying);
        document.getElementById('atomPauseBtn').textContent = isPlaying ? '⏸ Пауза' : '▶ Пусни';
      };
      
      document.getElementById('atomResetBtn').onclick = () => {
        resetAtomView();
      };
    }
  }, 50);
}

function closeModal() {
  document.getElementById('elModal').classList.remove('open');
  cleanup3D();
}

// Ask AI about this element from the modal button
function askAboutElement() {
  if (!currentEl) return;
  closeModal();
  go('ai');
  setTimeout(() => {
    sendMsg(`Разкажи ми за химичния елемент ${currentEl.name} (${currentEl.sym}) — свойства, интересни факти и приложения, обяснено просто.`);
  }, 300);
}

// Initialize element search input
function initPTableSearch() {
  const searchInput = document.getElementById('elementSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    const cells = document.querySelectorAll('#ptable .el:not(.placeholder)');
    
    cells.forEach(cell => {
      const sym = cell.querySelector('.sym').textContent.toLowerCase();
      const name = cell.querySelector('.nm').textContent.toLowerCase();
      const num = cell.querySelector('.num').textContent.toLowerCase();
      
      if (!val || sym.includes(val) || name.includes(val) || num === val) {
        cell.classList.remove('dim-search');
      } else {
        cell.classList.add('dim-search');
      }
    });
  });
}

// Bind modal backdrop click
document.getElementById('elModal').addEventListener('click', (e) => {
  if (e.target.id === 'elModal') closeModal();
});

// Startup bindings
document.addEventListener('DOMContentLoaded', () => {
  renderPTable();
  initPTableFilters();
  initPTableSearch();
});
