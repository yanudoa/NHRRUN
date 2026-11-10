/* app.js — 화면 전환, 점수 계산, 러너 카드 저장 */
const SPARK_SRC = 'assets/deco/sparkle.svg';
const BOX_SRC = 'assets/deco/message-box.svg';
const dataUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const src = k => 'assets/characters/' + k + '.svg';
const vtW = k => TEXT_SIZE[k][0];
const vtH = k => TEXT_SIZE[k][1];
const vtHTML = k => `<img class="vt" src="assets/text/${k}.svg" alt="">`;
const vtSrc = k => 'assets/text/' + k + '.svg';

/* Figma frame coordinates (x, y, width) */
/* start collage: [character, x, y, width, sticker] in frame coords; collage box = 742,143 466×614 */


const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nl = s => esc(s).replace(/\n/g,'<br>');
const pct = (v, t) => (v / t * 100).toFixed(3) + '%';
const state = {screen:'start', q:0, answers:[], name:'', team:'', type:null, locked:false, cardBlob:null};

/* fit the 1440-wide frame to the window */
function fit(){
  const f = $('frame');
  if (innerWidth <= 760){ f.style.removeProperty('--s'); f.style.removeProperty('--top'); f.style.removeProperty('--H'); return; }
  const H = FRAME_H[state.screen], s = Math.min(innerWidth / 1440, innerHeight / H);
  f.style.setProperty('--H', H + 'px');
  f.style.setProperty('--s', s);
  f.style.setProperty('--top', Math.max(0, (innerHeight - H * s) / 2) + 'px');
}
addEventListener('resize', fit);

/* sparkles + collage */
document.querySelectorAll('.sparkle').forEach(s => s.innerHTML = `<img src="${SPARK_SRC}" alt="" style="width:100%">`);
$('collage').innerHTML =
  DOODLES.map(([k,x,y,w]) => `<img src="assets/deco/${k}.svg" alt="" style="left:${pct(x-742,466)};top:${pct(y-143,614)};width:${pct(w,466)}">`).join('') +
  COLLAGE.map(([k,x,y,w,st,d]) => `<div class="mascot" style="left:${pct(x-742,466)};top:${pct(y-143,614)};width:${pct(w,466)};animation-delay:${d}s"><img class="${st?'sticker ':''}bob" style="width:100%;height:auto;animation-delay:${d*5}s" src="${src(k)}" alt=""></div>`).join('');

function show(name){
  state.screen = name;
  ['start','reg','quiz','result'].forEach(n => { const el = $('s-'+n); el.hidden = n !== name; el.classList.remove('enter'); });
  const cur = $('s-'+name); void cur.offsetWidth; cur.classList.add('enter');
  fit(); window.scrollTo({top:0});
}

/* register */
/* 샌드박스 환경에서도 동작하도록 form submit 대신 버튼 클릭으로 처리 */
function startQuiz(){
  const name = $('runnerName').value.trim(), team = $('runnerTeam').value.trim(), ok = $('agree').checked;
  $('runnerName').classList.toggle('err', !name);
  $('runnerTeam').classList.toggle('err', !team);
  document.querySelector('.notice').classList.toggle('err', !ok);
  const miss = [!name && '이름', !team && '소속 팀', !ok && '수집 동의'].filter(Boolean);
  if (miss.length){ $('regMsg').textContent = miss.join(', ') + '을(를) 확인해 주세요.'; $('regMsg').hidden = false; return; }
  $('regMsg').hidden = true;
  state.name = name; state.team = team; state.answers = []; state.q = 0; renderQ(); show('quiz');
}
$('startQuiz').addEventListener('click', startQuiz);
['runnerName','runnerTeam'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); startQuiz(); } }));
['runnerName','runnerTeam','agree'].forEach(id => $(id).addEventListener(id === 'agree' ? 'change' : 'input', () => {
  $(id).classList.remove('err');
  if (id === 'agree') document.querySelector('.notice').classList.remove('err');
  if ($('runnerName').value.trim() && $('runnerTeam').value.trim() && $('agree').checked) $('regMsg').hidden = true;
}));

/* quiz */
function renderQ(){
  const i = state.q, Q = QUESTIONS[i], k = 'q' + (i+1);
  $('prog').firstElementChild.style.width = ((i+1)*10) + '%';
  $('prog').setAttribute('aria-valuenow', i+1);
  $('prog').setAttribute('aria-label', `10문항 중 ${i+1}번째`);
  const t = $('qTitle');
  t.innerHTML = vtHTML(k); t.setAttribute('aria-label', Q.q);
  t.style.setProperty('--w', vtW(k) + 'px'); t.style.setProperty('--h', (vtH(k) > 60 ? 106 : 53) + 'px');
  $('qOpts').innerHTML = Q.o.map(([txt],j) => `<li><button class="opt${state.answers[i]===j?' picked':''}" data-j="${j}" style="animation-delay:${.06+j*.05}s"><span class="key">${'ABCDE'[j]}</span><span>${esc(txt)}</span></button></li>`).join('');
  $('qBack').textContent = i === 0 ? '← 처음부터' : '← 이전 문항';
  $('qBack').classList.toggle('md', i !== 0);
  $('qBack').classList.toggle('sm', i === 0);
  const [mk, x, y, w] = Q.m, m = $('qMascot');
  m.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
  m.innerHTML = `<img class="bob" style="width:100%;height:auto" src="${src(mk)}" alt="">`;
  const b = $('qBody'); b.classList.remove('swap'); m.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap'); m.classList.add('swap');
  state.locked = false;
}
$('qOpts').addEventListener('click', e => {
  const btn = e.target.closest('.opt'); if (!btn || state.locked) return;
  state.locked = true; state.answers[state.q] = +btn.dataset.j;
  $('qOpts').querySelectorAll('.opt').forEach(o => o.classList.toggle('picked', o === btn));
  setTimeout(() => { if (state.q < QUESTIONS.length - 1){ state.q++; renderQ(); } else finish(); }, 420);
});
$('qBack').addEventListener('click', () => state.q === 0 ? show('reg') : goBack());

function scoreType(){
  const count = {S:0,K:0,H:0,M:0,R:0};
  const picks = state.answers.map((j,i) => QUESTIONS[i].o[j][1]);
  picks.forEach(k => count[k]++);
  const max = Math.max(...Object.values(count));
  for (let i = picks.length - 1; i >= 0; i--) if (count[picks[i]] === max) return picks[i]; // 동점이면 마지막에 고른 유형
  return 'S';
}
function finish(){ state.type = scoreType(); renderResult(); show('result'); }

/* result */
function renderResult(){
  const T = TYPES[state.type], r = T.ribbon, h = T.hero;
  const ax = 300, ay = 290, aw = 800, ah = 347;
  $('result').innerHTML = `
    <div class="r-row r-badge"><span class="badge" style="background:${T.color}">RUNNER TYPE ${T.no}</span></div>
    <div class="r-row r-name"><h2 class="r-title" style="margin:0;--w:${vtW(state.type)}px" aria-label="${T.name}">${vtHTML(state.type)}</h2></div>
    <div class="r-row r-d"><p class="r-desc">${nl(T.desc)}</p></div>
    <div class="r-row r-art"><div class="art">
      <svg class="ribbon" style="left:${pct(r.x-ax,aw)};top:${pct(r.y-ay,ah)};width:${pct(r.w,aw)}" viewBox="0 0 ${r.vw} ${r.vh}" fill="none" aria-hidden="true"><path pathLength="1" d="${r.d}" stroke="${T.color}" stroke-width="${r.sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="hero" style="left:${pct(h.x-ax,aw)};top:${pct(h.y-ay,ah)};width:${pct(h.w,aw)}"><img class="bob" style="width:100%;height:auto;animation-delay:1.4s" src="${src(state.type)}" alt="${T.name} 캐릭터"></div>
    </div></div>
    <div class="r-row r-msg"><div class="msg${T.box === 'plain' ? ' plain' : ''}">${T.box === 'plain' ? '' : `<img src="${BOX_SRC}" alt="">`}<span>${nl(T.msg)}</span></div></div>
    <div class="r-row r-tags"><div class="tags">${T.tags.map(t => `<span class="tag" style="background:${T.color}">${esc(t)}</span>`).join('')}</div></div>
    <div class="r-row r-actions"><button class="btn" id="saveCard">러너 카드 이미지 저장</button></div>`;
  $('saveCard').addEventListener('click', makeCard);
}

/* runner card image */
function loadImg(url){ return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; }); }
function roundRect(x,X,Y,W,H,R){ x.beginPath(); x.moveTo(X+R,Y); x.arcTo(X+W,Y,X+W,Y+H,R); x.arcTo(X+W,Y+H,X,Y+H,R); x.arcTo(X,Y+H,X,Y,R); x.arcTo(X,Y,X+W,Y,R); x.closePath(); }
function wrap(x, text, maxW){
  const out = [];
  text.split('\n').forEach(line => {
    let cur = '';
    line.split(' ').forEach(word => { const t = cur ? cur + ' ' + word : word; if (x.measureText(t).width > maxW && cur){ out.push(cur); cur = word; } else cur = t; });
    out.push(cur);
  });
  return out;
}
async function makeCard(){
  const btn = $('saveCard'); btn.disabled = true; btn.textContent = '카드 만드는 중…';
  try{
    const T = TYPES[state.type], S = 2, W = 360*S, H = 640*S, r = T.ribbon;
    await Promise.all([500,700,800,900].map(w => document.fonts.load(`${w} ${14*S}px "Pretendard Variable"`)));
    const ribbonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.vw} ${r.vh}" fill="none"><path d="${r.d}" stroke="${T.color}" stroke-width="${r.sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const [hero, ribbon, nameImg] = await Promise.all([loadImg(src(state.type)), loadImg(dataUri(ribbonSvg)), loadImg(vtSrc(state.type))]);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = T.cardBg; x.fillRect(0,0,W,H);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${14*S}px "Pretendard Variable"`;
    const bt = `RUNNER TYPE ${T.no}`, bw = x.measureText(bt).width + 28*S;
    x.fillStyle = T.color; roundRect(x, W/2-bw/2, 46*S, bw, 26*S, 13*S); x.fill();
    x.fillStyle = '#fff'; x.fillText(bt, W/2, 59.5*S);
    const nw = vtW(state.type) * (54/75.6) * S, nh = nw * nameImg.height / nameImg.width;
    x.drawImage(nameImg, W/2 - nw/2, 120*S - nh/2, nw, nh);
    x.fillStyle = '#101011'; x.font = `500 ${14*S}px "Pretendard Variable"`;
    wrap(x, T.desc, 320*S).forEach((l,i) => x.fillText(l, W/2, (166+i*21)*S));
    const rw = 470*S, rh = rw*r.vh/r.vw; x.drawImage(ribbon, W/2 - rw/2, 310*S - rh/2, rw, rh);
    const hw = 200*S, hh = hw*hero.height/hero.width; x.drawImage(hero, W/2 - hw/2, Math.min(222*S, 420*S - hh), hw, hh);
    x.font = `700 ${14*S}px "Pretendard Variable"`;
    const lines = wrap(x, T.msg, 270*S), boxH = (36 + lines.length*22)*S, boxY = 440*S, bx = 34*S, bW = W - 68*S;
    x.fillStyle = '#fff'; x.beginPath();
    x.moveTo(bx+8*S, boxY); x.lineTo(bx+bW*.6, boxY+2*S); x.lineTo(bx+bW-10*S, boxY); x.lineTo(bx+bW, boxY+boxH*.3);
    x.lineTo(bx+bW-4*S, boxY+boxH*.85); x.lineTo(bx+bW-14*S, boxY+boxH); x.lineTo(bx+bW*.25, boxY+boxH-2*S); x.lineTo(bx+8*S, boxY+boxH);
    x.lineTo(bx, boxY+boxH*.4); x.closePath(); x.fill();
    x.fillStyle = '#2b2b2b'; lines.forEach((l,i) => x.fillText(l, W/2, boxY + (29 + i*22)*S));
    x.font = `800 ${13*S}px "Pretendard Variable"`;
    const tw = 100*S, gap = 6*S, ty = boxY + boxH + 18*S, tx0 = W/2 - (tw*3 + gap*2)/2;
    T.tags.forEach((t,i) => { x.fillStyle = T.color; roundRect(x, tx0 + i*(tw+gap), ty, tw, 24*S, 12*S); x.fill(); x.fillStyle = '#fff'; x.fillText(t, tx0 + i*(tw+gap) + tw/2, ty + 12.5*S); });
    x.fillStyle = '#57439A'; x.font = `700 ${12*S}px "Pretendard Variable"`; x.fillText(`${state.team} · ${state.name}`, W/2, H - 44*S);
    x.fillStyle = '#9a93b5'; x.font = `500 ${10*S}px "Pretendard Variable"`; x.fillText('NHR RUN 2026 · GOOD RUN, GOOD YEAR', W/2, H - 24*S);
    const url = c.toDataURL('image/png');
    state.cardBlob = await new Promise(ok => c.toBlob(ok, 'image/png'));
    $('cardImg').src = url; $('dlBtn').dataset.url = url; $('dlBtn').hidden = false;
    $('modal').hidden = false; $('closeModal').focus();
  } catch(err){
    $('cardImg').removeAttribute('src'); $('dlBtn').hidden = true;
    $('cardTip').textContent = '카드 이미지를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.'; $('modal').hidden = false;
  } finally { btn.disabled = false; btn.textContent = '러너 카드 이미지 저장'; }
}
$('dlBtn').addEventListener('click', async () => {
  const filename = `NHR-RUN-${TYPES[state.type].name}.png`;
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch(e){ dl = null; }
  if (dl && state.cardBlob){
    try { await dl.save({filename, data: state.cardBlob}); $('cardTip').textContent = '러너 카드를 저장했어요.'; }
    catch(err){ if (err && err.code !== 'declined') $('cardTip').textContent = '여기서는 바로 저장할 수 없어요. 카드를 길게 누르거나 마우스 오른쪽 버튼으로 저장해 주세요.'; }
    return;
  }
  const a = document.createElement('a'); a.href = $('dlBtn').dataset.url || ''; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
});
function closeModal(){ $('modal').hidden = true; $('cardTip').textContent = '카드를 길게 누르거나 마우스 오른쪽 버튼을 눌러 이미지로 저장하세요.'; }
$('closeModal').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); });

/* navigation */
function goHome(){ state.answers = []; state.q = 0; show('start'); }
function goBack(){
  if (state.screen === 'quiz'){ if (state.q > 0){ state.q--; renderQ(); } else show('reg'); }
  else if (state.screen === 'reg') show('start');
  else if (state.screen === 'result'){ state.q = QUESTIONS.length - 1; renderQ(); show('quiz'); }
}
$('backBtn').addEventListener('click', () => { if (state.screen !== 'start') goBack(); });
$('logoBtn').addEventListener('click', goHome);
$('goReg').addEventListener('click', () => { show('reg'); setTimeout(() => $('runnerName').focus({preventScroll:true}), 300); });
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'home') goHome();
});
show('start');
