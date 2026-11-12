function paymentInitData() {
  if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
  return new URLSearchParams(location.hash.replace(/^#/, '')).get('tgWebAppData') || '';
}
const paymentHeaders = () => ({ 'Content-Type': 'application/json', 'X-Telegram-Init-Data': paymentInitData() });
const publicMessage = (data, fallback) => {
  const messages = {
    INVALID_AMOUNT: 'Введите корректную сумму.', INSUFFICIENT_BALANCE: 'На балансе недостаточно средств.',
    WAGER_REQUIRED: data?.message || 'Сначала завершите отыгрыш бонуса.', TELEGRAM_USERNAME_REQUIRED: 'Добавьте @username в настройках Telegram.',
    PAYMENTS_NOT_CONFIGURED: 'Платежи временно недоступны.', TELEGRAM_AUTH_REQUIRED: 'Закройте приложение и откройте его снова через бота.',
    PROMO_NOT_FOUND: 'Промокод не найден или уже недоступен.', PROMO_ALREADY_USED: 'Этот промокод уже использован.',
    PROMO_LIMIT_REACHED: 'Активации этого промокода закончились.'
  };
  return messages[data?.error] || (data?.message && !/^[A-Z0-9_]+$/.test(data.message) ? data.message : fallback);
};

let latestBalance = 0, latestWager = 0, balanceRefreshReady = false;
const withdrawalButtons = () => document.querySelectorAll('[data-action="withdraw"], [data-info="Вывод"]');
window.updateWithdrawalState = (balance = latestBalance, wager = latestWager) => {
  latestBalance = Number(balance) || 0; latestWager = Math.max(0, Number(wager) || 0);
  const label = latestWager > 0.000001 ? `Осталось отыграть $${latestWager.toFixed(2)}` : 'Вывести';
  withdrawalButtons().forEach(withdrawHeaderButton => {
  withdrawHeaderButton.setAttribute('aria-label', label); withdrawHeaderButton.title = label;
  withdrawHeaderButton.classList.toggle('wager-active', latestWager > 0.000001);
  withdrawHeaderButton.dataset.wagerLabel = latestWager > 0.000001 ? `$${latestWager.toFixed(2)}` : '';
  });
};

window.redeemServerPromo = async code => {
  if (!paymentInitData()) return toast('Откройте приложение через Telegram-бота.');
  try {
    const response = await fetch('/api/promos/redeem', { method: 'POST', headers: paymentHeaders(), body: JSON.stringify({ code }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return toast(publicMessage(data, 'Не удалось активировать промокод.'));
    toast(`Промокод ${data.code}: +$${Number(data.amount).toFixed(2)}`); await refreshServerBalance();
  } catch { toast('Связь прервалась. Попробуйте ещё раз.'); }
};
document.addEventListener('submit', event => {
  if (event.target?.id !== 'promo') return;
  event.preventDefault(); event.stopImmediatePropagation();
  window.redeemServerPromo(document.getElementById('code')?.value.trim().toUpperCase());
}, true);

document.querySelectorAll('.payment-chips').forEach(group => group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(group.dataset.target);
  input.value = button.dataset.value === 'all' ? latestBalance.toFixed(2) : button.dataset.value; input.focus();
})));

document.querySelectorAll('[data-payment-method-group]').forEach(group => {
  group.querySelectorAll('[data-payment-method]:not(:disabled)').forEach(button => button.addEventListener('click', () => {
    group.querySelectorAll('[data-payment-method]:not(:disabled)').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  }));
});

const depositDialog = document.getElementById('deposit-dialog'), depositStatus = document.getElementById('deposit-status');
const depositPayLink = document.getElementById('deposit-pay-link');
window.openPaymentDialog = kind => {
  if (kind === 'deposit' && depositDialog) {
    depositStatus.textContent = pendingInvoiceId ? 'Ожидаем подтверждение оплаты в Лавэшке…' : '';
    depositDialog.showModal();
  } else if (kind === 'withdraw' && withdrawDialog) {
    withdrawStatus.textContent = latestWager > 0.000001 ? `Для вывода осталось отыграть $${latestWager.toFixed(2)}.` : '';
    document.getElementById('withdraw-create').disabled = latestWager > 0.000001;
    withdrawDialog.showModal();
    refreshServerBalance();
  }
};
function openPaymentUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Invalid payment URL');
  const webApp = window.Telegram?.WebApp;
  if (/^(t\.me|telegram\.me)$/i.test(url.hostname) && webApp?.openTelegramLink) webApp.openTelegramLink(url.href);
  else if (webApp?.openLink) webApp.openLink(url.href);
  else window.open(url.href, '_blank', 'noopener');
}
depositPayLink?.addEventListener('click', event => {
  event.preventDefault();
  try { openPaymentUrl(depositPayLink.href); } catch { depositStatus.textContent = 'Не удалось открыть ссылку на оплату.'; }
});
let pendingInvoiceId = sessionStorage.getItem('borDropPendingInvoice') || '';
let invoicePollTimer = 0;
async function checkPendingInvoice() {
  if (!pendingInvoiceId || !paymentInitData()) return;
  try {
    const response = await fetch(`/api/deposits/${encodeURIComponent(pendingInvoiceId)}`, { headers: { 'X-Telegram-Init-Data': paymentInitData() } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) { pendingInvoiceId = ''; sessionStorage.removeItem('borDropPendingInvoice'); }
      return;
    }
    if (String(data.status).toLowerCase() === 'paid') {
      pendingInvoiceId = ''; sessionStorage.removeItem('borDropPendingInvoice'); clearInterval(invoicePollTimer);
      depositStatus.textContent = 'Оплата получена. Баланс пополнен.';
      await refreshServerBalance();
    } else if (depositDialog?.open) depositStatus.textContent = 'Ожидаем подтверждение оплаты в Лавэшке…';
  } catch {}
}
function watchInvoice(id) {
  pendingInvoiceId = id; sessionStorage.setItem('borDropPendingInvoice', id); clearInterval(invoicePollTimer);
  invoicePollTimer = setInterval(checkPendingInvoice, 3000); checkPendingInvoice();
}
if (depositDialog) {
  document.getElementById('deposit-create').addEventListener('click', async event => {
    const amount = Number(document.getElementById('deposit-amount').value);
    if (!Number.isFinite(amount) || amount < 0.1) return depositStatus.textContent = 'Минимальная сумма пополнения — $0.10.';
    if (!paymentInitData()) return depositStatus.textContent = 'Откройте приложение через Telegram-бота.';
    const button = event.currentTarget;
    button.disabled = true; depositStatus.textContent = 'Создаём счёт…';
    try {
      const response = await fetch('/api/deposits', { method: 'POST', headers: paymentHeaders(), body: JSON.stringify({ amount }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return depositStatus.textContent = publicMessage(data, 'Не удалось создать счёт.');
      depositStatus.textContent = 'Счёт готов. Подтвердите оплату в Лавэшке.';
      if (data.id) watchInvoice(data.id);
      if (data.paymentUrl) {
        if (depositPayLink) { depositPayLink.href = data.paymentUrl; depositPayLink.hidden = false; }
        openPaymentUrl(data.paymentUrl);
      } else depositStatus.textContent = 'Счёт создан, но сервис не вернул ссылку на оплату.';
    } catch { depositStatus.textContent = 'Связь прервалась. Попробуйте ещё раз.'; }
    finally { button.disabled = false; }
  });
}

const withdrawDialog = document.getElementById('withdraw-dialog'), withdrawStatus = document.getElementById('withdraw-status');
if (withdrawDialog) {
  document.getElementById('withdraw-create').addEventListener('click', async event => {
    const amount = Number(document.getElementById('withdraw-amount').value);
    if (latestWager > 0.000001) return withdrawStatus.textContent = `Осталось отыграть $${latestWager.toFixed(2)}.`;
    if (!Number.isFinite(amount) || amount < 0.1) return withdrawStatus.textContent = 'Минимальная сумма вывода — $0.10.';
    if (!paymentInitData()) return withdrawStatus.textContent = 'Откройте приложение через Telegram-бота.';
    const button = event.currentTarget;
    button.disabled = true; withdrawStatus.textContent = 'Создаём выплату…';
    try {
      const response = await fetch('/api/withdrawals', { method: 'POST', headers: paymentHeaders(), body: JSON.stringify({ amount }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return withdrawStatus.textContent = publicMessage(data, 'Не удалось создать выплату.');
      withdrawStatus.textContent = 'Выплата отправлена в Лавэшку.'; await refreshServerBalance();
    } catch { withdrawStatus.textContent = 'Связь прервалась. Попробуйте ещё раз.'; }
    finally { button.disabled = latestWager > 0.000001; }
  });
}

async function refreshServerBalance() {
  if (!paymentInitData()) return;
  try {
    const response = await fetch('/api/balance', { headers: { 'X-Telegram-Init-Data': paymentInitData() } }); if (!response.ok) return;
    const data = await response.json(), balance = document.getElementById('balance'), nextBalance = Number(data.balance) || 0;
    if (balanceRefreshReady && nextBalance > latestBalance) window.animateBalanceCredit?.(nextBalance - latestBalance, nextBalance);
    window.applyPaymentWallet?.(data);
    if (balance && !balance.classList.contains('is-counting')) balance.textContent = nextBalance.toFixed(2).replace('.', ','); balanceRefreshReady = true; window.updateWithdrawalState(nextBalance, data.wagerRemaining);
  } catch {}
}
window.refreshServerBalance = refreshServerBalance; refreshServerBalance(); setInterval(refreshServerBalance, 15_000);
if (pendingInvoiceId) watchInvoice(pendingInvoiceId);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPendingInvoice(); });
window.addEventListener('focus', checkPendingInvoice);
