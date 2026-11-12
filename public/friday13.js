let fridayRound = null;
let fridayPoll = null;
let fridayVisual = null;
let fridayBusy = false;
let fridayMounted = false;
let fridayClockOffset = 0;
let fridayLastState = '';

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
