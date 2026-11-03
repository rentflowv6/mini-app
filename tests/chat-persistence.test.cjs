const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../frontend/dist/assets/index-CGOpgHD2.js'), 'utf8');
const escape = source.slice(source.indexOf('function r(e)'), source.indexOf('async function ss()'));
const chat = source.slice(source.indexOf('const Te="mini_chat_msgs"'), source.indexOf('const os=["theme_variant"'))
  .replace('s.addEventListener("click",()=>d())', 'globalThis.send=d,s.addEventListener("click",()=>d())');

function harness(storage = new Map()) {
  const timers = [], requests = [], replies = [];
  function element() {
    return { style: {}, value: '', innerHTML: '', children: [], listeners: {}, scrollHeight: 100,
      addEventListener(event, listener) { this.listeners[event] = listener; },
      appendChild(child) { this.children.push(child); }, focus() {},
      querySelector() { return this.text || (this.text = element()); } };
  }
  const nodes = Object.fromEntries(['chatLog','chatInput','chatSend','typingIndicator','chatModel','chatClear','chatChips'].map(id => [id, element()]));
  nodes.chatModel.value = 'auto-free';
  const context = vm.createContext({ E: null, Date, Promise,
    document: { getElementById: id => nodes[id], createElement: element },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: resolve => timers.push(resolve),
    p: async (url, options) => { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => replies.shift() }; }
  });
  vm.runInContext(escape + chat + ';is();', context);
  return { context, timers, requests, replies, nodes, storage,
    history: () => JSON.parse(storage.get('mini_chat_msgs') || '[]'),
    render: () => vm.runInContext('as()', context) };
}
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
async function complete(h, sending) { await settle(); while (h.timers.length) { h.timers.shift()(); await settle(); } await sending; }

(async () => {
  for (const model of ['openai/gpt-oss-20b', 'openai/gpt-oss-120b']) {
    const h = harness(), reply = 'ARENA_E2E_OK — retained complete assistant reply **with formatting**';
    h.replies.push({ ok: true, reply, model });
    const sending = h.context.send('hello');
    await settle();
    assert.ok(h.timers.length, 'reply is still animating');
    const message = h.history()[1];
    assert.equal(message.content, reply, 'complete provider reply must be durable before animation finishes');
    assert.equal(message.model, model);
    assert.ok(message.ts);
    const refreshed = harness(h.storage);
    assert.deepEqual(refreshed.history()[1], message, 'reload keeps content/model/time');
    assert.ok(refreshed.render().includes('ARENA_E2E_OK'));
    assert.ok(refreshed.render().includes('via ' + model));
    await complete(h, sending);
    assert.deepEqual(h.history()[1], message, 'animation never overwrites complete history');
    assert.ok(h.nodes.chatLog.children[1].text.innerHTML.includes('ARENA_E2E_OK'));
    assert.ok(h.render().includes('retained complete assistant reply'));
    h.replies.push({ ok: true, reply: 'Next response', model });
    await complete(h, h.context.send('continue'));
    assert.deepEqual(h.requests[1].messages[1], message, 'next API call includes complete assistant context');
  }
  const empty = harness();
  empty.replies.push({ ok: true, reply: '', model: 'reasoning-only-model' });
  await complete(empty, empty.context.send('hello'));
  assert.equal(empty.history().length, 1, 'empty provider output must never become a completed assistant message');
  assert.ok(empty.nodes.chatLog.children.some(node => node.className === 'chat-msg err'), 'empty provider output is visibly reported');
  console.log('PASS: both reported models retain full replies through animation, rerender, reload and next request; empty output reported without fake answer.');
})().catch(error => { console.error(error); process.exitCode = 1; });
