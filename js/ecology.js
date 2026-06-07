/* ============================================================
   ХимиЛаб — Екология и бързи симулации (ecology.js)
   ============================================================ */

// --- 1. ПАРНИКОВ ЕФЕКТ ---
const co2S = document.getElementById('co2Slider');
function updGreenhouse() {
  if (!co2S) return;
  const ppm = +co2S.value;
  const co2Val = document.getElementById('co2Val');
  const ghTemp = document.getElementById('ghTemp');
  const ghVis = document.getElementById('ghVis');
  
  if (co2Val) co2Val.textContent = ppm;
  
  // Calculate simulated temperature rise
  const temp = (15 + (ppm - 280) * 0.011).toFixed(1);
  if (ghTemp) ghTemp.textContent = temp + '°C';
  
  const heat = (ppm - 280) / 620; // Scale 0 to 1
  if (ghVis) {
    ghVis.style.background = `linear-gradient(180deg,
      hsl(${210 - heat * 40}, ${60 + heat * 20}%, ${30 + heat * 8}%),
      hsl(${30 + heat * 10}, ${50 + heat * 25}%, ${40 + heat * 15}%))`;
  }
}

// --- 2. КИСЕЛИНЕН ДЪЖД ---
const phS = document.getElementById('phSlider');
function updRain() {
  if (!phS) return;
  const ph = (phS.value / 10).toFixed(1);
  const phVal = document.getElementById('phVal');
  const rainPh = document.getElementById('rainPh');
  const marble = document.getElementById('marble');
  const rainVis = document.getElementById('rainVis');

  if (phVal) phVal.textContent = ph;
  if (rainPh) rainPh.textContent = ph;

  // Acid threshold triggers marble erosion animation
  const acidic = ph < 4.5;
  if (marble) marble.classList.toggle('eroded', acidic);
  
  if (rainVis) {
    rainVis.style.background = ph < 4 
      ? 'linear-gradient(#5a3a3a,#3a2020)' 
      : ph < 5.5 
        ? 'linear-gradient(#3a4a5e,#243b5e)' 
        : 'linear-gradient(#243b5e,#16263f)';
  }
}

// --- 3. ФИЛТЪР ЗА ВОДА ---
function filterWater() {
  const dirty = document.getElementById('dirtyW');
  const clean = document.getElementById('cleanW');
  if (!dirty || !clean) return;

  dirty.style.background = '#6b5a3a';
  clean.style.background = '#2a4a6e';
  clean.parentElement.querySelector('small').textContent = 'пречистена';

  setTimeout(() => {
    dirty.style.background = '#4a4030';
    clean.style.background = '#3b82d6';
  }, 400);

  setTimeout(() => {
    clean.style.background = '#5fc4ff';
    clean.parentElement.querySelector('small').textContent = 'чиста ✓';
  }, 1000);
}

// --- 4. ЕКОЛОГИЧЕН КВИЗ ---
let qIdx = 0;
function renderQuiz() {
  const qText = document.getElementById('qText');
  const opts = document.getElementById('qOpts');
  const qFeedback = document.getElementById('qFeedback');
  const qNext = document.getElementById('qNext');

  if (!qText || !opts) return;

  const q = QUIZ[qIdx];
  qText.textContent = `${qIdx + 1}. ${q.q}`;
  opts.innerHTML = '';
  if (qFeedback) qFeedback.textContent = '';
  if (qNext) qNext.style.display = 'none';

  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'q-opt';
    b.textContent = o;
    b.onclick = () => {
      document.querySelectorAll('.q-opt').forEach(x => x.style.pointerEvents = 'none');
      if (i === q.a) {
        b.classList.add('correct');
        if (qFeedback) qFeedback.textContent = q.fb;
      } else {
        b.classList.add('wrong');
        const correctBtn = document.querySelectorAll('.q-opt')[q.a];
        if (correctBtn) correctBtn.classList.add('correct');
        if (qFeedback) qFeedback.textContent = 'Не съвсем. ' + q.fb;
      }
      if (qNext) qNext.style.display = qIdx < QUIZ.length - 1 ? 'inline-flex' : 'none';
      if (qIdx >= QUIZ.length - 1 && qFeedback) {
        qFeedback.textContent += ' 🎉 Завърши теста! Натисни тук за нов кръг.';
        qFeedback.style.cursor = 'pointer';
      }
    };
    opts.appendChild(b);
  });
}

function nextQuiz() {
  qIdx = (qIdx + 1) % QUIZ.length;
  renderQuiz();
}

// Listeners and startup
document.addEventListener('DOMContentLoaded', () => {
  if (co2S) {
    co2S.addEventListener('input', updGreenhouse);
    updGreenhouse();
  }
  if (phS) {
    phS.addEventListener('input', updRain);
    updRain();
  }
  renderQuiz();

  const qFeedback = document.getElementById('qFeedback');
  if (qFeedback) {
    qFeedback.addEventListener('click', () => {
      if (qIdx >= QUIZ.length - 1) {
        qIdx = 0;
        renderQuiz();
      }
    });
  }
});
