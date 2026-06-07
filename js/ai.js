/* ============================================================
   ХимиЛаб — AI Помощник Проф. Реактив (ai.js)
   ============================================================ */

let aiRole = 'student';
let chatHistory = [];

function roleSystem() {
  const base = `Ти си "Проф. Реактив" — приятелски настроен учител по химия в българско училище. Винаги отговаряй на български език. Пиши химичните формули с долни индекси чрез HTML <sub> таг (напр. H<sub>2</sub>O, CO<sub>2</sub>, CaCO<sub>3</sub>). Можеш да удебеляваш ключови думи с <b></b>. Не използвай markdown със звездички или решетки — само обикновен текст с <b> и <sub>. Бъди насърчителен, точен и кратък.`;
  if (aiRole === 'student') {
    return base + ` Говориш с УЧЕНИК от 5–10 клас. Обяснявай просто, с примери от ежедневието и аналогии. Избягвай сложна терминология без обяснение. Когато е подходящо, предлагай безопасен опит, който може да направи във виртуалната лаборатория. Винаги напомняй за безопасност при реални опити.`;
  }
  return base + ` Говориш с УЧИТЕЛ. Можеш да използваш професионална терминология, да предлагаш методически идеи, планове на уроци, тестове с верни отговори, критерии за оценяване и демонстрационни опити, съобразени с българската учебна програма по „Химия и опазване на околната среда“.`;
}

function addMsg(role, html) {
  const messagesEl = document.getElementById('messages');
  if (!messagesEl) return null;
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = html;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return d;
}

function showTyping() {
  const messagesEl = document.getElementById('messages');
  if (!messagesEl) return;
  const t = document.createElement('div');
  t.className = 'typing';
  t.id = 'typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(t);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function escapeUser(s) {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendMsg(preset) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = (preset || input.value).trim();
  if (!text) return;
  
  input.value = '';
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  addMsg('user', escapeUser(text));
  chatHistory.push({ role: 'user', content: text });
  showTyping();

  const statusEl = document.getElementById('aiStatus');
  if (statusEl) statusEl.textContent = '● мисли...';

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        // Notice: Normally Anthropic API requires key authorization headers.
        // We preserve the exact call behavior of the original file.
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: roleSystem(),
        messages: chatHistory
      })
    });
    
    const data = await resp.json();
    hideTyping();
    let reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!reply) reply = 'Извинявай, нещо се обърка. Опитай пак с друг въпрос.';
    
    chatHistory.push({ role: 'assistant', content: reply });
    addMsg('bot', sanitize(reply));
  } catch (e) {
    hideTyping();
    addMsg('bot', '⚠️ В момента не мога да се свържа. Провери връзката и опитай отново. Междувременно разгледай готовите опити в лабораторията!');
  }

  if (sendBtn) sendBtn.disabled = false;
  if (statusEl) statusEl.textContent = '● онлайн · отговаря на български';
  input.focus();
}

// Allow only <b> and <sub>, escape the rest
function sanitize(s) {
  let safe = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  safe = safe.replace(/&lt;(\/?)(b|sub)&gt;/g, '<$1$2>');
  return safe.replace(/\n/g, '<br>');
}

function renderQuickQs() {
  const wrap = document.getElementById('quickQs');
  if (!wrap) return;
  wrap.innerHTML = '';
  QUICKQS[aiRole].forEach(q => {
    const b = document.createElement('button');
    b.className = 'quick-q';
    b.textContent = q;
    b.onclick = () => sendMsg(q);
    wrap.appendChild(b);
  });
}

// Initialize AI Role Bindings
document.addEventListener('DOMContentLoaded', () => {
  const roleToggle = document.getElementById('roleToggle');
  if (roleToggle) {
    roleToggle.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      aiRole = b.dataset.role;
      document.querySelectorAll('#roleToggle button').forEach(x => x.classList.toggle('active', x === b));
      document.getElementById('roleHint').textContent = aiRole === 'student'
        ? 'Обясненията ще са опростени и подходящи за твоята възраст.'
        : 'Ще получаваш методически идеи, тестове и планове на уроци.';
      renderQuickQs();
    });
  }
  
  renderQuickQs();
  
  // Welcome greeting message
  setTimeout(() => {
    addMsg('bot', 'Здравей! 👋 Аз съм <b>Проф. Реактив</b>, твоят помощник по химия. Питай ме каквото и да е — за елементи, реакции, формули или опазване на околната среда. Мога и да ти дам тест или идея за опит! 🧪');
  }, 100);
});
