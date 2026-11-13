import http from 'node:http';
import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { LavePay, verifyLaveWebhook } from './sdk/lave-pay.mjs';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const publicUrl = String(process.env.PUBLIC_URL || 'https://borcase.bothost.tech').replace(/\/$/, '');
const rawPage = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const paymentsScript = await readFile(new URL('./public/payments.js', import.meta.url));
const appScript = await readFile(new URL('./public/app.js', import.meta.url));
const appStyles = await readFile(new URL('./public/app.css', import.meta.url));
const rawAdminPage = await readFile(new URL('./public/admin.html', import.meta.url), 'utf8');
const adminScript = await readFile(new URL('./public/admin.js', import.meta.url));
const freshBarCaseImage = await readFile(new URL('./public/assets/fresh-bar-case.png', import.meta.url));
const usdtCoinImage = await readFile(new URL('./public/assets/usdt-coin.png', import.meta.url));
const laveLogoImage = await readFile(new URL('./public/assets/laveshka-logo.png', import.meta.url));
const telegramSdk = '<script src="https://telegram.org/js/telegram-web-app.js?64"></script>';
const withTelegramSdk = html => html.replace(/(<html[^>]*>)/i, `$1${telegramSdk}`);
const adminPage = withTelegramSdk(rawAdminPage);
const paymentUi = `<style>.payment-dialog{border:1px solid #ff852d66;border-radius:26px;padding:0;max-width:390px;width:calc(100% - 28px);overflow:hidden;background:#1d1528;color:#fff;box-shadow:0 28px 90px #000b}.payment-dialog::backdrop{background:#08050dbb;backdrop-filter:blur(8px)}.payment-head{padding:22px 22px 13px;background:radial-gradient(circle at 85% 0,#7730a755,transparent 45%),linear-gradient(135deg,#291738,#1b1425)}.payment-head h2{margin:4px 0 7px}.payment-body{padding:18px 22px 24px}.dialog-close{float:right;border:1px solid #ffffff22!important;background:#ffffff12!important;color:#fff!important;border-radius:50%;width:34px;height:34px;font-size:21px}.money-field{display:flex;align-items:center;margin:10px 0 15px;border:1px solid #6f527d;background:#110c19;border-radius:17px;padding:5px 12px;box-shadow:inset 0 0 0 1px #0005}.money-field input{width:100%;min-width:0;border:0!important;outline:0;background:transparent!important;color:#fff!important;font-size:28px!important;font-weight:850;padding:13px 5px!important}.money-field .unit{color:#ff9b45;font-weight:800}.payment-chips{display:flex;gap:7px;margin-bottom:16px}.payment-chips button{flex:1;border:1px solid #624770;background:#2b1e37;color:#e6dced;border-radius:11px;padding:9px 4px;font-weight:750}.payment-action{width:100%;min-height:50px;border-radius:15px!important}.payment-action:disabled{filter:grayscale(.35);opacity:.7}.payment-status{min-height:20px;margin:13px 2px 0!important;color:#cfc3d8!important}.method-title{margin:0 0 9px;color:#cfc3d8;font-size:12px;font-weight:800}.payment-methods{display:grid;gap:8px;margin:0 0 16px}.payment-method{width:100%;display:flex;align-items:center;gap:10px;border:1px solid #655473;border-radius:14px;padding:9px;background:#17111e;color:#fff;text-align:left}.payment-method[aria-pressed=true]{border-color:#ffb54b;box-shadow:0 0 0 1px #ffb54b33;background:#2a1b24}.payment-method img,.method-mark{width:38px;height:38px;flex:none;border-radius:10px;object-fit:cover}.payment-method-copy{display:grid;gap:3px;flex:1}.payment-method-copy small{font-size:11px;color:#b8adbf}.payment-method-check{color:#ffc45d}.payment-method:disabled{opacity:.58;cursor:not-allowed}.method-mark{display:grid;place-items:center;background:#263244;color:#9eb5d4;font-weight:900}.method-warning{margin:-3px 0 14px;color:#c7b9cc;font-size:11px;line-height:1.4}</style><dialog class="payment-dialog" id="deposit-dialog"><div class="payment-head"><form method="dialog"><button class="dialog-close" aria-label="Закрыть">×</button></form><h2>Пополнить баланс</h2><p class="sub">Оплата через Лавэшку в USDT</p><div class="method-title">Способ пополнения</div><div class="payment-methods" data-payment-method-group="deposit" role="group" aria-label="Способ пополнения"><button class="payment-method" type="button" data-payment-method="laveshka" aria-pressed="true"><img src="/assets/laveshka-logo.png" alt=""><span class="payment-method-copy"><b>Лавэшка</b><small>Автоматически · USDT</small></span><span class="payment-method-check" aria-hidden="true">✓</span></button></div></div><div class="payment-body"><label class="smalltitle" for="deposit-amount">Введите сумму</label><div class="money-field"><input id="deposit-amount" inputmode="decimal" type="number" min="0.10" max="10000" step="0.01" value="10.00"><span class="unit">USDT</span></div><div class="payment-chips" data-target="deposit-amount"><button type="button" data-value="5">$5</button><button type="button" data-value="10">$10</button><button type="button" data-value="25">$25</button><button type="button" data-value="50">$50</button></div><button class="primary payment-action" id="deposit-create">Создать счёт на оплату</button><a id="deposit-pay-link" href="#" hidden target="_blank" rel="noopener" style="margin-top:14px;color:#ffb369">Открыть счёт в Лавэшке ↗</a><p class="payment-status" id="deposit-status" role="status"></p></div></dialog><dialog class="payment-dialog" id="withdraw-dialog"><div class="payment-head"><form method="dialog"><button class="dialog-close" aria-label="Закрыть">×</button></form><h2>Вывести средства</h2><p class="sub">Автовыплата на ваш аккаунт в Лавэшке</p><div class="method-title">Способ вывода</div><div class="payment-methods" data-payment-method-group="withdraw" role="group" aria-label="Способ вывода"><button class="payment-method" type="button" data-payment-method="laveshka" aria-pressed="true"><img src="/assets/laveshka-logo.png" alt=""><span class="payment-method-copy"><b>Лавэшка</b><small>Автоматически · USDT</small></span><span class="payment-method-check" aria-hidden="true">✓</span></button></div></div><div class="payment-body"><label class="smalltitle" for="withdraw-amount">Введите сумму вывода</label><div class="money-field"><input id="withdraw-amount" inputmode="decimal" type="number" min="2.00" max="10000" step="0.01" value="5.00"><span class="unit">USDT</span></div><div class="payment-chips" data-target="withdraw-amount"><button type="button" data-value="2">$2</button><button type="button" data-value="5">$5</button><button type="button" data-value="10">$10</button><button type="button" data-value="all">Всё</button></div><button class="primary payment-action" id="withdraw-create">Вывести средства</button><p class="payment-status" id="withdraw-status" role="status"></p></div></dialog><script src="/payments.js?v=payments-20261112-2"></script>`;
const miniAppPage = withTelegramSdk(rawPage);
const page = miniAppPage.includes('</body>')
  ? miniAppPage.replace('</body>', `${paymentUi}</body>`)
  : miniAppPage.replace('</html>', `${paymentUi}</html>`);
const dataDir = new URL('./data/', import.meta.url);
const dbFile = new URL('./data/ledger.json', import.meta.url);
await mkdir(dataDir, { recursive: true });
let db = { users: {}, invoices: {}, payouts: {}, promos: {}, transactions: [], webhookEvents: {}, adminLog: [] };
try { db = JSON.parse(await readFile(dbFile, 'utf8')); } catch {}
db.users ||= {}; db.invoices ||= {}; db.payouts ||= {}; db.promos ||= {}; db.transactions ||= []; db.webhookEvents ||= {}; db.adminLog ||= []; db.games ||= {}; db.banners ||= []; db.caseOpens ||= {}; db.houseBalance ||= '0.000000'; db.maintenanceMode = db.maintenanceMode === true;
let saveQueue = Promise.resolve();
function persist() {
  saveQueue = saveQueue.then(async () => {
    const temp = new URL('./data/ledger.tmp', import.meta.url);
    await writeFile(temp, JSON.stringify(db, null, 2));
    await rename(temp, dbFile);
  });
  return saveQueue;
}

const paymentsEnabled = Boolean(process.env.LAVEPAY_API_KEY && process.env.TELEGRAM_BOT_TOKEN);
const webhookEnabled = Boolean(paymentsEnabled && process.env.LAVEPAY_WEBHOOK_SECRET);
const pay = paymentsEnabled ? new LavePay({ baseUrl: process.env.LAVEPAY_BASE_URL, apiKey: process.env.LAVEPAY_API_KEY }) : null;
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
async function getBody(req, limit = 64_000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function verifyTelegram(initData) {
  if (!initData || !process.env.TELEGRAM_BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const received = params.get('hash');
  // Bot-token validation signs every received field except `hash`.
  // Modern Telegram clients include `signature`; removing it breaks HMAC validation.
  params.delete('hash');
  const authDate = Number(params.get('auth_date'));
  if (!received || !authDate || Math.abs(Date.now() / 1000 - authDate) > 604800) return null;
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
  const expected = createHmac('sha256', secret).update(check).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(params.get('user')); } catch { return null; }
}
const localPreview = req => process.env.PREVIEW_ADMIN === 'true' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && ['127.0.0.1', 'localhost'].includes((req.headers.host || '').split(':')[0]);
const userFrom = req => verifyTelegram(req.headers['x-telegram-init-data']) || (localPreview(req) ? { id: '8549949225', first_name: 'BOR CASE Preview', username: 'preview_admin' } : null);
const isAdmin = user => Boolean(user?.id && String(process.env.ADMIN_ID || '').split(',').map(id => id.trim()).includes(String(user.id)) || user?.id === '8549949225' && process.env.PREVIEW_ADMIN === 'true');
const account = id => {
  const value = db.users[id] ||= { balance: '0.000000', wagerRemaining: '0.000000', creditedInvoices: [], redeemedPromos: [] };
  value.creditedInvoices ||= [];
  value.redeemedPromos ||= [];
  value.freeCaseWagerMultipliers ||= [];
  value.freeCaseOpens = Number(value.freeCaseOpens ?? value.freeCaseWagerMultipliers.length ?? 0);
  value.wagerRemaining ||= '0.000000';
  value.lastDailyBonus ||= 0;
  return value;
};
const recordTransaction = ({ userId, type, amount, balanceAfter, description, reference, adminId }) => {
  const item = { id: randomUUID(), userId: String(userId), type, amount: Number(amount).toFixed(6), balanceAfter: Number(balanceAfter).toFixed(6), description, reference, adminId, createdAt: new Date().toISOString() };
  db.transactions.unshift(item); db.transactions = db.transactions.slice(0, 20_000); return item;
};
const gameModes = new Set(['Jackpot', 'Арена', 'Колесо']);
const ARENA_MAX_PLAYERS = 100;
const ARENA_SPIN_MS = 2600;
const ARENA_PHYSICS_STEP_MS = 20;
const newRound = mode => ({ id: randomUUID(), mode, status: 'waiting', players: {}, bank: '0.000000', startAt: null, winner: null, createdAt: new Date().toISOString() });
const roundFor = mode => {
  let round = db.games[mode];
  if (!round || (round.status === 'finished' && Date.now() >= Number(round.resetAt || 0))) round = db.games[mode] = newRound(mode);
  return round;
};
const publicRound = round => ({ id: round.id, mode: round.mode, status: round.status, bank: round.bank, commission: round.commission || '0.000000', payout: round.payout || null, commissionRate: round.mode === 'Арена' ? 0.10 : 0, startAt: round.startAt, spinStartedAt: round.spinStartedAt || null, launchAngle: round.launchAngle ?? null, ballStartedAt: round.ballStartedAt || null, ballDurationMs: round.ballDurationMs || null, ball: round.mode === 'Арена' && ['rolling','finished'].includes(round.status) && round.ballState ? { x: round.ballState.x, y: round.ballState.y } : null, winner: round.winner, players: Object.values(round.players || {}).map(player => ({ id: player.id, name: player.name, username: player.username, photoUrl: player.photoUrl, amount: player.amount })) });
function advanceArenaPhysics(round, now) {
  const duration=Number(round.ballDurationMs),target=Math.max(0,Math.min(duration,now-Number(round.ballStartedAt)));
  const ball=round.ballState ||= {x:.5,y:.5,angle:Number(round.launchAngle)*Math.PI/180,elapsedMs:0};
  while(ball.elapsedMs<target){
    const dt=Math.min(ARENA_PHYSICS_STEP_MS,target-ball.elapsedMs),progress=duration?ball.elapsedMs/duration:1;
    const noise=(randomInt(0,1_000_001)/1_000_000-.5)*.16;
    ball.angle+=noise;
    if(randomInt(0,1000)<18)ball.angle+=(randomInt(0,1_000_001)/1_000_000-.5)*1.6;
    const slowdown=.55+.45*Math.pow(1-progress,2),distance=.00075*dt*slowdown;
    ball.x+=Math.cos(ball.angle)*distance;ball.y+=Math.sin(ball.angle)*distance;
    if(ball.x<.035){ball.x=.035+( .035-ball.x);ball.angle=Math.PI-ball.angle}else if(ball.x>.965){ball.x=.965-(ball.x-.965);ball.angle=Math.PI-ball.angle}
    if(ball.y<.10){ball.y=.10+(.10-ball.y);ball.angle=-ball.angle}else if(ball.y>.90){ball.y=.90-(ball.y-.90);ball.angle=-ball.angle}
    ball.elapsedMs+=dt;
  }
  return {x:ball.x,y:ball.y};
}
function payArenaWinner(round, point) {
  const players=Object.values(round.players||{}),bank=Number(round.bank);let needle=Math.max(0,Math.min(.999999999,(point.x-.035)/(.965-.035)))*bank,winner=players.at(-1);
  for(const player of players){needle-=Number(player.amount);if(needle<0){winner=player;break}}
  const commission=Number((bank*.10).toFixed(6)),payout=Number((bank-commission).toFixed(6)),wallet=account(String(winner.id));wallet.balance=(Number(wallet.balance)+payout).toFixed(6);
  recordTransaction({userId:winner.id,type:'win',amount:payout,balanceAfter:wallet.balance,description:'Выигрыш · Арена · комиссия 10%',reference:round.id});db.houseBalance=(Number(db.houseBalance||0)+commission).toFixed(6);recordTransaction({userId:'house',type:'commission',amount:commission,balanceAfter:db.houseBalance,description:'Комиссия 10% · Арена',reference:round.id});
  round.commission=commission.toFixed(6);round.payout=payout.toFixed(6);round.status='finished';round.winner={id:winner.id,name:winner.name,username:winner.username,photoUrl:winner.photoUrl,amount:payout.toFixed(6)};round.ball=point;round.finishedAt=Date.now();round.resetAt=Date.now()+12_000;
}
async function advanceRound(round, now=Date.now()) {
  if(round.mode!=='Арена'){await settleRound(round);return}
  if(round.status==='countdown'&&now>=Number(round.startAt)&&Object.keys(round.players||{}).length>=2){round.status='spinning';round.spinStartedAt=Number(round.startAt);round.launchAngle=randomInt(0,360_000)/1000;await persist()}
  if(round.status==='spinning'&&now>=Number(round.spinStartedAt)+ARENA_SPIN_MS){round.status='rolling';round.ballStartedAt=Number(round.spinStartedAt)+ARENA_SPIN_MS;round.ballDurationMs=randomInt(7500,15001);round.ballState={x:.5,y:.5,angle:Number(round.launchAngle)*Math.PI/180,elapsedMs:0};await persist()}
  if(round.status==='rolling'){const point=advanceArenaPhysics(round,now);if(now>=Number(round.ballStartedAt)+Number(round.ballDurationMs)){payArenaWinner(round,point);await persist()}else if(now-Number(round.ballPersistAt||0)>=500){round.ballPersistAt=now;await persist()}}
}
async function settleRound(round) {
  if (round.status !== 'countdown' || Date.now() < Number(round.startAt) || Object.keys(round.players).length < 2) return false;
  const players = Object.values(round.players); const bank = Number(round.bank);
  const seed = createHash('sha256').update(`${round.id}:${round.startAt}:${players.map(x => `${x.id}:${x.amount}`).join('|')}`).digest();
  let point = seed.readUInt32BE(0) / 0x100000000 * bank; let winner = players[players.length - 1];
  for (const player of players) { point -= Number(player.amount); if (point < 0) { winner = player; break; } }
  const commission = round.mode === 'Арена' ? Number((bank * 0.10).toFixed(6)) : 0;
  const payout = Number((bank - commission).toFixed(6));
  const wallet = account(String(winner.id)); wallet.balance = (Number(wallet.balance) + payout).toFixed(6);
  recordTransaction({ userId: winner.id, type: 'win', amount: payout, balanceAfter: wallet.balance, description: `Выигрыш · ${round.mode}${commission ? ' · комиссия 10%' : ''}`, reference: round.id });
  if (commission) {
    db.houseBalance = (Number(db.houseBalance || 0) + commission).toFixed(6);
    recordTransaction({ userId: 'house', type: 'commission', amount: commission, balanceAfter: db.houseBalance, description: 'Комиссия 10% · Арена', reference: round.id });
  }
  round.commission = commission.toFixed(6); round.payout = payout.toFixed(6);
  round.status = 'finished'; round.winner = { id: winner.id, name: winner.name, username: winner.username, photoUrl: winner.photoUrl, amount: payout.toFixed(6) }; round.finishedAt = Date.now(); round.resetAt = Date.now() + 12_000;
  await persist(); return true;
}
let moneyQueue = Promise.resolve();
function serializeMoney(operation) {
  const result = moneyQueue.then(operation, operation);
  moneyQueue = result.catch(() => {});
  return result;
}
const normalizeInvoice = value => value?.invoice || value?.data?.invoice || value?.data || value;
async function creditPaidInvoice(remoteInvoice) {
  const invoice = normalizeInvoice(remoteInvoice);
  if (!invoice?.id) return false;
  const local = db.invoices[invoice.id];
  if (!local || !['paid', 'completed', 'success'].includes(String(invoice.status).toLowerCase())) return false;
  const user = account(local.userId);
  if (user.creditedInvoices.includes(invoice.id)) return false;
  user.balance = (Number(user.balance) + Number(local.amount)).toFixed(6);
  user.creditedInvoices.push(invoice.id);
  local.status = 'paid'; local.paidAt = new Date().toISOString();
  recordTransaction({ userId: local.userId, type: 'deposit', amount: local.amount, balanceAfter: user.balance, description: 'Пополнение Lave Pay', reference: invoice.id });
  await persist();
  return true;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', paymentsEnabled, webhookEnabled });
    if (req.method === 'GET' && url.pathname === '/api/maintenance') {
      const user = userFrom(req);
      if (!user?.id) return json(res, 401, { error: 'TELEGRAM_AUTH_REQUIRED' });
      return json(res, 200, { enabled: db.maintenanceMode, isAdmin: isAdmin(user) });
    }
    if (url.pathname.startsWith('/api/') && db.maintenanceMode) {
      const user = userFrom(req);
      if (!user?.id) return json(res, 401, { error: 'TELEGRAM_AUTH_REQUIRED' });
      if (!isAdmin(user)) return json(res, 503, { error: 'MAINTENANCE_MODE', message: 'Технические работы. Скоро вернёмся.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/banner') return json(res, 200, db.banners.find(x => x.id === db.activeBannerId) || null);
    if (req.method === 'GET' && url.pathname === '/api/game/players') {
      const mode = String(url.searchParams.get('mode') || 'Арена');
      if (!gameModes.has(mode)) return json(res, 400, { error: 'INVALID_MODE' });
      const round = roundFor(mode);
      return json(res, 200, { players: Object.keys(round.players || {}).length, status: round.status, bank: round.bank });
    }
    if (req.method === 'POST' && url.pathname === '/api/lavepay/webhook') {
      if (!webhookEnabled) return json(res, 503, { error: 'WEBHOOK_NOT_CONFIGURED' });
      const rawBody = await getBody(req);
      const valid = verifyLaveWebhook({ secret: process.env.LAVEPAY_WEBHOOK_SECRET, timestamp: req.headers['x-lavepay-timestamp'], signature: req.headers['x-lavepay-signature'], rawBody });
      if (!valid) return json(res, 401, { error: 'INVALID_SIGNATURE' });
      const event = JSON.parse(rawBody);
      const eventId = String(req.headers['x-lavepay-event-id'] || event.id || createHash('sha256').update(rawBody).digest('hex'));
      if (db.webhookEvents[eventId]) return json(res, 200, { ok: true, duplicate: true });
      db.webhookEvents[eventId] = new Date().toISOString();
      if (event.type === 'invoice.paid') await creditPaidInvoice(event.data);
      await persist();
      return json(res, 200, { ok: true });
    }
    if (url.pathname.startsWith('/api/')) {
      const user = userFrom(req);
      if (!user?.id) return json(res, 401, { error: 'TELEGRAM_AUTH_REQUIRED' });
      const currentAccount = account(String(user.id));
      currentAccount.username = user.username || currentAccount.username;
      currentAccount.firstName = user.first_name || currentAccount.firstName;
      if (req.method === 'GET' && url.pathname === '/api/maintenance') return json(res, 200, { enabled: db.maintenanceMode, isAdmin: isAdmin(user) });
      if (db.maintenanceMode && !isAdmin(user)) return json(res, 503, { error: 'MAINTENANCE_MODE', message: 'Технические работы. Скоро вернёмся.' });
      if (req.method === 'GET' && url.pathname === '/api/balance') return json(res, 200, { balance: currentAccount.balance, wagerRemaining: currentAccount.wagerRemaining, freeCaseOpens: currentAccount.freeCaseOpens, asset: 'USDT', isAdmin: isAdmin(user) });
      if (req.method === 'GET' && url.pathname === '/api/profile') return json(res, 200, { id: String(user.id), username: user.username, firstName: user.first_name, photoUrl: user.photo_url, balance: currentAccount.balance, wagerRemaining: currentAccount.wagerRemaining, lastDailyBonus: currentAccount.lastDailyBonus, isAdmin: isAdmin(user) });
      if (req.method === 'POST' && url.pathname === '/api/cases/fresh-bar/open') {
        const input = JSON.parse(await getBody(req) || '{}'); const key = String(input.idempotencyKey || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) return json(res, 400, { error: 'INVALID_OPEN_KEY', message: 'Не удалось создать открытие. Попробуйте ещё раз.' });
        const result = await serializeMoney(async () => {
          db.caseOpens ||= {};
          const previous = db.caseOpens[key];
          if (previous) { const wallet=account(String(user.id)); return String(previous.userId) === String(user.id) ? { id: previous.id, prize: previous.prize, balance: wallet.balance, freeCaseOpens: wallet.freeCaseOpens, free: previous.free, duplicate: true } : { error: 'OPEN_KEY_USED', message: 'Открытие уже обработано.' }; }
          const wallet = account(String(user.id)); const cost = 0.50; const free = wallet.freeCaseOpens > 0;
          if (!free && Number(wallet.balance) < cost) return { error: 'INSUFFICIENT_BALANCE', message: 'Для открытия нужно $0.50.' };
          const draw = randomInt(0, 100);
          const prize = draw < 88 ? 0.10 : draw < 98 ? 0.50 : draw === 98 ? 1.00 : 2.00;
          const freeWagerMultiplier=free?Number(wallet.freeCaseWagerMultipliers.shift()||0):0;
          if (free) wallet.freeCaseOpens -= 1;
          else wallet.balance = (Number(wallet.balance) - cost).toFixed(6);
          recordTransaction({ userId: user.id, type: 'case_open', amount: free?0:-cost, balanceAfter: wallet.balance, description: free?'Бесплатное открытие FRESH BAR':'Открытие кейса FRESH BAR', reference: key });
          wallet.balance = (Number(wallet.balance) + prize).toFixed(6);
          recordTransaction({ userId: user.id, type: 'case_prize', amount: prize, balanceAfter: wallet.balance, description: 'Приз кейса FRESH BAR', reference: key });
          const wagerAdded=prize*freeWagerMultiplier;
          if(wagerAdded>0)wallet.wagerRemaining=(Number(wallet.wagerRemaining)+wagerAdded).toFixed(6);
          const opened = { id: key, userId: String(user.id), prize: prize.toFixed(2), cost: free?'0.00':cost.toFixed(2), free, wagerAdded: wagerAdded.toFixed(6), createdAt: new Date().toISOString() };
          db.caseOpens[key] = opened; await persist();
          return { id: opened.id, prize: opened.prize, balance: wallet.balance, wagerRemaining: wallet.wagerRemaining, freeCaseOpens: wallet.freeCaseOpens, free, duplicate: false };
        });
        if (result.error) return json(res, 409, result);
        return json(res, result.duplicate ? 200 : 201, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/bonus/daily') {
        const result = await serializeMoney(async () => {
          const wallet = account(String(user.id));
          const waitMs = 86_400_000 - (Date.now() - Number(wallet.lastDailyBonus || 0));
          if (waitMs > 0) return { waitMs };
          const prizes = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10];
          const prize = prizes[Number.parseInt(randomUUID().slice(0, 8), 16) % prizes.length];
          const wager = prize * 5;
          wallet.balance = (Number(wallet.balance) + prize).toFixed(6);
          wallet.wagerRemaining = (Number(wallet.wagerRemaining) + wager).toFixed(6);
          wallet.lastDailyBonus = Date.now();
          recordTransaction({ userId: user.id, type: 'daily_bonus', amount: prize, balanceAfter: wallet.balance, description: 'Ежедневный бонус', reference: new Date().toISOString().slice(0, 10) });
          await persist();
          return { amount: prize.toFixed(6), wagerAdded: wager.toFixed(6), wagerRemaining: wallet.wagerRemaining, balance: wallet.balance, nextAt: wallet.lastDailyBonus + 86_400_000 };
        });
        if (result.waitMs) return json(res, 409, { error: 'BONUS_ALREADY_CLAIMED', message: 'Бонус уже получен. Возвращайтесь завтра.', waitMs: result.waitMs });
        return json(res, 200, result);
      }      if (req.method === 'POST' && url.pathname === '/api/cases/friday-13/open') {
        const input = JSON.parse(await getBody(req) || '{}'); const key = String(input.idempotencyKey || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) return json(res, 400, { error: 'INVALID_OPEN_KEY', message: 'Не удалось создать открытие. Попробуйте ещё раз.' });
        const result = await serializeMoney(async () => {
          db.caseOpens ||= {}; const previous = db.caseOpens[key];
          if (previous) return String(previous.userId) === String(user.id) && previous.caseId === 'friday-13' ? { id: previous.id, prize: previous.prize, balance: account(String(user.id)).balance, duplicate: true } : { error: 'OPEN_KEY_USED', message: 'Открытие уже обработано.' };
          const wallet = account(String(user.id)); const cost = 1;
          if (Number(wallet.balance) < cost) return { error: 'INSUFFICIENT_BALANCE', message: 'Для открытия нужно 1.00 USDT.' };
          const draw = randomInt(0, 10_000);
          const prize = draw < 8_000 ? 0.50 : draw < 9_700 ? 1 : draw < 9_900 ? 2 : draw < 9_950 ? 10 : draw < 9_960 ? 20 : 100;
          wallet.balance = (Number(wallet.balance) - cost).toFixed(6);
          recordTransaction({ userId: user.id, type: 'case_open', amount: -cost, balanceAfter: wallet.balance, description: 'Открытие кейса ПЯТНИЦА 13', reference: key });
          wallet.balance = (Number(wallet.balance) + prize).toFixed(6);
          recordTransaction({ userId: user.id, type: 'case_prize', amount: prize, balanceAfter: wallet.balance, description: 'Приз кейса ПЯТНИЦА 13 · Джефф', reference: key });
          const opened = { id: key, userId: String(user.id), caseId: 'friday-13', prize: prize.toFixed(2), cost: cost.toFixed(2), createdAt: new Date().toISOString() };
          db.caseOpens[key] = opened; await persist();
          return { id: opened.id, prize: opened.prize, balance: wallet.balance, duplicate: false };
        });
        if (result.error) return json(res, 409, result);
        return json(res, result.duplicate ? 200 : 201, result);
      }


      if (req.method === 'GET' && url.pathname === '/api/game/state') {
        const mode = String(url.searchParams.get('mode') || 'Jackpot'); if (!gameModes.has(mode)) return json(res, 400, { error: 'INVALID_MODE' });
        const round = roundFor(mode); await advanceRound(round); return json(res, 200, publicRound(round));
      }
      if (req.method === 'POST' && url.pathname === '/api/game/bet') {
        const input = JSON.parse(await getBody(req) || '{}'); const mode = String(input.mode || 'Jackpot'); const amount = Math.round(Number(input.amount) * 100) / 100;
        if (!gameModes.has(mode) || !Number.isFinite(amount) || amount < 0.01) return json(res, 400, { error: 'INVALID_BET', message: 'Проверьте сумму ставки.' });
        const result = await serializeMoney(async () => {
          const round = roundFor(mode); await advanceRound(round);
          if (mode === 'Арена' ? !['waiting','countdown'].includes(round.status) || (round.status === 'countdown' && Date.now() >= Number(round.startAt)) : round.status === 'finished' || (round.status === 'countdown' && Date.now() >= Number(round.startAt))) return { error: 'ROUND_CLOSED', message: 'Раунд уже закрыт.' };
          const id = String(user.id); const existing = round.players[id];
          if (mode === 'Арена' && !existing && Object.keys(round.players).length >= ARENA_MAX_PLAYERS) return { error: 'ROUND_FULL', message: 'В раунде уже 100 участников.' };
          const wallet = account(String(user.id)); if (Number(wallet.balance) < amount) return { error: 'INSUFFICIENT_BALANCE', message: 'Недостаточно средств.' };
          wallet.balance = (Number(wallet.balance) - amount).toFixed(6); wallet.wagerRemaining = Math.max(0, Number(wallet.wagerRemaining) - amount).toFixed(6);
          round.players[id] = { id, name: user.first_name || user.username || `Игрок ${id.slice(-4)}`, username: user.username, photoUrl: user.photo_url, amount: (Number(existing?.amount || 0) + amount).toFixed(6) };
          round.bank = (Number(round.bank) + amount).toFixed(6);
          if (Object.keys(round.players).length >= 2 && !round.startAt) { round.status = 'countdown'; round.startAt = Date.now() + 15000; }
          recordTransaction({ userId: id, type: 'bet', amount: -amount, balanceAfter: wallet.balance, description: `Ставка · ${mode}`, reference: round.id }); await persist();
          return { balance: wallet.balance, wagerRemaining: wallet.wagerRemaining, round: publicRound(round) };
        });
        return json(res, result.error ? 409 : 201, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/promos/redeem') {
        const input = JSON.parse(await getBody(req) || '{}');
        const code = String(input.code || '').trim().toUpperCase();
        const result = await serializeMoney(async () => {
          const promo = db.promos[code];
          const wallet = account(String(user.id));
          if (!promo || !promo.active) return { error: 'PROMO_NOT_FOUND', message: 'Промокод не найден или отключён.' };
          if (wallet.redeemedPromos.includes(code)) return { error: 'PROMO_ALREADY_USED', message: 'Вы уже использовали этот промокод.' };
          if (promo.used >= promo.limit) return { error: 'PROMO_LIMIT_REACHED', message: 'Лимит активаций исчерпан.' };
          const amount=Number(promo.amount||0),freeCaseOpens=Number(promo.freeCaseOpens||0),multiplier=Number(promo.wagerMultiplier||0);
          wallet.balance = (Number(wallet.balance) + amount).toFixed(6);
          const wagerAdded=Number(promo.wagerMultiplier===undefined?promo.wager||0:amount*multiplier);
          wallet.wagerRemaining = (Number(wallet.wagerRemaining) + wagerAdded).toFixed(6);
          wallet.freeCaseOpens+=freeCaseOpens;
          wallet.freeCaseWagerMultipliers.push(...Array.from({length:freeCaseOpens},()=>multiplier));
          wallet.redeemedPromos.push(code); promo.used += 1;
          recordTransaction({ userId: user.id, type: 'promo', amount, balanceAfter: wallet.balance, description: `Промокод ${code}${freeCaseOpens?` · бесплатных кейсов: ${freeCaseOpens}`:''}${wagerAdded?` · вагер ×${multiplier}`:''}`, reference: code });
          await persist();
          return { balance: wallet.balance, wagerRemaining: wallet.wagerRemaining, wagerGranted: wagerAdded, freeCaseOpens: wallet.freeCaseOpens, freeCaseGranted: freeCaseOpens, amount: promo.amount, code };
        });
        if (result.error) return json(res, 409, result);
        return json(res, 200, result);
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(user)) return json(res, 403, { error: 'ADMIN_REQUIRED', message: 'Доступ только для администратора.' });
        if (req.method === 'GET' && url.pathname === '/api/admin/maintenance') return json(res, 200, { enabled: db.maintenanceMode });
        if (req.method === 'POST' && url.pathname === '/api/admin/maintenance') {
          const input = JSON.parse(await getBody(req) || '{}');
          db.maintenanceMode = input.enabled === true;
          db.adminLog.unshift({ action: db.maintenanceMode ? 'Включены технические работы' : 'Выключены технические работы', adminId: String(user.id), active: db.maintenanceMode, at: new Date().toISOString() });
          db.adminLog = db.adminLog.slice(0, 500);
          await persist();
          return json(res, 200, { enabled: db.maintenanceMode });
        }
        if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
          const users = Object.entries(db.users).map(([id, value]) => ({ id, username: value.username, firstName: value.firstName, balance: value.balance, wagerRemaining: value.wagerRemaining || '0.000000', freeCaseOpens: Number(value.freeCaseOpens||0), redeemedPromos: value.redeemedPromos?.length || 0 }));
          const promos = Object.values(db.promos).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return json(res, 200, { adminId: String(user.id), stats: { users: users.length, balance: users.reduce((sum, item) => sum + Number(item.balance), 0).toFixed(6), wager: users.reduce((sum, item) => sum + Number(item.wagerRemaining), 0).toFixed(6), paidInvoices: Object.values(db.invoices).filter(x => x.status === 'paid').length, payouts: Object.values(db.payouts).length }, users, promos, banners: db.banners, activeBannerId: db.activeBannerId || null, transactions: db.transactions.slice(0, 1000), adminLog: db.adminLog.slice(0, 500) });
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/promos') {
          const input = JSON.parse(await getBody(req) || '{}');
          const code = String(input.code || '').trim().toUpperCase();
          const amount = Number(input.amount||0); const limit = Number(input.limit); const wagerMultiplier=Number(input.wagerMultiplier||0); const freeCaseOpens=Number(input.freeCaseOpens||0);
          if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return json(res, 400, { error: 'INVALID_CODE', message: 'Код: 3–32 символа A–Z, 0–9, _ или -.' });
          if (!Number.isFinite(amount) || amount < 0 || amount > 10_000 || (!amount&&!freeCaseOpens) || !Number.isFinite(wagerMultiplier) || wagerMultiplier < 0 || wagerMultiplier > 1000 || !Number.isInteger(freeCaseOpens) || freeCaseOpens < 0 || freeCaseOpens > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100_000) return json(res, 400, { error: 'INVALID_PROMO', message: 'Укажите сумму или хотя бы одно бесплатное открытие, а также допустимые вагер и лимит.' });
          if (db.promos[code]) return json(res, 409, { error: 'PROMO_EXISTS', message: 'Такой промокод уже существует.' });
          db.promos[code] = { code, amount: amount.toFixed(6), wagerMultiplier, freeCaseOpens, limit, used: 0, active: true, createdAt: new Date().toISOString(), createdBy: String(user.id) };
          db.adminLog.unshift({ action: 'promo.create', code, adminId: String(user.id), at: new Date().toISOString() }); await persist();
          return json(res, 201, db.promos[code]);
        }
        const toggle = url.pathname.match(/^\/api\/admin\/promos\/([^/]+)\/toggle$/);
        if (req.method === 'POST' && toggle) {
          const code = decodeURIComponent(toggle[1]).toUpperCase(); const promo = db.promos[code];
          if (!promo) return json(res, 404, { error: 'PROMO_NOT_FOUND' });
          promo.active = !promo.active; db.adminLog.unshift({ action: 'promo.toggle', code, active: promo.active, adminId: String(user.id), at: new Date().toISOString() }); await persist();
          return json(res, 200, promo);
        }
        const promoDelete = url.pathname.match(/^\/api\/admin\/promos\/([^/]+)$/);
        if (req.method === 'DELETE' && promoDelete) {
          const code = decodeURIComponent(promoDelete[1]).toUpperCase();
          if (!db.promos[code]) return json(res, 404, { error: 'PROMO_NOT_FOUND' });
          delete db.promos[code];
          db.adminLog.unshift({ action: 'promo.delete', code, adminId: String(user.id), at: new Date().toISOString() }); await persist();
          return json(res, 200, { ok: true, code });
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/banners') {
          const input = JSON.parse(await getBody(req) || '{}');
          const title = String(input.title || '').trim().slice(0, 80); const subtitle = String(input.subtitle || '').trim().slice(0, 140); const button = String(input.button || 'Открыть').trim().slice(0, 28); const color = /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : '#7659ff'; const imageUrl = String(input.imageUrl || '').trim().slice(0, 500);
          if (!title || !subtitle || imageUrl && !/^https:\/\//i.test(imageUrl)) return json(res, 400, { error: 'INVALID_BANNER', message: 'Заполните заголовок и описание; ссылка на картинку должна быть HTTPS.' });
          const banner = { id: randomUUID(), title, subtitle, button: button || 'Открыть', color, imageUrl, createdAt: new Date().toISOString(), createdBy: String(user.id) };
          db.banners.unshift(banner); if (!db.activeBannerId) db.activeBannerId = banner.id;
          db.adminLog.unshift({ action: 'banner.create', bannerId: banner.id, adminId: String(user.id), at: new Date().toISOString() }); await persist();
          return json(res, 201, banner);
        }
        const bannerActivate = url.pathname.match(/^\/api\/admin\/banners\/([^/]+)\/activate$/);
        if (req.method === 'POST' && bannerActivate) {
          const id = decodeURIComponent(bannerActivate[1]); if (!db.banners.some(x => x.id === id)) return json(res, 404, { error: 'BANNER_NOT_FOUND' });
          db.activeBannerId = id; db.adminLog.unshift({ action: 'banner.activate', bannerId: id, adminId: String(user.id), at: new Date().toISOString() }); await persist();
          return json(res, 200, { ok: true, activeBannerId: id });
        }
        const bannerItem = url.pathname.match(/^\/api\/admin\/banners\/([^/]+)$/);
        if (bannerItem && req.method === 'PUT') {
          const id = decodeURIComponent(bannerItem[1]); const banner = db.banners.find(x => x.id === id); if (!banner) return json(res, 404, { error: 'BANNER_NOT_FOUND' });
          const input = JSON.parse(await getBody(req) || '{}'); const title = String(input.title || '').trim().slice(0, 80); const subtitle = String(input.subtitle || '').trim().slice(0, 140); const button = String(input.button || 'Открыть').trim().slice(0, 28); const color = /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : '#7659ff'; const imageUrl = String(input.imageUrl || '').trim().slice(0, 500);
          if (!title || !subtitle || imageUrl && !/^https:\/\//i.test(imageUrl)) return json(res, 400, { error: 'INVALID_BANNER' });
          Object.assign(banner, { title, subtitle, button, color, imageUrl, updatedAt: new Date().toISOString() });
          db.adminLog.unshift({ action: 'banner.update', bannerId: id, adminId: String(user.id), at: new Date().toISOString() }); await persist(); return json(res, 200, banner);
        }
        if (bannerItem && req.method === 'DELETE') {
          const id = decodeURIComponent(bannerItem[1]); if (!db.banners.some(x => x.id === id)) return json(res, 404, { error: 'BANNER_NOT_FOUND' });
          db.banners = db.banners.filter(x => x.id !== id); if (db.activeBannerId === id) db.activeBannerId = db.banners[0]?.id || null;
          db.adminLog.unshift({ action: 'banner.delete', bannerId: id, adminId: String(user.id), at: new Date().toISOString() }); await persist(); return json(res, 200, { ok: true });
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/wager') {
          const input = JSON.parse(await getBody(req) || '{}');
          const username = String(input.username || '').trim().replace(/^@/, '').toLowerCase();
          const operation = String(input.operation || ''); const amount = Number(input.amount); const reason = String(input.reason || '').trim().slice(0, 160);
          const userId = Object.entries(db.users).find(([, value]) => String(value.username || '').toLowerCase() === username)?.[0];
          if (!/^[a-z0-9_]{5,32}$/.test(username) || !userId || !['add','remove'].includes(operation) || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || reason.length < 3) return json(res, 400, { error: 'INVALID_WAGER_ADJUSTMENT', message: 'Проверьте username, сумму, действие и причину.' });
          const result = await serializeMoney(async () => {
            const wallet = account(userId); const current = Number(wallet.wagerRemaining || 0);
            const next = operation === 'add' ? current + amount : Math.max(0, current - amount);
            const applied = Number((next - current).toFixed(6)); wallet.wagerRemaining = next.toFixed(6);
            db.adminLog.unshift({ action: 'wager.adjust', userId, amount: applied.toFixed(6), requestedAmount: amount.toFixed(6), reason, adminId: String(user.id), at: new Date().toISOString() });
            await persist(); return { username, wagerRemaining: wallet.wagerRemaining, applied: applied.toFixed(6) };
          });
          return json(res, 200, result);
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/balance') {
          const input = JSON.parse(await getBody(req) || '{}');
          const username = String(input.username || '').trim().replace(/^@/, '').toLowerCase(); const amount = Number(input.amount); const reason = String(input.reason || '').trim().slice(0, 160);
          const userId=Object.entries(db.users).find(([,account])=>String(account.username||'').toLowerCase()===username)?.[0];
          if (!/^[a-z0-9_]{5,32}$/.test(username) || !userId || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100_000 || reason.length < 3) return json(res, 400, { error: 'INVALID_ADJUSTMENT', message: 'Игрок с таким Telegram username не найден. Проверьте @username и причину операции.' });
          const result = await serializeMoney(async () => {
            const wallet = account(userId); const next = Number(wallet.balance) + amount;
            if (next < 0) return null;
            wallet.balance = next.toFixed(6);
            recordTransaction({ userId, type: amount > 0 ? 'admin_credit' : 'admin_debit', amount, balanceAfter: wallet.balance, description: reason, adminId: String(user.id) });
            db.adminLog.unshift({ action: 'balance.adjust', userId, amount: amount.toFixed(6), reason, adminId: String(user.id), at: new Date().toISOString() }); await persist();
            return { userId, username, balance: wallet.balance };
          });
          if (!result) return json(res, 409, { error: 'INSUFFICIENT_BALANCE', message: 'Нельзя увести баланс ниже нуля.' });
          return json(res, 200, result);
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/deposits') {
        if (!paymentsEnabled) return json(res, 503, { error: 'PAYMENTS_NOT_CONFIGURED', message: 'Пополнения пока не настроены.' });
        const input = JSON.parse(await getBody(req) || '{}');
        const amount = Number(input.amount);
        if (!Number.isFinite(amount) || amount < 0.1 || amount > 10_000) return json(res, 400, { error: 'INVALID_AMOUNT' });
        const idempotencyKey = LavePay.idempotencyKey('deposit');
        const result = await pay.createInvoice({ amount: amount.toFixed(2), currency: 'USD', accept: ['USDT'], description: 'Пополнение BOR CASE', order_id: idempotencyKey, payload: `deposit:${user.id}`, return_url: `${publicUrl}/`, ttl: 3600 });
        const invoice = normalizeInvoice(result);
        if (!invoice?.id) throw new Error('Lave Pay response has no invoice id');
        db.invoices[invoice.id] = { userId: String(user.id), amount: amount.toFixed(6), status: invoice.status || 'active', idempotencyKey, createdAt: new Date().toISOString() };
        await persist();
        return json(res, 201, { id: invoice.id, status: invoice.status, paymentUrl: invoice.pay_url });
      }
      if (req.method === 'POST' && url.pathname === '/api/withdrawals') {
        if (!paymentsEnabled) return json(res, 503, { error: 'PAYMENTS_NOT_CONFIGURED', message: 'Выводы пока не настроены.' });
        const input = JSON.parse(await getBody(req) || '{}');
        const amount = Number(input.amount);
        if (!Number.isFinite(amount) || amount < 2 || amount > 10_000) return json(res, 400, { error: 'INVALID_AMOUNT', message: 'Минимальная сумма вывода — 2 USDT.' });
        if (!user.username) return json(res, 400, { error: 'TELEGRAM_USERNAME_REQUIRED', message: 'Установите @username в Telegram для получения выплаты.' });
        const fixedAmount = amount.toFixed(6);
        const payout = await serializeMoney(async () => {
          const wallet = account(String(user.id));
          if (Number(wallet.balance) < amount) return { insufficient: true };
          if (Number(wallet.wagerRemaining) > 0) return { wager: wallet.wagerRemaining };
          const idempotencyKey = LavePay.idempotencyKey('withdraw');
          const localId = randomUUID();
          wallet.balance = (Number(wallet.balance) - amount).toFixed(6);
          db.payouts[localId] = { userId: String(user.id), recipient: `@${user.username}`, amount: fixedAmount, status: 'processing', idempotencyKey, createdAt: new Date().toISOString() };
          await persist();
          try {
            const remote = await pay.createTransfer({ recipient: `@${user.username}`, amount: amount.toFixed(2), comment: 'Вывод BOR CASE', idempotency_key: idempotencyKey });
            const value = remote?.payout || remote?.data?.payout || remote?.data || remote;
            db.payouts[localId].remoteId = value?.id;
            db.payouts[localId].status = value?.status || 'completed';
            recordTransaction({ userId: user.id, type: 'withdrawal', amount: -amount, balanceAfter: wallet.balance, description: 'Автовывод Lave Pay', reference: value?.id || localId });
            await persist();
            return { id: value?.id || localId, status: db.payouts[localId].status, balance: wallet.balance };
          } catch (error) {
            wallet.balance = (Number(wallet.balance) + amount).toFixed(6);
            db.payouts[localId].status = 'failed';
            db.payouts[localId].error = error.message;
            await persist();
            throw error;
          }
        });
        if (payout.insufficient) return json(res, 409, { error: 'INSUFFICIENT_BALANCE', message: 'Недостаточно средств.' });
        if (payout.wager) return json(res, 409, { error: 'WAGER_REQUIRED', message: `Осталось отыграть ${Number(payout.wager).toFixed(2)} USDT.` });
        return json(res, 201, payout);
      }
      const match = url.pathname.match(/^\/api\/deposits\/([^/]+)$/);
      if (req.method === 'GET' && match) {
        if (!paymentsEnabled) return json(res, 503, { error: 'PAYMENTS_NOT_CONFIGURED' });
        const id = decodeURIComponent(match[1]); const local = db.invoices[id];
        if (!local || local.userId !== String(user.id)) return json(res, 404, { error: 'NOT_FOUND' });
        const remote = normalizeInvoice(await pay.getInvoice(id));
        await creditPaidInvoice(remote);
        return json(res, 200, { id, status: db.invoices[id].status, balance: account(String(user.id)).balance });
      }
      return json(res, 404, { error: 'NOT_FOUND' });
    }
    if (req.method === 'GET' && url.pathname === '/payments.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(paymentsScript);
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(appScript);
    }
    if (req.method === 'GET' && url.pathname === '/app.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      return res.end(appStyles);
    }
    if (req.method === 'GET' && url.pathname === '/assets/fresh-bar-case.png') { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); return res.end(freshBarCaseImage); }
    if (req.method === 'GET' && url.pathname === '/assets/usdt-coin.png') { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); return res.end(usdtCoinImage); }
    if (req.method === 'GET' && url.pathname === '/assets/laveshka-logo.png') { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); return res.end(laveLogoImage); }
    if (req.method === 'GET' && url.pathname === '/admin.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); return res.end(adminScript);
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(req.method === 'HEAD' ? undefined : adminPage);
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : page);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found');
  } catch (error) {
    console.error(error);
    json(res, error.status && error.status < 500 ? error.status : 500, { error: 'REQUEST_FAILED', message: 'Не удалось выполнить операцию. Попробуйте ещё раз позже.' });
  }
});
server.requestTimeout = 15_000; server.headersTimeout = 10_000;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramApi = telegramToken ? `https://api.telegram.org/bot${telegramToken}` : null;
let telegramOffset = 0;
async function telegramCall(method, body) {
  const response = await fetch(`${telegramApi}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!value.ok) throw new Error(`Telegram ${method}: ${value.description || response.status}`);
  return value.result;
}
async function answerTelegramMessage(message) {
  const chatId = message?.chat?.id;
  if (!chatId) return;
  const name = message.from?.first_name || 'игрок';
  await telegramCall('sendMessage', {
    chat_id: chatId,
    text: `🎃 BOR CASE\n\nПривет, ${name}! Добро пожаловать! Выигрывай и выводи!`,
    reply_markup: { inline_keyboard: [[{ text: '🎃 Открыть BOR CASE', web_app: { url: `${publicUrl}/` } }]] }
  });
}
async function pollTelegram() {
  if (!telegramApi) return;
  for (;;) {
    try {
      const updates = await telegramCall('getUpdates', { offset: telegramOffset, timeout: 25, allowed_updates: ['message'] });
      for (const update of updates) {
        telegramOffset = Math.max(telegramOffset, Number(update.update_id) + 1);
        if (update.message?.text) await answerTelegramMessage(update.message);
      }
    } catch (error) {
      console.error(error.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}
async function initializeTelegram() {
  if (!telegramApi) return;
  try {
    await telegramCall('deleteWebhook', { drop_pending_updates: false });
    await telegramCall('setChatMenuButton', { menu_button: { type: 'web_app', text: '🎃 Открыть BOR CASE', web_app: { url: `${publicUrl}/` } } });
    await telegramCall('setMyCommands', { commands: [{ command: 'start', description: 'Запустить BOR CASE' }] });
    const bot = await telegramCall('getMe', {});
    console.log(`Telegram bot ready: @${bot.username || 'unknown'}`);
    pollTelegram();
  } catch (error) {
    console.error(`Telegram init: ${error.message}`);
  }
}

server.listen(port, host, () => {
  console.log(`BOR CASE: http://${host}:${port} -> ${publicUrl} (Lave Pay ${paymentsEnabled ? 'enabled' : 'not configured'})`);
  initializeTelegram();
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));



