/* Cards are rendered from the editable local question bank. No build step. */
(function renderQuestionBank() {
  'use strict';
  const labels = {1:'означення', 2:'приклади', 3:'доведення', 4:'доведення'};
  const notes = {1:'Дати означення або сформулювати. В обраному варіанті — два питання.',
    2:'Навести приклад. У всіх задачах k — номер твого варіанту, від 1 до 100.',
    3:'Написати повне доведення. Нижче — короткий скелет та розгорнуте пояснення.',
    4:'Написати повне доведення. Для еліпса й гіперболи — в обидва боки.'};
  for (const level of [1,2,3,4]) {
    const section = document.createElement('section');
    section.className = 'level'; section.id = 'lvl' + level;
    section.innerHTML = `<h2 class="sticky">Nivel ${level} · ${labels[level]}</h2><p class="note">${notes[level]}</p><div class="cards"></div>`;
    for (const q of QUESTION_BANK.filter(q => q.level === level)) {
      const article = document.createElement('article');
      article.className = 'q'; article.dataset.l = level; article.dataset.n = q.number;
      article.innerHTML = `<header><span class="tag">N${level}·${q.number}</span><h3>${q.title}</h3><span class="pts">${labels[level]}</span></header>` +
        (q.condition ? `<div class="condition"><div class="lbl">Умова</div><p>${q.condition}</p></div>` : '') +
        (level === 2 ? `<div class="params" data-q-params="${q.number}"></div>` : '') +
        `<div class="skel"><div class="lbl">${level === 1 ? 'Означення / формулювання' : 'Скелет відповіді'}</div><div>${q.skeleton}</div></div>` +
        (q.answer ? `<details class="full"><summary>${level >= 3 ? '<span class="when-closed">Показати повну відповідь</span><span class="when-open">Сховати повну відповідь</span>' : 'Повна відповідь'}</summary>${q.answer}</details>` : '') +
        (q.trap ? `<div class="trap"><b>Зверни увагу.</b> ${q.trap}</div>` : '');
      section.querySelector('.cards').appendChild(article);
    }
    document.getElementById('levels').appendChild(section);
  }
})();
(function(){
  var COUNTS = {1:23, 2:9, 3:7, 4:4};
  var PICK = {1:2, 2:2, 3:1, 4:1};
  var KEY = 'algebra-colloq-sel-v1';
  var sel = {1:[],2:[],3:[],4:[]};
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) sel = saved; } catch(e) {}


  // Treat browser storage as optional; discard malformed or out-of-range values.
  [1,2,3,4].forEach(function(l) {
    sel[l] = Array.isArray(sel[l]) ? Array.from(new Set(sel[l].filter(n => Number.isInteger(n) && n >= 1 && n <= COUNTS[l]))).slice(-PICK[l]) : [];
  });
  var variantK = null;
  try { const k = Number(localStorage.getItem('algebra-variant-k')); if (k >= 1 && k <= 100 && Number.isInteger(k)) variantK = k; } catch (_) {}
  var mathQueue = Promise.resolve();
  function typeset(el) {
    if (!window.MathJax || !MathJax.startup) return;
    mathQueue = mathQueue.then(() => MathJax.startup.promise).then(() => MathJax.typesetPromise([el])).catch(function(error) { console.warn('Math typesetting:', error); });
  }
  var cards = {};
  document.querySelectorAll('article.q').forEach(function(a){
    cards[a.dataset.l + '-' + a.dataset.n] = { el: a, home: a.parentNode };
    a.id = 'n' + a.dataset.l + '-' + a.dataset.n;
  });

  function save(){ try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch(e) {} }

  function render(){
    document.querySelectorAll('.chip').forEach(function(c){
      var on = sel[c.dataset.l].indexOf(+c.dataset.n) !== -1;
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Object.keys(cards).forEach(function(k){
      var p = k.split('-');
      cards[k].el.classList.toggle('sel', sel[p[0]].indexOf(+p[1]) !== -1);
    });
    document.getElementById('selectionStatus').textContent = [1,2,3,4].map(l => 'N' + l + ': ' + sel[l].length + '/' + PICK[l]).join(' · ');
  }

  document.querySelectorAll('.chips').forEach(function(box){
    var l = box.dataset.level;
    for (var i = 1; i <= COUNTS[l]; i++) {
      var b = document.createElement('button');
      b.className = 'chip'; b.textContent = i; b.dataset.l = l; b.dataset.n = i;
      b.id = 'chip-' + l + '-' + i; b.type = 'button'; b.setAttribute('aria-label', 'Nivel ' + l + ', завдання ' + i);
      b.addEventListener('click', function(){
        var L = this.dataset.l, N = +this.dataset.n, arr = sel[L], idx = arr.indexOf(N);
        if (idx === -1) { if (arr.length >= PICK[L]) arr.shift(); arr.push(N); } else arr.splice(idx, 1);
        markManualSelection();
        save(); render(); if (document.body.classList.contains('copy')) fillCopy();
      });
      box.appendChild(b);
    }
  });

  var copyList = document.getElementById('copyList');
  var copyBtn = document.getElementById('copyBtn');
  var copyFullBtn = document.getElementById('copyFullBtn');

  function selectedProofAnswers(){
    return Array.from(copyList.querySelectorAll('article[data-l="3"] details.full, article[data-l="4"] details.full'));
  }
  function syncCopyAnswerButton(){
    var answers = selectedProofAnswers();
    var allOpen = answers.length > 0 && answers.every(answer => answer.open);
    copyFullBtn.disabled = answers.length === 0;
    copyFullBtn.setAttribute('aria-pressed', allOpen ? 'true' : 'false');
    copyFullBtn.textContent = allOpen ? 'Сховати повні відповіді' : 'Показати повні відповіді';
  }
  copyFullBtn.addEventListener('click', function(){
    var answers = selectedProofAnswers();
    var shouldOpen = !answers.every(answer => answer.open);
    answers.forEach(answer => { answer.open = shouldOpen; });
    syncCopyAnswerButton();
  });
  // Native details toggles do not bubble; capture also observes individual controls.
  copyList.addEventListener('toggle', syncCopyAnswerButton, true);


  function restoreHomes(){
    Array.prototype.slice.call(copyList.querySelectorAll('article.q')).forEach(function(a){
      var c = cards[a.dataset.l + '-' + a.dataset.n];
      var sibs = c.home.querySelectorAll('article.q'), placed = false;
      for (var i = 0; i < sibs.length; i++) {
        if (+sibs[i].dataset.n > +a.dataset.n) { c.home.insertBefore(a, sibs[i]); placed = true; break; }
      }
      if (!placed) c.home.appendChild(a);
    });
    copyList.innerHTML = '';
  }

  function fillCopy(){
    restoreHomes();
    var any = false;
    [4,3,2,1].forEach(function(l){
      sel[l].slice().sort(function(a,b){return a-b;}).forEach(function(n){
        var c = cards[l + '-' + n]; if (c) { copyList.appendChild(c.el); any = true; }
      });
    });
    typeset(copyList);
    if (!any) {
      var p = document.createElement('p'); p.className = 'empty';
      p.textContent = 'Нічого не вибрано. Натисни номери питань у панелі «Мій варіант» вище.';
      copyList.appendChild(p);
    }
    syncCopyAnswerButton();
  }

  function setCopy(on){
    document.body.classList.toggle('copy', on);
    copyBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { setTrain(false); fillCopy(); document.getElementById('copyHead').scrollIntoView({block:'start'}); }
    else restoreHomes();
  }
  copyBtn.addEventListener('click', function(){ setCopy(!document.body.classList.contains('copy')); });
  document.getElementById('showSel').addEventListener('click', function(){ setCopy(true); });
  document.getElementById('editVariant').addEventListener('click', function(){ setCopy(false); document.getElementById('pickTitle').scrollIntoView({block:'start'}); });


  /* The supplied mod* rules determine both task numbers and N2 values. */
  const input = document.getElementById('variantInput');
  const result = document.getElementById('variantResult');
  const errorBox = document.getElementById('variantError');
  function markManualSelection() {
    if (!result.hidden) {
      result.innerHTML = '<h3>Ручний вибір · значення N2 для k = ' + variantK + '</h3><div class="result-grid">' + [1,2,3,4].map(l => '<div class="result-item"><b>Nivel '+l+'</b>' + (sel[l].map(n => '<a href="#n'+l+'-'+n+'" data-task-link="true">№'+n+'</a>').join(' і ') || 'Не обрано') + '</div>').join('') + '</div>';
    }
  }
  function matrix(rows) { return String.raw`\begin{pmatrix}` + rows.map(row => row.join('&')).join(String.raw`\\`) + String.raw`\end{pmatrix}`; }
  function fraction(a,b) {
    function gcd(x,y) { return y ? gcd(y,x%y) : x; }
    const g = gcd(Math.abs(a),b); a/=g; b/=g;
    return b === 1 ? String(a) : (a<0?'-':'') + String.raw`\frac{${Math.abs(a)}}{${b}}`;
  }
  function parameterMarkup(n,k,training) {
    if (!k) return 'Введи номер варіанту k вище, щоб побачити свої числові значення.';
    const p = Variant.parameters(k);
    const heading = '<b>Твої значення · k = ' + k + '</b><p>';
    if (training) {
      const values = {
        1: String.raw`\(d=${p.d}\). Кільце повинно містити \(1/${p.d}\).`,
        2: String.raw`Заборонене число: \(p=${p.p4}\).`,
        3: String.raw`\(a=${p.a}\), \(b=${p.b}\), \(z=${p.a}+${p.b}i\).`,
        4: String.raw`\(m=${p.m8}\): потрібно \(z^{${p.m8}}=\bar z\).`,
        5: String.raw`\(p=${p.p}\), \(q=${p.q}\). Вільні члени: \((${p.p+1},${p.p},${p.p-1})^T\) та \((${p.q-1},${p.q},${p.q+1})^T\).`,
        6: String.raw`Заданий рядок: \((${p.row.join(',')})\).`,
        7: String.raw`\(m=${p.p4}\). Потрібно рівно ${p.factors} елементарних множників.`,
        8: String.raw`\(r=${p.r}\), \(s=${p.s}\), \(t=${p.t}\): потрібно \((ABC)_{${p.r},${p.s}}=${p.t}\).`,
        9: `Потрібно ${p.vectors} вектори та ${p.combinations} різні лінійні комбінації.`
      };
      return heading + values[n] + '</p>';
    }
    let text = '';
    switch (n) {
      case 1: text = String.raw`\(d=${p.d}\). Кільце має містити \(1/${p.d}\). Приклад: \(\mathbb Z[1/${p.d}]\).`; break;
      case 2: text = String.raw`\(p=${p.p4}\), \(d=${p.p4+1}\). Не повинно містити ${p.p4}. Приклад: \(M=\{0,${p.p4+1},${2*(p.p4+1)},${3*(p.p4+1)},\ldots\}\) з додаванням.`; break;
      case 3: text = String.raw`\(a=${p.a}\), \(b=${p.b}\), \(z=${p.a}+${p.b}i\). Рівняння: \(x^2-${2*p.a}x+${p.a*p.a+p.b*p.b}=0\).`; break;
      case 4: text = String.raw`\(m=${p.m8}\), отже \(z^{${p.m8}}=\bar z\). Обери \(z=\cos\frac{2\pi}{${p.m8+1}}+i\sin\frac{2\pi}{${p.m8+1}}\).`; break;
      case 5: text = String.raw`\(p=${p.p}\), \(q=${p.q}\). Сумісна при \(b=(${p.p+1},${p.p},${p.p-1})^T\); несумісна при \(c=(${p.q-1},${p.q},${p.q+1})^T\). \[A=${matrix([[p.p+1,1,p.p+2],[p.p,0,p.p],[p.p-1,2,p.p+1]])}.\]`; break;
      case 6: {
        const [a,b,c]=p.row;
        text = String.raw`Потрібний рядок: \((${a},${b},${c})\). \[A=${matrix([[a,b,c],[0,1,0],[0,0,1]])},\quad A^{-1}=${matrix([[fraction(1,a),fraction(-b,a),fraction(-c,a)],[0,1,0],[0,0,1]])}.\]`; break;
      }
      case 7: text = String.raw`\(m=${p.p4}\). Рівно ${p.factors} елементарних множників: ${p.p4} шт. T, одна P та одна D. \[A=T^{${p.p4}}PD=${matrix([[2*p.p4,1,0],[2,0,0],[0,0,1]])}.\]`; break;
      case 8: {
        const u=p.s===2?12:15, v=p.s===2?26:33;
        const rows=[[10,11],[20,21],[30,31]];
        rows[p.r-1][1]=fraction(p.t-10*p.r*u,v);
        text = String.raw`\(r=${p.r}\), \(s=${p.s}\), \(t=${p.t}\). Потрібно \((ABC)_{${p.r},${p.s}}=${p.t}\). Для B, C зі скелета: \[A=${matrix(rows)}.\]`; break;
      }
      case 9: text = String.raw`Потрібно ${p.vectors} вектори та ${p.combinations} різні комбінації. Візьми \(${Array.from({length:p.vectors},(_,i)=>'v_'+(i+1)+'=(1,'+(i+1)+')').join(',\ ')}\). Значення \(\ell=0,\ldots,${p.combinations-1}\) у формулі нижче дають усі потрібні комбінації.`; break;
    }
    return heading + text + '</p>';
  }
  function refreshParameters() {
    document.querySelectorAll('[data-q-params]').forEach(el => { if (window.MathJax && MathJax.typesetClear) MathJax.typesetClear([el]); el.innerHTML = parameterMarkup(Number(el.dataset.qParams),variantK,!!el.closest('#trArea')); });
    typeset(document.getElementById('levels'));
    if (document.body.classList.contains('copy')) typeset(copyList);
  }
  function displayResult(k) {
    const values = Variant.calculate(k);
    result.hidden = false;
    result.innerHTML = '<h3>Варіант ' + k + ' · твої 6 завдань</h3><div class="result-grid">' + [1,2,3,4].map(l => {
      const formula = l===1 ? k+' mod* 23; '+(k+12)+' mod* 23' : l===2 ? k+' mod* 9; '+(k+5)+' mod* 9' : k+' mod* '+(l===3?7:4);
      return '<div class="result-item"><b>Nivel '+l+'</b>'+values[l].map(n=>'<a href="#n'+l+'-'+n+'" data-task-link="true" aria-label="Перейти до Nivel '+l+', завдання '+n+'">№'+n+'</a>').join(' і ')+'<small>'+formula+'</small></div>';
    }).join('') + '</div>';
  }
  function calculateInput(start) {
    const raw = input.value.trim();
    const k = Number(raw);
    try {
      if (!raw) throw new RangeError('Введи цілий номер варіанту від 1 до 100.');
      const next = Variant.calculate(k);
      variantK = k; sel = next;
      errorBox.hidden = true; input.removeAttribute('aria-invalid');
      try { localStorage.setItem('algebra-variant-k',String(k)); } catch (_) {}
      save(); render(); displayResult(k); refreshParameters();
      if (document.body.classList.contains('copy')) fillCopy();
      if (document.body.classList.contains('train')) buildDeck();
      if (start) { resetTimer(); startTimer(); setCopy(true); }
      return true;
    } catch (error) {
      errorBox.textContent = error.message; errorBox.hidden = false;
      input.setAttribute('aria-invalid','true'); input.focus(); return false;
    }
  }
  document.getElementById('variantForm').addEventListener('submit',function(e) { e.preventDefault(); calculateInput(false); });
  document.getElementById('calcStart').addEventListener('click',() => calculateInput(true));
  result.addEventListener('click',function(e) {
    if (!e.target.closest('[data-task-link]')) return;
    setCopy(false); setTrain(false);
  });
  document.getElementById('rand').addEventListener('click',function() {
    input.value = Math.floor(Math.random()*100)+1; calculateInput(true);
  });
  document.getElementById('clear').addEventListener('click',function() {
    sel = {1:[],2:[],3:[],4:[]}; variantK = null;
    input.value = ''; result.hidden = true; errorBox.hidden = true;
    input.removeAttribute('aria-invalid');
    try { localStorage.removeItem('algebra-variant-k'); } catch (_) {}
    save(); render(); refreshParameters();
    if (document.body.classList.contains('copy')) fillCopy();
    if (document.body.classList.contains('train')) buildDeck();
  });
  document.getElementById('printBtn').addEventListener('click',() => window.print());
  document.getElementById('themeBtn').addEventListener('click',function() {
    const isDark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const theme = isDark ? 'light' : 'dark'; document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('algebra-theme',theme); } catch (_) {}
  });

  /* A deadline keeps the timer accurate when a tab sleeps or runs in background. */
  const T = 420;
  let left = T, tick = null, deadline = 0;
  const tEl = document.getElementById('timer'), tStart = document.getElementById('tStart');
  function show() {
    tEl.classList.toggle('low',left > 0 && left <= 60);
    tEl.classList.toggle('done',left === 0);
    tEl.textContent = left === 0 ? 'Час вийшов' : Math.floor(left/60) + ':' + String(left%60).padStart(2,'0');
  }
  function updateTimer() {
    left = Math.max(0,Math.ceil((deadline-Date.now())/1000)); show();
    if (left === 0) {
      clearInterval(tick); tick = null; tStart.textContent = 'Старт 7 хв';
      document.getElementById('announcement').textContent = '7 хвилин минули. Час підготовки завершився.';
    }
  }
  function startTimer() {
    if (tick || left === 0) return;
    deadline = Date.now()+left*1000; tick = setInterval(updateTimer,250); tStart.textContent = 'Пауза';
  }
  function pauseTimer() { updateTimer(); clearInterval(tick); tick = null; tStart.textContent = left ? 'Далі' : 'Старт 7 хв'; }
  function resetTimer() { clearInterval(tick); tick = null; left = T; tStart.textContent = 'Старт 7 хв'; document.getElementById('announcement').textContent = ''; show(); }
  tStart.addEventListener('click',function() { if (tick) pauseTimer(); else { if (left === 0) left = T; startTimer(); } });
  document.getElementById('tReset').addEventListener('click',resetTimer);

  /* training mode: flashcards with self-rating */
  var PKEY = 'algebra-colloq-progress-v1', TKEY = 'algebra-colloq-train-v1';
  var prog = {}, tcfg = {lv:[1,2,3,4], mode:'all'};
  try { prog = JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch(e) { prog = {}; }
  try { var tc = JSON.parse(localStorage.getItem(TKEY) || 'null'); if (tc && typeof tc === 'object' && !Array.isArray(tc)) tcfg = tc; } catch(e) {}
  if (!prog || typeof prog !== 'object' || Array.isArray(prog)) prog = {};
  Object.keys(prog).forEach(k => { if (!cards[k] || !['ok','mid','bad'].includes(prog[k])) delete prog[k]; });
  tcfg.lv = Array.isArray(tcfg.lv) ? Array.from(new Set(tcfg.lv.filter(l => [1,2,3,4].includes(l)))) : [1,2,3,4];
  if (!tcfg.lv.length) tcfg.lv = [1,2,3,4];
  if (!['all','weak','new'].includes(tcfg.mode)) tcfg.mode = 'all';
  function saveProg(){ try { localStorage.setItem(PKEY, JSON.stringify(prog)); } catch(e) {} }
  function saveCfg(){ try { localStorage.setItem(TKEY, JSON.stringify(tcfg)); } catch(e) {} }

  var ST_LABEL = {ok:'Знаю', mid:'Частково', bad:'Не знаю'};
  var LNAME = {1:'N1 · означення', 2:'N2 · приклади', 3:'N3 · доведення', 4:'N4 · доведення'};
  Object.keys(cards).forEach(function(k){
    var d = document.createElement('span');
    cards[k].el.querySelector('header').appendChild(d);
    cards[k].st = d;
  });
  function paintDots(){
    Object.keys(cards).forEach(function(k){
      var s = prog[k];
      cards[k].st.className = 'st' + (s ? ' ' + s : '');
      cards[k].st.title = s ? ST_LABEL[s] : 'Ще не тренував';
    });
  }

  function stats(){
    var box = document.getElementById('trStats'); box.innerHTML = '';
    [1,2,3,4].forEach(function(l){
      var c = {ok:0, mid:0, bad:0, none:0}, t = COUNTS[l];
      for (var i = 1; i <= t; i++) c[prog[l + '-' + i] || 'none']++;
      var div = document.createElement('div'); div.className = 'tr-stat';
      div.innerHTML = '<div>' + LNAME[l] + ': <b>' + c.ok + '/' + t + '</b> знаю</div>' +
        '<div class="meter"><i class="m-ok" style="width:' + (c.ok / t * 100) + '%"></i>' +
        '<i class="m-mid" style="width:' + (c.mid / t * 100) + '%"></i>' +
        '<i class="m-bad" style="width:' + (c.bad / t * 100) + '%"></i></div>';
      box.appendChild(div);
    });
  }

  function shuffle(a){
    for (var j = a.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[r]; a[r] = t; }
    return a;
  }

  var queue = [], cur = null, shown = 0, revealFn = null;
  function eligible(k){
    var s = prog[k];
    if (tcfg.mode === 'weak') return s === 'bad' || s === 'mid';
    if (tcfg.mode === 'new') return !s;
    return true;
  }
  function buildDeck(){
    var keys = [];
    tcfg.lv.forEach(function(l){ for (var i = 1; i <= COUNTS[l]; i++) { var k = l + '-' + i; if (eligible(k)) keys.push(k); } });
    queue = shuffle(keys); shown = 0; nextCard();
  }

  function rate(s){
    if (!cur) return;
    prog[cur] = s; saveProg(); paintDots(); stats();
    if (s === 'bad') queue.splice(Math.min(3, queue.length), 0, cur);
    else if (s === 'mid') queue.splice(Math.min(7, queue.length), 0, cur);
    nextCard();
  }

  function nextCard(){
    var area = document.getElementById('trArea'); area.innerHTML = ''; revealFn = null;
    if (!queue.length) {
      cur = null;
      var p = document.createElement('div'); p.className = 'panel';
      var msg = tcfg.mode === 'weak' ? 'Слабких карток не лишилось ✅' : tcfg.mode === 'new' ? 'Нових карток не лишилось ✅' : 'Колоду пройдено ✅';
      p.innerHTML = '<h2>' + msg + '</h2><p>Обери інші рівні чи режим вище або перемішай колоду заново.</p>';
      area.appendChild(p); return;
    }
    cur = queue.shift(); shown++;
    var src = cards[cur].el;
    var card = document.createElement('article'); card.className = 'q tr-card';
    var h = src.querySelector('header').cloneNode(true);
    var dot = h.querySelector('.st'); if (dot) dot.remove();
    card.appendChild(h);
    src.querySelectorAll('.condition, .params').forEach(ch => { const copy = ch.cloneNode(true); if (ch.classList.contains('params')) copy.innerHTML = parameterMarkup(Number(ch.dataset.qParams),variantK,true); card.appendChild(copy); });
    var meta = document.createElement('p'); meta.className = 'side tr-meta';
    var was = prog[cur];
    meta.textContent = 'Картка ' + shown + ' · у черзі ще ' + queue.length + (was ? ' · минулого разу: ' + ST_LABEL[was] : ' · нова');
    card.appendChild(meta);
    var body = document.createElement('div'); body.hidden = true;
    Array.prototype.forEach.call(src.children, function(ch){ if (ch.tagName !== 'HEADER' && !ch.classList.contains('condition') && !ch.classList.contains('params')) body.appendChild(ch.cloneNode(true)); });
    card.appendChild(body);
    var act = document.createElement('div'); act.className = 'actions';
    var rv = document.createElement('button'); rv.className = 'primary'; rv.textContent = 'Показати відповідь';
    act.appendChild(rv); card.appendChild(act);
    var rt = document.createElement('div'); rt.className = 'actions'; rt.hidden = true;
    [['bad', '❌ Не знаю'], ['mid', '🤔 Частково'], ['ok', '✅ Знаю']].forEach(function(r){
      var b = document.createElement('button'); b.className = 'rate-' + r[0]; b.textContent = r[1];
      b.addEventListener('click', function(){ rate(r[0]); });
      rt.appendChild(b);
    });
    card.appendChild(rt);
    revealFn = function(){ body.hidden = false; act.hidden = true; rt.hidden = false; revealFn = null; };
    rv.addEventListener('click', function(){ if (revealFn) revealFn(); });
    area.appendChild(card);
    typeset(card);
  }

  var lvBox = document.getElementById('trLv'), modeBox = document.getElementById('trMode');
  [1,2,3,4].forEach(function(l){
    var b = document.createElement('button'); b.className = 'tchip'; b.textContent = 'N' + l; b.dataset.l = l;
    b.addEventListener('click', function(){
      var i = tcfg.lv.indexOf(l);
      if (i === -1) tcfg.lv.push(l); else if (tcfg.lv.length > 1) tcfg.lv.splice(i, 1);
      saveCfg(); paintCfg(); buildDeck();
    });
    lvBox.appendChild(b);
  });
  [['all', 'Усі'], ['weak', 'Тільки слабкі'], ['new', 'Тільки нові']].forEach(function(m){
    var b = document.createElement('button'); b.className = 'tchip'; b.textContent = m[1]; b.dataset.m = m[0];
    b.addEventListener('click', function(){ tcfg.mode = m[0]; saveCfg(); paintCfg(); buildDeck(); });
    modeBox.appendChild(b);
  });
  function paintCfg(){
    lvBox.querySelectorAll('.tchip').forEach(function(b){ b.setAttribute('aria-pressed', tcfg.lv.indexOf(+b.dataset.l) !== -1 ? 'true' : 'false'); });
    modeBox.querySelectorAll('.tchip').forEach(function(b){ b.setAttribute('aria-pressed', tcfg.mode === b.dataset.m ? 'true' : 'false'); });
  }

  document.getElementById('trRestart').addEventListener('click', buildDeck);
  var resetBtn = document.getElementById('trReset'), resetArmed = false;
  resetBtn.addEventListener('click', function(){
    if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Точно? Натисни ще раз'; setTimeout(function(){ resetArmed = false; resetBtn.textContent = 'Скинути прогрес'; }, 3000); return; }
    prog = {}; saveProg(); paintDots(); stats(); buildDeck();
    resetArmed = false; resetBtn.textContent = 'Скинути прогрес';
  });

  var trainBtn = document.getElementById('trainBtn');
  function setTrain(on){
    if (on && document.body.classList.contains('copy')) setCopy(false);
    document.body.classList.toggle('train', on);
    trainBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { paintCfg(); stats(); buildDeck(); document.getElementById('trainer').scrollIntoView({block:'start'}); }
  }
  trainBtn.addEventListener('click', function(){ setTrain(!document.body.classList.contains('train')); });

  document.addEventListener('keydown', function(e){
    if (!document.body.classList.contains('train') || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target.closest('input, textarea, select, button, summary, a, [contenteditable]')) return;
    if (e.key === ' ' && revealFn) { e.preventDefault(); revealFn(); }
    else if (!revealFn && cur) {
      if (e.key === '1') rate('bad'); else if (e.key === '2') rate('mid'); else if (e.key === '3') rate('ok');
    }
  });

  paintDots();

  render(); show();
  if (variantK) { input.value = variantK; displayResult(variantK); if (JSON.stringify(sel) !== JSON.stringify(Variant.calculate(variantK))) markManualSelection(); }
  refreshParameters(); typeset(document.getElementById('levels'));
})();
