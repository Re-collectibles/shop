const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
const preferenceKey = 're-collectibles-shop-analytics-v1';
const disableKey = 'ga-disable-G-82MNWE7W34';

function setup({ choice = null, host = 're-collectibles.github.io', storageBlocked = false } = {}) {
  let stored = choice;
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const scripts = [];
  const cookies = [];
  const listeners = {};
  const status = {};
  const buttons = {};
  for (const choice of ['allow', 'deny']) {
    buttons[choice] = {
      dataset: { analyticsChoice: choice },
      addEventListener: (_, fn) => { buttons[choice].click = fn; }
    };
  }
  const document = {
    readyState: 'complete',
    head: { appendChild: script => scripts.push(script) },
    createElement: () => ({}),
    querySelectorAll: () => Object.values(buttons),
    getElementById: id => id === 'analytics-status' ? status : null,
    set cookie(value) { cookies.push(value); }
  };
  const window = {
    document,
    location: { hostname: host, origin: 'https://' + host, pathname: '/shop/index.html', search: '?email=private', hash: '#private' },
    localStorage: {
      getItem() { if (storageBlocked) throw new Error('storage blocked'); return stored; },
      setItem(_, value) { if (storageBlocked) throw new Error('storage blocked'); stored = value; }
    },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  vm.runInNewContext(source, { window, document, Date, String, Number });
  return {
    window, scripts, cookies, status,
    tracker: section => window.ShopAnalytics.createSearchTracker(section),
    choose: choice => buttons[choice].click(),
    tick(ms) {
      now += ms;
      for (const [id, entry] of [...timers]) {
        if (entry.at <= now) { timers.delete(id); entry.fn(); }
      }
    },
    messages: () => Array.from(window.dataLayer || [], args => Array.from(args)),
    events() { return this.messages().filter(args => args[0] === 'event'); },
    externalChoice(value) { stored = value; listeners.storage({ key: preferenceKey }); },
    pagehide() { listeners.pagehide(); }
  };
}

test('new visitors record searches automatically without clicking Allow', () => {
  const app = setup();
  assert.equal(app.scripts.length, 1);
  assert.equal(app.window[disableKey], false);
  assert.match(app.status.textContent, /enabled/);
  assert.equal(app.events().length, 0);
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('railway', 8);
  app.tick(2000);
  assert.equal(app.events().length, 1);
  assert.equal(app.events()[0][2].search_term, 'railway');
  assert.equal(app.events()[0][2].result_count, 8);
});

test('a saved opt-out prevents the Google tag and search events until switched on', () => {
  const app = setup({ choice: 'deny' });
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('railway', 8);
  app.tick(2000);
  assert.equal(app.scripts.length, 0);
  assert.equal(app.events().length, 0);
  assert.equal(app.window[disableKey], true);
  assert.match(app.status.textContent, /disabled/);
  app.choose('allow');
  assert.equal(app.scripts.length, 1);
  tracker.schedule('railway', 8);
  tracker.flush();
  assert.equal(app.events().length, 1);
});

test('consent config uses correct ID, no ads, clean page URL, and only one tag', () => {
  const app = setup();
  app.choose('allow');
  app.choose('allow');
  assert.equal(app.scripts.length, 1);
  assert.equal(app.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-82MNWE7W34');
  const defaults = app.messages().find(args => args[0] === 'consent' && args[1] === 'default')[2];
  assert.equal(defaults.analytics_storage, 'granted');
  assert.equal(defaults.ad_storage, 'denied');
  assert.equal(defaults.ad_user_data, 'denied');
  assert.equal(defaults.ad_personalization, 'denied');
  const config = app.messages().find(args => args[0] === 'config');
  assert.equal(config[1], 'G-82MNWE7W34');
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].page_location, 'https://re-collectibles.github.io/shop/index.html');
  assert.equal(config[2].page_referrer, '');
});

test('typing is debounced and records the final term and exact result count', () => {
  const app = setup({ choice: 'allow' });
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('ra', 20);
  app.tick(500);
  tracker.schedule('railway', 3);
  app.tick(1199);
  assert.equal(app.events().length, 0);
  app.tick(1);
  const event = app.events()[0];
  assert.equal(event[1], 'search');
  assert.deepEqual(JSON.parse(JSON.stringify(event[2])), {
    search_term: 'railway', result_count: 3, search_has_results: 'yes',
    search_section: 'full_catalogue', send_to: 'G-82MNWE7W34'
  });
});

test('Enter records zero results once, clearing allows a genuinely repeated search', () => {
  const app = setup({ choice: 'allow' });
  const tracker = app.tracker('new_listings');
  tracker.schedule('  Missing Book  ', 0);
  tracker.flush();
  tracker.flush();
  tracker.schedule('missing book', 0);
  app.tick(1500);
  assert.equal(app.events().length, 1);
  assert.equal(app.events()[0][2].search_term, 'missing book');
  assert.equal(app.events()[0][2].search_has_results, 'no');
  assert.equal(app.events()[0][2].search_section, 'new_listings');
  tracker.cancel();
  tracker.schedule('missing book', 0);
  tracker.flush();
  assert.equal(app.events().length, 2);
});

test('empty input and clear button cancel pending recording', () => {
  const app = setup({ choice: 'allow' });
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('cancelled', 5);
  tracker.schedule('', 10);
  app.tick(1500);
  tracker.schedule('cancelled again', 3);
  tracker.cancel();
  app.tick(1500);
  assert.equal(app.events().length, 0);
});

test('obvious personal/web data and invalid counts are skipped, ISBNs remain eligible', () => {
  const app = setup({ choice: 'allow' });
  const tracker = app.tracker('full_catalogue');
  for (const term of ['', 'x', 'x'.repeat(101), 'reader@example.com', 'https://example.com', 'www.example.com']) {
    tracker.schedule(term, 0);
    tracker.flush();
  }
  for (const count of [-1, NaN, 1.5, '3']) {
    tracker.schedule('book', count);
    tracker.flush();
  }
  assert.equal(app.events().length, 0);
  tracker.schedule('9780140328721', 1);
  tracker.flush();
  assert.equal(app.events().length, 1);
});

test('turning analytics off cancels pending and queued events and removes shop cookies', () => {
  const app = setup({ choice: 'allow' });
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('queued', 1);
  tracker.flush();
  tracker.schedule('pending', 0);
  app.choose('deny');
  app.tick(1500);
  assert.equal(app.window[disableKey], true);
  assert.equal(app.events().length, 0);
  assert.equal(app.cookies.length, 2);
  assert.match(app.cookies[1], /_ga_82MNWE7W34=; Max-Age=0; Path=\/shop\//);
  tracker.schedule('after refusal', 0);
  tracker.flush();
  assert.equal(app.events().length, 0);
});

test('settings in a second tab enable or stop recording; clearing settings restores automatic tracking', () => {
  const app = setup({ choice: 'deny' });
  const tracker = app.tracker('full_catalogue');
  app.externalChoice('allow');
  assert.equal(app.scripts.length, 1);
  tracker.schedule('book', 1);
  app.externalChoice('deny');
  app.tick(1500);
  assert.equal(app.events().length, 0);
  assert.equal(app.window[disableKey], true);
  app.externalChoice(null);
  assert.equal(app.window[disableKey], false);
  tracker.schedule('another book', 2);
  tracker.flush();
  assert.equal(app.events().length, 1);
  assert.equal(app.scripts.length, 1);
});

test('storage failures and a blocked Google tag do not throw or accumulate events', () => {
  const app = setup({ storageBlocked: true });
  assert.equal(app.scripts.length, 1);
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('book', 1);
  app.scripts[0].onerror();
  app.tick(1500);
  tracker.schedule('more books', 3);
  tracker.flush();
  assert.equal(app.events().length, 0);
  app.choose('deny');
  assert.equal(app.window[disableKey], true);
});

test('local previews cannot record even when permission is saved', () => {
  const app = setup({ choice: 'allow', host: 'localhost' });
  const tracker = app.tracker('full_catalogue');
  tracker.schedule('book', 2);
  tracker.flush();
  assert.equal(app.scripts.length, 0);
  assert.equal(app.events().length, 0);
});

test('leaving the page before the pause cancels unfinished searches', () => {
  const app = setup({ choice: 'allow' });
  app.tracker('full_catalogue').schedule('unfinished', 1);
  app.pagehide();
  app.tick(1500);
  assert.equal(app.events().length, 0);
});
