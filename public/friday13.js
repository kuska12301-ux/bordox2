let fridayRound = null;
let fridayPoll = null;
let fridayVisual = null;
let fridayBusy = false;
let fridayMounted = false;
let fridayClockOffset = 0;
let fridayLastState = '';

const fridayCharacterArt = {
  runner: '<svg class="friday-person-art runner-art" viewBox="0 0 100 140" aria-hidden="true"><defs><linearGradient id="runnerJacket" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#55d9df"/><stop offset="1" stop-color="#176b8a"/></linearGradient><linearGradient id="runnerSkin" x2="0" y2="1"><stop stop-color="#f5c6a0"/><stop offset="1" stop-color="#ce8d6a"/></linearGradient></defs><ellipse cx="50" cy="132" rx="29" ry="6" fill="#05080dbb"/><g class="runner-legs"><path d="m42 91-9 22-17 10q-5 4 0 7l27-5 14-25z" fill="#263344" stroke="#111923" stroke-width="3"/><path d="m58 91 10 19 17 8q7 5 1 8l-27-3-13-22z" fill="#35465a" stroke="#111923" stroke-width="3"/><path d="m16 122-8 5q-3 5 4 6h21l3-5-7-4zM77 120l8 3q9 1 8 7l-4 3H66l-2-5z" fill="#d5e1e8" stroke="#101722" stroke-width="3"/><path d="m13 133 20 0" stroke="#ffbd55" stroke-width="3" stroke-linecap="round"/><path d="m68 133 21 0" stroke="#ffbd55" stroke-width="3" stroke-linecap="round"/></g><g class="runner-body"><path d="M35 55q15-12 30 0l11 40q-23 12-49 0z" fill="url(#runnerJacket)" stroke="#102a3b" stroke-width="4"/><path d="m38 59-16 9-9 18q-1 7 5 7l18-14 10-10M62 59l14 8 12 16q3 6-3 9l-17-12-9-10" fill="none" stroke="#48c3d2" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="m34 63-11 7-7 15M66 63l10 8 8 12" fill="none" stroke="url(#runnerSkin)" stroke-width="6" stroke-linecap="round"/><path d="m40 48q0-21 11-23 14 2 14 19l-3 13-18 1z" fill="url(#runnerSkin)" stroke="#17202b" stroke-width="3"/><path d="M38 39q1-23 17-22 15 2 14 20l-8-7-14 1-4 10z" fill="#182733" stroke="#0a131a" stroke-width="3"/><path d="m40 33 15-12 12 13" fill="none" stroke="#e65b50" stroke-width="5" stroke-linecap="round"/><path d="m50 41 3 2 4-2" fill="none" stroke="#633c35" stroke-width="2" stroke-linecap="round"/><circle cx="49" cy="39" r="1.5" fill="#17212a"/><circle cx="59" cy="39" r="1.5" fill="#17212a"/><path d="m33 60-8 9 8 16 10-6z" fill="#f4b94e" stroke="#493521" stroke-width="3"/><path d="m24 68 6 12" stroke="#fff2b3" stroke-width="2"/></g><g class="runner-pack"><path d="M66 59q14 2 17 17l-3 17-12-3-7-23z" fill="#c54b42" stroke="#522b31" stroke-width="3"/><path d="m68 68 10 3" stroke="#f0a05a" stroke-width="3"/></g></svg>',
  killer: '<svg class="friday-person-art killer-art" viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id="killerCoat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#333c43"/><stop offset=".55" stop-color="#151d25"/><stop offset="1" stop-color="#070c12"/></linearGradient><linearGradient id="killerMask" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eee8d8"/><stop offset="1" stop-color="#a9aaa3"/></linearGradient></defs><ellipse cx="59" cy="143" rx="36" ry="6" fill="#05080dcc"/><g class="killer-cloak"><path d="M38 56q21-14 42 1l22 68-13 10-25-4-28 5-17-11 14-60z" fill="url(#killerCoat)" stroke="#080d12" stroke-width="4"/><path d="m37 61-16 27 9 6 17-18M80 62l21 25-8 7-20-19" fill="none" stroke="#252d34" stroke-width="10" stroke-linecap="round"/><path d="m24 89-6 25" stroke="#96958d" stroke-width="6" stroke-linecap="round"/><path d="m17 112 12 3" stroke="#d0c8b8" stroke-width="4" stroke-linecap="round"/><path d="m41 129-3 12M82 130l4 11" stroke="#090e13" stroke-width="9" stroke-linecap="round"/><path d="M42 27q17-17 36 1l-2 27q-14 17-30 0z" fill="url(#killerMask)" stroke="#596068" stroke-width="4"/><path d="M45 37q8-7 15 0l-2 7q-7-5-13 0zM65 37q7-6 12 1l-1 6q-6-5-12 0z" fill="#141b22"/><path d="m59 42 2 13" stroke="#85877f" stroke-width="3"/><path d="M47 50l5 2m10 0 5-2m-18 8 4 1m10 0 4-1" stroke="#a9413e" stroke-width="3" stroke-linecap="round"/><path d="M45 26q15-13 30 1" fill="none" stroke="#f1eee2" stroke-width="3"/><path d="M52 73q9 10 19 0" fill="none" stroke="#56616a" stroke-width="3"/><path d="M34 90 28 122m54-32 8 34" stroke="#52606a" stroke-width="3" opacity=".75"/></g><text x="61" y="103" text-anchor="middle" fill="#e14e4b" font-size="11" font-weight="900" letter-spacing="2">13</text></svg>'
};

window.friday13 = function () {
  return '<section class="friday-shell"><header class="friday-head"><button data-route="home" aria-label="Назад">‹</button><span>НОЧЬ В ЛЕСУ</span><b>13</b></header><div class="friday-copy"><small>ПЯТНИЦА 13 · ПОГОНЯ</small><h1>Беги. Забирай. Выживай.</h1><p>Множитель растёт, пока Джейсон приближается.<br>Забери выигрыш до того, как он догонит.</p></div><section class="friday-scene" id="friday-scene" aria-label="Погоня в лесу"><div class="friday-moon"></div><div class="friday-pines"></div><div class="friday-road"></div><div class="friday-killer" aria-hidden="true">☠</div><div class="friday-runner" aria-hidden="true">🏃</div><div class="friday-multiplier"><strong id="friday-multiplier">×1.00</strong><small id="friday-status" role="status" aria-live="polite">Сделай ставку, чтобы начать погоню</small></div></section><div class="friday-controls"><label for="friday-amount">ТВОЯ СТАВКА <span>USDT</span></label><div class="friday-stake"><input id="friday-amount" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="1.00" aria-label="Сумма ставки"><button type="button" data-friday-sum="max">МАКС</button></div><div class="friday-quick"><button type="button" data-friday-sum="1">$1</button><button type="button" data-friday-sum="2">$2</button><button type="button" data-friday-sum="5">$5</button><button type="button" data-friday-sum="10">$10</button></div><button class="friday-action" id="friday-start"><b>Начать погоню</b><small>Минимум $0.01</small></button><button class="friday-action friday-cashout" id="friday-cashout" hidden><b>Забрать <span id="friday-cashout-value">$1.00</span></b><small>Зафиксировать выигрыш сейчас</small></button><p class="friday-footnote">Раунд рассчитывается сервером. Если Джейсон догонит — ставка сгорает.</p></div></section>';
};

function fridayCurrentMultiplier() {
  if (!fridayRound || fridayRound.status !== 'running') return Number(fridayRound?.multiplier || 1);
  const now = Date.now() + fridayClockOffset;
  return Math.min(100, Math.exp(Math.max(0, now - Number(fridayRound.startedAt)) / 7000));
}
function renderFridayState() {
  if (!fridayMounted || !fridayRound) return;
  const active = fridayRound.status === 'running';
  const multiplier = fridayCurrentMultiplier();
  const scene = document.querySelector('#friday-scene');
  const multiplierNode = document.querySelector('#friday-multiplier');
  const status = document.querySelector('#friday-status');
  const cashout = document.querySelector('#friday-cashout');
  const start = document.querySelector('#friday-start');
  if (multiplierNode) multiplierNode.textContent = '×' + multiplier.toFixed(2);
  if (scene) {
    const runnerArt = scene.querySelector('.friday-runner');
    const killerArt = scene.querySelector('.friday-killer');
    if (runnerArt && !runnerArt.querySelector('svg')) runnerArt.innerHTML = fridayCharacterArt.runner;
    if (killerArt && !killerArt.querySelector('svg')) killerArt.innerHTML = fridayCharacterArt.killer;
    scene.classList.toggle('is-running', active);
    scene.classList.toggle('is-crashed', fridayRound.status === 'crashed');
    scene.classList.toggle('is-cashed-out', fridayRound.status === 'cashed_out');
    const progress = Math.min(1, Math.log(Math.max(1, multiplier)) / Math.log(100));
    scene.style.setProperty('--chase-progress', progress.toFixed(3));
    const runner = scene.querySelector('.friday-runner');
    const killer = scene.querySelector('.friday-killer');
    if (runner) runner.style.left = (17 + 13 * progress) + '%';
    if (killer) killer.style.left = (77 - 22 * progress) + '%';
  }
  if (cashout) {
    cashout.hidden = !active;
    cashout.disabled = fridayBusy;
    const amount = Math.floor(Number(fridayRound.bet || 0) * multiplier * 100) / 100;
    const label = document.querySelector('#friday-cashout-value');
    if (label) label.textContent = '$' + money(amount);
  }
  if (start) {
    start.hidden = active;
    start.disabled = fridayBusy;
    start.querySelector('b').textContent = fridayRound.status === 'crashed' ? 'Ещё раз' : fridayRound.status === 'cashed_out' ? 'Играть ещё' : 'Начать погоню';
  }
  if (status) {
    status.textContent = active ? 'Джейсон приближается…' : fridayRound.status === 'crashed' ? 'Джейсон догнал на ×' + Number(fridayRound.crashAt || multiplier).toFixed(2) + ' · ставка потеряна' : fridayRound.status === 'cashed_out' ? 'Вы забрали $' + money(fridayRound.payout) + ' на ×' + Number(fridayRound.multiplier || 1).toFixed(2) : 'Сделай ставку, чтобы начать погоню';
  }
}
async function syncFridayState() {
  if (!fridayMounted || syncFridayState.pending) return;
  syncFridayState.pending = true;
  try {
    const response = await fetch('/api/friday13/state', { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    if (Number(data.serverNow)) fridayClockOffset = Number(data.serverNow) - Date.now();
    fridayRound = data.round;
    renderFridayState();
    const signature = fridayRound ? fridayRound.id + ':' + fridayRound.status : '';
    if (signature && fridayLastState === fridayRound.id + ':running' && fridayRound.status === 'crashed') {
      syncWallet();
      if (!fridayBusy) toast('Джейсон догнал! Ставка потеряна.');
    }
    fridayLastState = signature;
  } catch {} finally { syncFridayState.pending = false; }
}
window.stopFridaySync = function () {
  fridayMounted = false;
  clearInterval(fridayPoll);
  clearInterval(fridayVisual);
  fridayPoll = fridayVisual = null;
  document.removeEventListener('visibilitychange', onFridayVisibility);
};
function onFridayVisibility() { if (document.visibilityState === 'visible') syncFridayState(); }
window.startFridaySync = function () {
  window.stopFridaySync();
  fridayMounted = true;
  syncFridayState();
  fridayPoll = setInterval(syncFridayState, 750);
  fridayVisual = setInterval(renderFridayState, 50);
  document.addEventListener('visibilitychange', onFridayVisibility);
};
window.wireFriday = function () {
  const amountInput = document.querySelector('#friday-amount');
  const start = document.querySelector('#friday-start');
  const cashout = document.querySelector('#friday-cashout');
  if (!start || !cashout) return;
  const characterScene = document.querySelector('#friday-scene');
  if (characterScene) {
    const runner = characterScene.querySelector('.friday-runner');
    const killer = characterScene.querySelector('.friday-killer');
    if (runner) runner.innerHTML = fridayCharacterArt.runner;
    if (killer) killer.innerHTML = fridayCharacterArt.killer;
  }
  document.querySelectorAll('[data-friday-sum]').forEach(button => button.onclick = () => { amountInput.value = button.dataset.fridaySum === 'max' ? money(state.balance) : button.dataset.fridaySum; });
  start.onclick = async () => {
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount < 0.01) return toast('Минимальная ставка — $0.01');
    if (amount > Number(state.balance)) return toast('Недостаточно средств');
    fridayBusy = true; renderFridayState();
    try {
      const response = await fetch('/api/friday13/start', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ amount }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Не удалось начать игру');
      if (Number(data.serverNow)) fridayClockOffset = Number(data.serverNow) - Date.now();
      state.balance = Number(data.balance); state.wagerRemaining = Number(data.wagerRemaining || 0); fridayRound = data.round; save(); renderFridayState();
      toast('Погоня началась. Успей забрать выигрыш!');
    } catch (error) { await syncFridayState(); toast(error.message || 'Не удалось начать игру'); }
    finally { fridayBusy = false; renderFridayState(); }
  };
  cashout.onclick = async () => {
    if (fridayBusy) return;
    fridayBusy = true; renderFridayState();
    try {
      const response = await fetch('/api/friday13/cashout', { method: 'POST', headers: authHeaders(), body: '{}' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Не удалось забрать выигрыш');
      state.balance = Number(data.balance); state.wagerRemaining = Number(data.wagerRemaining || 0); fridayRound = data.round; save(); renderFridayState();
      toast('Выигрыш зачислен: $' + money(data.round.payout) + ' · ×' + Number(data.round.multiplier).toFixed(2));
    } catch (error) { await syncFridayState(); toast(error.message || 'Джейсон догнал!'); }
    finally { fridayBusy = false; renderFridayState(); }
  };
  renderFridayState();
};


let fridayLastFx = '';
const fridayRenderStateBeforeFx = renderFridayState;
renderFridayState = function () {
  fridayRenderStateBeforeFx();
  if (!fridayMounted || !fridayRound) return;
  const scene = document.querySelector('#friday-scene');
  if (!scene) return;
  const active = fridayRound.status === 'running';
  scene.classList.toggle('is-danger', active && fridayCurrentMultiplier() >= 3.5);
  if (active) { fridayLastFx = ''; scene.classList.remove('has-win'); return; }
  if (!['cashed_out', 'crashed'].includes(fridayRound.status)) return;
  const key = fridayRound.id + ':' + fridayRound.status;
  if (key === fridayLastFx) return;
  fridayLastFx = key;
  const won = fridayRound.status === 'cashed_out';
  scene.classList.toggle('has-win', won);
  const burst = document.createElement('div');
  burst.className = 'friday-result-fx ' + (won ? 'is-win' : 'is-crash');
  burst.setAttribute('aria-hidden', 'true');
  if (won) {
    const reward = document.createElement('b');
    reward.className = 'friday-win-reward';
    reward.textContent = '+' + money(fridayRound.payout || 0) + ' USDT';
    burst.append(reward);
  }
  for (let i = 0; i < 24; i++) {
    const bit = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const distance = 42 + Math.random() * 92;
    bit.style.setProperty('--x', Math.cos(angle) * distance + 'px');
    bit.style.setProperty('--y', Math.sin(angle) * distance + 'px');
    bit.style.setProperty('--turn', (Math.random() * 540 - 270) + 'deg');
    bit.style.setProperty('--delay', Math.random() * 140 + 'ms');
    burst.append(bit);
  }
  scene.append(burst);
  window.setTimeout(() => { burst.remove(); if (won) scene.classList.remove('has-win'); }, 1900);
};
