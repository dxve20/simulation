/* ServerLab UI: renders screens from state and wires clicks. Uses SL from data.js + logic.js. */
(function () {
  const $app = document.getElementById('app');
  const $toasts = document.getElementById('toasts');
  const KEY = 'serverlab.v1';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const first = (n) => String(n).trim().split(/\s+/)[0];
  const initials = (n) => String(n).trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  const TOTAL = SL.STEPS.length;

  /* ---------- storage (browser only; works without it) ---------- */
  function loadDB() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    const db = { users: Object.create(null), session: null, mode: 'guided' };
    if (raw && typeof raw === 'object') {
      if (raw.users && typeof raw.users === 'object') for (const k of Object.keys(raw.users)) db.users[k] = raw.users[k];
      db.session = raw.session || null; db.mode = raw.mode === 'challenge' ? 'challenge' : 'guided';
    }
    return db;
  }
  const db = loadDB();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* private window: keep going in memory */ } }

  const S = { view: 'home', user: db.session && db.users[db.session] ? db.users[db.session] : null, run: null, quiz: null, result: null, authTab: 'create', authErr: '', authVals: { name: '', sid: '' }, sheet: null, confirmReset: false };

  /* ---------- small pieces ---------- */
  function patchSvg(mood) {
    const edge = 'style="fill:var(--patch-edge)"', led = 'style="fill:var(--patch-led)"', ln = 'style="fill:none;stroke:var(--patch-led);stroke-width:3;stroke-linecap:round"';
    return `<svg class="patch-svg" data-mood="${mood}" viewBox="0 0 104 104" role="img" aria-label="Patch, your guide">
      <rect x="50" y="4" width="4" height="10" rx="2" ${edge}/><circle class="led-top" cx="52" cy="6" r="6" style="fill:var(--accent)"/>
      <rect x="30" y="84" width="44" height="14" rx="6" ${edge}/><rect x="2" y="34" width="8" height="26" rx="3" ${edge}/><rect x="94" y="34" width="8" height="26" rx="3" ${edge}/>
      <rect x="10" y="12" width="84" height="72" rx="16" style="fill:var(--patch-body);stroke:var(--patch-edge);stroke-width:3"/>
      <rect x="22" y="26" width="60" height="42" rx="10" style="fill:var(--patch-face)"/>
      <g class="e e-idle"><ellipse class="eye-led" cx="40" cy="43.5" rx="5" ry="6.5" ${led}/><ellipse class="eye-led" cx="64" cy="43.5" rx="5" ry="6.5" ${led}/></g>
      <rect class="m m-idle" x="45" y="56" width="14" height="3" rx="1.5" ${led}/>
      <g class="e e-happy"><path d="M33 47 A7 7 0 0 1 47 47" ${ln}/><path d="M57 47 A7 7 0 0 1 71 47" ${ln}/></g>
      <path class="m m-happy" d="M42 54 Q52 66 62 54" ${ln}/>
      <g class="e e-oops"><ellipse cx="40" cy="45" rx="5" ry="3" ${led}/><ellipse cx="64" cy="45" rx="5" ry="3" ${led}/></g>
      <path class="m m-oops" d="M44 62 Q52 54 60 62" ${ln}/></svg>`;
  }
  const logo = () => `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="6" style="fill:var(--primary)"/><rect x="5" y="6" width="18" height="4" rx="1" style="fill:var(--primary-ink)"/><rect x="5" y="12" width="18" height="4" rx="1" style="fill:var(--primary-ink)"/><rect x="5" y="18" width="18" height="4" rx="1" style="fill:var(--primary-ink)"/></svg>`;
  function leds(doneCount, cur, bad) {
    let h = '<div class="leds" aria-hidden="true">';
    for (let i = 0; i < TOTAL; i++) h += `<i class="${i < doneCount ? 'on' : i === cur ? (bad ? 'bad' : 'cur') : ''}"></i>`;
    return h + '</div>';
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = '<i></i>' + esc(msg);
    $toasts.appendChild(t); setTimeout(() => t.remove(), 2800);
    while ($toasts.children.length > 2) $toasts.firstChild.remove();
  }
  const rankOf = () => SL.board(db.users, S.user.id).find((r) => r.me).rank;
  const pts = () => SL.totalPoints(S.user);

  /* ---------- login / sign up ---------- */
  function authView() {
    const c = S.authTab === 'create';
    return `<main class="auth"><div class="wrap auth-grid">
      <section class="auth-pitch">
        <div class="brand">${logo()}<span>ServerLab</span></div>
        <div class="eyebrow" style="margin-top:22px">COC 3 · CSS</div>
        <h1>Install Windows Server 2019 until you can do it blindfolded.</h1>
        <p>A fast, hands-on simulator of the real installer. No loading bars. Every correct click earns points, and Patch explains every wrong one.</p>
        <div class="pitch-patch">${patchSvg('idle')}<div class="bubble"><span class="say-tag">Hi</span><p>I am Patch. Create an account so I can save your points and badges.</p></div></div>
      </section>
      <section class="auth-card" aria-labelledby="auth-h">
        <h2 id="auth-h" class="sr">${c ? 'Create account' : 'Log in'}</h2>
        <div class="seg" role="tablist"><button role="tab" aria-selected="${c}" data-act="authtab" data-p="create">Create account</button><button role="tab" aria-selected="${!c}" data-act="authtab" data-p="login">Log in</button></div>
        <form id="authform" class="auth-card" style="padding:0;border:0;box-shadow:none;background:none" novalidate>
          ${S.authErr ? `<div class="form-err" role="alert">${esc(S.authErr)}</div>` : ''}
          ${c ? `<div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" autocomplete="name" placeholder="Mara Santos" value="${esc(S.authVals.name)}"></div>` : ''}
          <div class="field"><label for="f-sid">Student ID</label><input id="f-sid" name="sid" autocomplete="username" placeholder="e.g. 2026-0142" value="${esc(S.authVals.sid)}"></div>
          <div class="field"><label for="f-pw">Password</label><input id="f-pw" name="pw" type="password" autocomplete="${c ? 'new-password' : 'current-password'}" placeholder="${c ? 'At least 6 characters' : 'Your password'}"></div>
          <button class="btn primary" type="submit">${c ? 'Create account' : 'Log in'}</button>
          <p class="fine">Your points, badges and assessment scores are saved to this account on this device.</p>
        </form>
      </section></div></main>`;
  }
  async function onAuth(form) {
    const fd = new FormData(form), sid = String(fd.get('sid') || '').trim().toLowerCase(), pw = String(fd.get('pw') || '');
    S.authVals = { name: String(fd.get('name') || S.authVals.name || ''), sid: String(fd.get('sid') || '') }; // keep what was typed if there is an error (never the password)
    const fail = (m) => { S.authErr = m; render(); const pwEl = document.getElementById('f-pw'); if (pwEl) pwEl.focus(); };
    if (!/^[a-z0-9._-]{2,30}$/.test(sid)) return fail('Enter your student ID (2 to 30 letters, numbers, dots or dashes).');
    if (S.authTab === 'create') {
      const name = String(fd.get('name') || '').trim();
      if (name.length < 2) return fail('Enter your full name.');
      if (pw.length < 6) return fail('Password needs at least 6 characters.');
      if (db.users[sid]) return fail('That student ID already has an account. Use Log in.');
      const salt = Math.random().toString(36).slice(2);
      db.users[sid] = SL.newUser(sid, name.slice(0, 40), await SL.hashPassword(pw, salt), salt);
      db.session = sid; S.user = db.users[sid]; save(); S.authErr = ''; S.authVals = { name: '', sid: '' }; S.view = 'home'; render();
      toast('Account created. Welcome, ' + first(name) + '.');
    } else {
      const u = db.users[sid];
      if (!u) return fail('No account with that student ID. Check it, or create an account.');
      if ((await SL.hashPassword(pw, u.salt)) !== u.hash) return fail('That password is not right. Passwords are case-sensitive.');
      db.session = sid; S.user = u; save(); S.authErr = ''; S.authVals = { name: '', sid: '' }; S.view = 'home'; render();
      toast('Welcome back, ' + first(u.name) + '.');
    }
  }

  /* ---------- shell ---------- */
  function shell() {
    const u = S.user, tab = S.view === 'board' ? 'board' : S.view === 'badges' ? 'badges' : 'home';
    const tabs = [['home', 'Lessons'], ['board', 'Leaderboard'], ['badges', 'Badges']].map(([k, l]) => `<button class="tab" ${tab === k ? 'aria-current="page"' : ''} data-go="${k}">${l}</button>`).join('');
    return `<header class="appbar"><div class="wrap appbar-in">
      <div class="brand">${logo()}<span>ServerLab</span></div>
      <nav class="tabs" aria-label="Main">${tabs}</nav><span class="grow"></span>
      <span class="chip" aria-label="Your points"><i></i>${pts()} pts</span>
      <button class="userbtn" data-act="account" aria-label="Account"><span class="avatar">${esc(initials(u.name))}</span><span>${esc(first(u.name))}</span></button>
    </div></header>
    <main class="wrap view" id="view">${bodyView()}</main>${sheetView()}`;
  }
  function bodyView() {
    switch (S.view) {
      case 'lesson': return S.run ? lessonView() : homeView();
      case 'board': return boardView();
      case 'badges': return badgesView();
      case 'quiz': return S.quiz ? quizView() : homeView();
      case 'result': return S.result ? resultView() : homeView();
      default: return homeView();
    }
  }

  /* ---------- home ---------- */
  function homeView() {
    const u = S.user, p = pts(), lv = SL.levelFor(p), done = Math.min(u.done || 0, TOTAL), best = u.assess.best;
    const head = done === 0 ? `Start with step 1, ${esc(first(u.name))}.` : done >= TOTAL ? `All ${TOTAL} steps done, ${esc(first(u.name))}.` : `Pick up at step ${done + 1}, ${esc(first(u.name))}.`;
    const startLabel = done === 0 ? 'Start lesson' : done >= TOTAL ? 'Replay lesson' : 'Continue lesson';
    const locked = done < TOTAL;
    const bestTxt = best == null ? '' : `Best score ${best * 10}% ${best * 10 >= SL.PASS ? '(passed)' : '(not passed yet)'}`;
    return `<section class="hero">
      <div><div class="eyebrow">Welcome back</div><h1>${head}</h1>
        <div class="lvl"><div class="lvl-row"><span>Level ${lv.cur.n} · ${lv.cur.name}</span><span>${lv.next ? p + ' / ' + lv.next.at + ' pts' : p + ' pts · top level'}</span></div>
        <div class="meter" role="img" aria-label="Level progress"><b style="width:${lv.next ? Math.round((lv.into / lv.span) * 100) : 100}%"></b></div></div></div>
      <div class="stats"><div class="stat"><b>${p}</b><span>Points</span></div><div class="stat"><b>#${rankOf()}</b><span>Class rank</span></div>
        <div class="stat"><b>${done} / ${TOTAL}</b><span>Steps done</span></div><div class="stat"><b>${Object.keys(u.badges).length} / ${SL.BADGES.length}</b><span>Badges</span></div></div></section>
      <section><div class="sec-head"><h2>Your rack</h2></div><div class="units">
        <article class="unit"><div class="ear l"></div><div class="unit-body">
          <div class="unit-top"><div><span class="unit-tag">COC 3 · LESSON 1</span><h3 style="margin-top:6px">Install Windows Server 2019</h3></div>${leds(done, done)}</div>
          <p>Boot the installer, pick the right edition, partition the disk and finish first sign-in. ${TOTAL} steps, no loading screens.</p>
          <div class="unit-actions"><button class="btn primary" data-act="startlesson">${startLabel}</button><button class="btn" data-act="study">Study sheet</button>
            <button class="btn ${locked ? 'locked' : ''}" data-act="startquiz" ${locked ? 'aria-disabled="true"' : ''}>Take assessment</button>
            <span class="note-lock">${locked ? 'Finish the lesson to unlock the assessment. Pass mark ' + SL.PASS + '%.' : bestTxt}</span></div>
        </div><div class="ear r"></div></article>
        <article class="unit planned"><div class="ear l"></div><div class="unit-body"><div class="unit-top"><div><span class="unit-tag">COC 4</span><h3 style="margin-top:6px">COC 4 topics</h3></div></div>
          <p>Coming next. The topics get the same hands-on treatment: click it, get told why it is wrong, earn points.</p></div><div class="ear r"></div></article>
      </div></section>`;
  }

  /* ---------- leaderboard + badges ---------- */
  function boardView() {
    const rows = SL.board(db.users, S.user.id).map((r) => `<tr class="${r.me ? 'me' : ''}"><td class="rk">${r.rank}</td><td>${esc(r.name)}${r.me ? ' (you)' : ''}${r.sample ? '<span class="tag">sample</span>' : ''}<small class="lv">Lv ${r.level.n} · ${r.level.name}</small></td><td>Lv ${r.level.n} · ${r.level.name}</td><td class="num">${r.points}</td></tr>`).join('');
    return `<section><div class="eyebrow">Leaderboard</div><h1 style="font-size:clamp(1.7rem,4.5vw,2.4rem);margin-block:4px 8px">Class leaderboard</h1>
      <p class="muted" style="max-width:62ch">A correct click earns 10 points on the first try (20 in Challenge mode), or half after a mistake or hint. Each question you get right in the assessment adds 10.</p></section>
      <section><div class="board-wrap"><table class="board"><thead><tr><th>Rank</th><th>Student</th><th>Level</th><th class="num">Points</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="fine" style="margin-top:10px">Sample classmates are placeholders. Accounts made on this device also show up here.</p></section>`;
  }
  function badgesView() {
    const u = S.user;
    const b = SL.BADGES.map((x) => `<div class="badge ${u.badges[x.id] ? 'got' : ''}"><div class="plate">${x.code}</div><div><h3>${x.title}</h3><p>${x.desc}</p></div></div>`).join('');
    const att = u.assess.attempts.slice().reverse().map((a) => `<div class="hrow"><span>${new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${a.right} of ${a.total} correct</span><b style="color:var(--${a.pass ? 'good' : 'bad'})">${a.pct}% ${a.pass ? 'passed' : 'not passed'}</b></div>`).join('');
    return `<section><div class="eyebrow">Achievements</div><h1 style="font-size:clamp(1.7rem,4.5vw,2.4rem);margin-block:4px 8px">Badges · ${Object.keys(u.badges).length} of ${SL.BADGES.length}</h1></section>
      <section><div class="badges">${b}</div></section>
      <section><div class="sec-head"><h2>Assessment history</h2></div><div class="history">${att || '<p class="muted">No attempts yet. Finish the lesson to unlock the assessment.</p>'}</div></section>`;
  }

  /* ---------- lesson ---------- */
  function defaultVm(from) {
    const vm = { compName: 'WIN-' + Array.from({ length: 11 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('') };
    if (from >= 8) vm.parts = [{ name: 'Drive 0 Partition 1: System Reserved', total: '500.0 MB', free: '481.0 MB', type: 'System' }, { name: 'Drive 0 Partition 2', total: '59.5 GB', free: '59.5 GB', type: 'Primary' }];
    if (from >= 11) vm.adminPass = 'Lab@2019';
    return vm;
  }
  function startRun(from) {
    const id = SL.STEPS[from].id;
    S.run = { step: from, local: SL.initLocal(id), vm: defaultVm(from), mistakes: 0, hinted: false, hintsTotal: 0, mode: db.mode, say: { kind: 'goal' }, mood: 'idle', clean: {}, finished: false, shake: false };
    if (from === 11) S.run.say = { kind: 'nudge', msg: 'Welcome back. Passwords are not saved, so your lab password is now Lab@2019.' };
    S.view = 'lesson';
  }
  const goalText = (run) => (run.mode === 'challenge' ? 'Challenge mode: do this step from memory. I only speak up when you slip.' : SL.STEPS[run.step].goal);

  function bubbleView(run) {
    const say = run.say || { kind: 'goal' };
    let tag = 'Goal', cls = '', msg = say.msg || goalText(run), next = '';
    if (say.kind === 'good') { tag = say.pts ? 'Correct +' + say.pts : 'Correct'; cls = 'good'; next = ['Next step', run.finished ? 'Lesson complete. Take the assessment to check what stuck.' : goalText(run)]; }
    else if (say.kind === 'bad') { tag = 'Not quite'; cls = 'bad'; next = ['Try again', goalText(run)]; }
    else if (say.kind === 'hint') { tag = 'Hint'; next = ['Your step', goalText(run)]; }
    else if (say.kind === 'nudge') { tag = 'Heads up'; next = ['Your step', goalText(run)]; }
    return `<div class="bubble"><span class="say-tag ${cls}">${tag}</span><p>${esc(msg)}</p>${next ? `<div class="next"><small>${next[0]}</small>${esc(next[1])}</div>` : ''}</div>`;
  }
  function lessonView() {
    const run = S.run, step = SL.STEPS[run.step], n = run.step + 1;
    const shake = run.shake; run.shake = false;
    const guided = run.mode === 'guided';
    const cad = step.id === 'signin' && run.local.stage === 'lock', ff = step.id === 'install2';
    return `<div class="simbar"><div><div class="eyebrow">COC 3 · Install Windows Server 2019</div><h2>${run.finished ? 'Lesson complete' : guided ? `Step ${n} of ${TOTAL}: ${step.title}` : `Step ${n} of ${TOTAL}`}</h2></div>
        <div class="unit-actions"><button class="btn small" data-act="study">Study sheet</button><button class="btn small ghost" data-act="restart">Restart lesson</button><button class="btn small ghost" data-go="home">Back to lessons</button></div></div>
      <div class="sim">
        <div class="vm"><div class="vm-bar"><div class="title"><i></i><span>WS2019-LAB · running</span></div>
          <button class="vm-btn ${cad ? 'pulse' : ''}" data-act="cad">Ctrl+Alt+Del</button><button class="vm-btn ${ff ? 'pulse' : ''}" data-act="ff">Fast-forward</button><button class="vm-btn" data-act="vmreset">Restart VM</button></div>
          <div class="vm-screen ${shake ? 'shake' : ''}">${vmView(run)}</div></div>
        <aside class="patch" aria-live="polite" aria-label="Patch, your guide">
          <div class="patch-top"><div class="patch-fig">${patchSvg(run.mood)}<div class="patch-meta"><b>Patch</b><span class="modepill">${guided ? 'Guided' : 'Challenge'}</span></div></div>${bubbleView(run)}</div>
          <div class="patch-foot">${leds(run.finished ? TOTAL : run.step, run.step, run.mistakes > 0)}<span class="runpts">Total ${pts()} pts</span></div>
          ${run.finished
            ? `<div class="done-box"><button class="btn primary" data-act="startquiz">Take the assessment</button><button class="btn" data-go="home">Back to lessons</button></div>`
            : `<div class="patch-actions"><button class="btn small" data-act="hint">Need a hint?</button><button class="btn small ghost" data-act="mode">${guided ? 'Try Challenge mode' : 'Back to Guided'}</button></div>
               <p class="fine">This step: +${SL.stepPoints(run.mode, run.mistakes, run.hinted)} pts${run.mistakes || run.hinted ? ' (reduced)' : ''}</p>`}
        </aside></div>`;
  }

  /* VM screens */
  const wbtn = (act, label, on, extra = '') => `<button class="wbtn ${on ? 'primary' : 'dim'}" data-act="${act}" ${on ? '' : 'aria-disabled="true"'} ${extra}>${label}</button>`;
  const win = (body, foot, cap = 'Windows Setup') => `<div class="setup"><div class="setup-win"><div class="setup-cap">${cap}</div><div class="setup-body">${body}</div>${foot ? `<div class="setup-foot">${foot}</div>` : ''}</div></div>`;
  const opts = (list, val) => list.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  function diskTable(rows, sel, interactive) {
    return `<div class="tbl" role="listbox"><div class="trow dk head"><span>Name</span><span>Total size</span><span>Free space</span></div>${rows.map((r, i) => `<button class="trow dk" role="option" aria-selected="${sel === i}" ${interactive ? `data-act="sel" data-p="${i}"` : 'tabindex="-1"'}><span>${esc(r[0])}</span><span>${r[1]}</span><span>${r[2]}</span></button>`).join('')}</div>`;
  }
  function vmView(run) {
    const l = run.local, vm = run.vm, id = SL.STEPS[run.step].id, guided = run.mode === 'guided';
    switch (id) {
      case 'boot': return `<div class="fw"><div class="fw-h">Virtual BIOS · Boot menu</div><p>Select the device to boot from:</p>
        <button class="fw-opt" data-act="boot" data-p="hdd"><span>1</span>Hard Disk (empty)</button><button class="fw-opt" data-act="boot" data-p="cd"><span>2</span>CD/DVD Drive: Windows Server 2019</button><button class="fw-opt" data-act="boot" data-p="pxe"><span>3</span>Network boot (PXE)</button>
        <div class="fw-f">Click a device<span class="cursor"></span></div></div>`;
      case 'language': return win(`<h3>Windows Server 2019</h3>
        <div class="vmfield"><label for="v-lang">Language to install:</label><select id="v-lang" data-field="lang">${opts(SL.LANGS, l.lang)}</select></div>
        <div class="vmfield"><label for="v-time">Time and currency format:</label><select id="v-time" data-field="time">${opts(SL.TIMES, l.time)}</select></div>
        <div class="vmfield"><label for="v-kb">Keyboard or input method:</label><select id="v-kb" data-field="kb">${opts(SL.KBS, l.kb)}</select></div>`, wbtn('next', 'Next', true));
      case 'install': return win(`<div class="center-install" style="display:flex;flex-direction:column;align-items:center;gap:22px;padding-block:18px"><h3>Windows Server 2019</h3><button class="wbtn primary big-install" data-act="install">Install now</button></div>`, '<button class="linkbtn" data-act="repair">Repair your computer</button>');
      case 'edition': {
        const d = l.sel === null ? 'Select an edition in the list to see what it installs.' : SL.EDITIONS[l.sel].desc;
        return win(`<h3>Select the operating system you want to install</h3><div class="tbl" role="listbox"><div class="trow ed head"><span>Operating system</span><span>Architecture</span></div>${SL.EDITIONS.map((e, i) => `<button class="trow ed" role="option" aria-selected="${l.sel === i}" data-act="sel" data-p="${i}"><span>${e.name}</span><span>x64</span></button>`).join('')}</div><div class="desc"><b>Description:</b> ${d}</div>`, wbtn('next', 'Next', l.sel !== null));
      }
      case 'license': return win(`<h3>Applicable notices and license terms</h3><div class="licbox" tabindex="0"><p><b>Sample text for the simulator.</b> The real screen shows the Microsoft Software License Terms for Windows Server 2019.</p><p>1. You may install and use the software on the server you are setting up.</p><p>2. Read the terms on the real installer before you accept them.</p><p>3. You must accept the terms to continue with the installation.</p></div>
        <label class="chk"><input type="checkbox" data-act="toggle" ${l.checked ? 'checked' : ''}> I accept the license terms</label>`, wbtn('next', 'Next', l.checked));
      case 'type': return win(`<h3>Which type of installation do you want?</h3>
        <button class="opt" data-act="upgrade"><b>Upgrade: Install Windows and keep files, settings, and applications</b><span>Files, settings and applications are moved to Windows with this option. It is only available when a supported version of Windows is already running.</span></button>
        <button class="opt" data-act="custom"><b>Custom: Install Windows only (advanced)</b><span>Files, settings and applications are not moved to Windows with this option. Use it to change partitions and drives.</span></button>`);
      case 'disk1': {
        const sel = l.sel;
        return win(`<h3>Where do you want to install Windows?</h3>${diskTable([['Drive 0 Unallocated Space', '60.0 GB', '60.0 GB']], sel ? 0 : -1, true)}
          <div class="dkbtns"><button class="linkbtn" tabindex="-1">Refresh</button><button class="linkbtn" aria-disabled="true" data-act="disabled">Delete</button><button class="linkbtn" aria-disabled="true" data-act="disabled">Format</button><button class="linkbtn ${sel ? '' : 'off'}" ${sel ? '' : 'aria-disabled="true"'} data-act="new">New</button><button class="linkbtn" data-act="loaddrv">Load driver</button><button class="linkbtn" aria-disabled="true" data-act="disabled">Extend</button></div>`, wbtn('noop', 'Next', false));
      }
      case 'disk2': return `<div style="position:relative">${win(`<h3>Where do you want to install Windows?</h3>${diskTable([['Drive 0 Unallocated Space', '60.0 GB', '60.0 GB']], 0, false)}
          <div class="vmfield"><label for="v-size">Size:</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input id="v-size" type="text" inputmode="numeric" data-field="size" data-enter="apply" value="${esc(l.size)}" style="max-width:140px"> MB <button class="wbtn primary" data-act="apply">Apply</button><button class="wbtn" data-act="cancel">Cancel</button></div></div>`, '')}
          ${l.dialog ? `<div class="vm-dialog" role="alertdialog" aria-label="Windows Setup message"><div class="win"><div class="cap">Windows Setup</div><div class="bd"><p>To ensure that all Windows features work correctly, Windows might create additional partitions for system files.</p></div><div class="ft"><button class="wbtn primary" data-act="dialogok">OK</button></div></div></div>` : ''}</div>`;
      case 'disk3': return win(`<h3>Where do you want to install Windows?</h3>${diskTable(vm.parts.map((p) => [p.name, p.total, p.free]), l.sel === null ? -1 : l.sel, true)}
          <div class="dkbtns"><button class="linkbtn" tabindex="-1">Refresh</button><button class="linkbtn" data-act="delete">Delete</button><button class="linkbtn" aria-disabled="true" data-act="disabled">Format</button><button class="linkbtn" aria-disabled="true" data-act="disabled">New</button><button class="linkbtn" aria-disabled="true" data-act="disabled">Extend</button></div>`, wbtn('next', 'Next', l.sel !== null));
      case 'install2': return win(`<h3>Installing Windows</h3><ul class="phases">${['Copying Windows files', 'Getting files ready for installation', 'Installing features', 'Installing updates', 'Finishing up'].map((t) => `<li class="todo">${t}</li>`).join('')}</ul><p class="skip-note">In real life this takes a while and the server restarts several times. Use Fast-forward above the screen to skip the wait.</p>`, '', 'Installing Windows');
      case 'password': return `<div class="bluepage"><h3>Customize settings</h3><p>Type a password for the built-in administrator account that you can use to sign in to this computer.</p>
        <div class="vmfield"><label for="v-user">User name</label><input id="v-user" type="text" value="Administrator" readonly></div>
        <div class="vmfield"><label for="v-p1">Password</label><input id="v-p1" type="password" data-field="p1" data-enter="finish" autocomplete="off" value="${esc(l.p1)}"></div>
        <div class="vmfield"><label for="v-p2">Reenter password</label><input id="v-p2" type="password" data-field="p2" data-enter="finish" autocomplete="off" value="${esc(l.p2)}"></div>
        ${guided ? '<p style="font-size:.85rem;opacity:.85">Lab rule: 8+ characters, with 3 of: uppercase, lowercase, numbers, symbols.</p>' : ''}
        <button class="wbtn primary" data-act="finish">Finish</button></div>`;
      case 'signin': {
        if (l.stage === 'lock') { const d = new Date(); return `<div class="bluepage lock" data-act="lockclick" role="button" tabindex="0"><div class="clock">${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')}</div><div class="day">${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div><div class="msg">Press Ctrl+Alt+Delete to unlock</div></div>`; }
        return `<div class="bluepage signin"><div class="face"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="20" r="11" fill="#fff"/><path d="M6 52c2-13 12-19 22-19s20 6 22 19z" fill="#fff"/></svg></div><h3 style="font-size:1.4rem">Administrator</h3>
          <div class="row"><input type="password" aria-label="Password" placeholder="Password" data-field="pw" data-enter="signin" autocomplete="off" value="${esc(l.pw)}"><button data-act="signin" aria-label="Sign in">&rarr;</button></div></div>`;
      }
      case 'sm': {
        const nav = [['dash', 'Dashboard'], ['local', 'Local Server'], ['all', 'All Servers'], ['files', 'File and Storage Services']].map(([k, t]) => `<button class="${l.page === k ? 'on' : ''}" data-act="nav" data-p="${k}">${t}</button>`).join('');
        let main;
        if (l.page === 'local') main = `<div class="props"><h4>PROPERTIES For ${esc(vm.compName)}</h4><dl><dt>Computer name</dt><dd class="hl"><button class="linkbtn" data-act="name">${esc(vm.compName)}</button></dd><dt>Workgroup</dt><dd>WORKGROUP</dd><dt>Remote management</dt><dd>Enabled</dd><dt>Remote Desktop</dt><dd>Disabled</dd><dt>Operating system version</dt><dd>Microsoft Windows Server 2019 Standard</dd></dl></div>`;
        else if (l.page === 'dash') main = `<div class="welcome"><h4>WELCOME TO SERVER MANAGER</h4><ul><li><button data-act="tile"><span>1</span>Configure this local server</button></li><li><button data-act="tile"><span>2</span>Add roles and features</button></li><li><button data-act="tile"><span>3</span>Add other servers to manage</button></li><li><button data-act="tile"><span>4</span>Create a server group</button></li></ul></div>`;
        else main = `<p>This page works in the real Server Manager. This lesson only needs Local Server.</p>`;
        return `<div class="sm"><div class="sm-nav">${nav}</div><div class="sm-main"><div class="sm-head">Server Manager <small>› ${{ dash: 'Dashboard', local: 'Local Server', all: 'All Servers', files: 'File and Storage Services' }[l.page]}</small></div><div class="sm-body">${main}</div></div></div>`;
      }
    }
    return '';
  }

  /* step actions */
  function act(a, p) {
    const run = S.run; if (!run || run.finished) return;
    const step = SL.STEPS[run.step];
    const r = SL.check(step.id, a, p, run.local, run.vm);
    if (!r) return;
    if (r.patch) Object.assign(run.local, r.patch);
    if (r.vm) Object.assign(run.vm, r.vm);
    if (r.kind === 'local') { run.mood = 'idle'; if (r.msg) run.say = { kind: 'good', msg: r.msg, pts: 0 }; }
    else if (r.kind === 'nudge') { run.mood = 'idle'; run.say = { kind: 'nudge', msg: r.msg }; }
    else if (r.kind === 'bad') { run.mistakes++; run.mood = 'oops'; run.shake = true; run.say = { kind: 'bad', msg: r.msg }; }
    else if (r.kind === 'ok') return completeStep(step);
    render();
  }
  function completeStep(step) {
    const run = S.run, u = S.user;
    const earned = SL.stepPoints(run.mode, run.mistakes, run.hinted), prev = u.stepBest[step.id] || 0, gain = Math.max(0, earned - prev);
    u.stepBest[step.id] = Math.max(prev, earned);
    run.clean[step.id] = run.mistakes === 0 && !run.hinted;
    u.done = Math.max(u.done || 0, run.step + 1);
    const got = SL.awardBadges(u, { type: 'step', id: step.id, mistakes: run.mistakes, hinted: run.hinted, clean: run.clean });
    const last = run.step === TOTAL - 1;
    if (last) got.push(...SL.awardBadges(u, { type: 'lesson', hints: run.hintsTotal }));
    save();
    run.say = { kind: 'good', msg: step.ok, pts: gain }; run.mood = 'happy';
    if (last) run.finished = true; else { run.step++; run.local = SL.initLocal(SL.STEPS[run.step].id); run.mistakes = 0; run.hinted = false; }
    render();
    const chip = document.querySelector('.chip'); if (chip && gain) chip.classList.add('pop');
    toast(gain ? '+' + gain + ' pts' : 'Correct. Points for this step were already counted.');
    for (const id of got) toast('Badge earned: ' + SL.BADGES.find((b) => b.id === id).title);
  }

  /* ---------- assessment ---------- */
  function quizView() {
    const q = S.quiz, it = q.items[q.i], last = q.i === q.items.length - 1;
    return `<section class="quiz"><div class="simbar"><div><div class="eyebrow">Assessment · COC 3</div><h2>Question ${q.i + 1} of ${q.items.length}</h2></div><span class="chip"><i></i>Pass mark ${SL.PASS}%</span></div>
      <div class="meter" role="img" aria-label="Quiz progress"><b style="width:${Math.round(((q.i + 1) / q.items.length) * 100)}%;background:var(--primary)"></b></div>
      <div class="qcard"><h2>${esc(it.q)}</h2><div class="choices" role="radiogroup" aria-label="Answers">${it.opts.map((o, j) => `<button class="choice" role="radio" aria-checked="${q.picks[q.i] === j}" data-act="pick" data-p="${j}"><span class="key">${'ABCD'[j]}</span><span>${esc(o)}</span></button>`).join('')}</div>
        <div class="qnav"><button class="btn ghost" data-act="qprev" ${q.i === 0 ? 'aria-disabled="true" style="visibility:hidden"' : ''}>Back</button><button class="btn primary" data-act="qnext">${last ? 'Finish assessment' : 'Next question'}</button></div></div></section>`;
  }
  function submitQuiz() {
    const u = S.user, sc = SL.scoreQuiz(S.quiz);
    u.assess.attempts.push({ at: Date.now(), right: sc.right, total: sc.total, pct: sc.pct, pass: sc.pass });
    const prevBest = u.assess.best == null ? -1 : u.assess.best;
    u.assess.best = Math.max(prevBest, sc.right);
    const got = SL.awardBadges(u, { type: 'quiz', pct: sc.pct });
    save();
    S.result = Object.assign({ gain: Math.max(0, sc.right - Math.max(prevBest, 0)) * 10, quiz: S.quiz }, sc);
    S.quiz = null; S.view = 'result'; render(); window.scrollTo(0, 0);
    for (const id of got) toast('Badge earned: ' + SL.BADGES.find((b) => b.id === id).title);
  }
  function resultView() {
    const r = S.result, q = r.quiz, missed = q.items.map((it, i) => ({ it, i })).filter(({ it, i }) => q.picks[i] !== it.correct);
    const rev = missed.map(({ it, i }) => `<div class="ritem no"><b>Question ${i + 1} · ${esc(it.q)}</b><span>You chose: ${q.picks[i] == null ? 'no answer' : '"' + esc(it.opts[q.picks[i]]) + '"'}. Correct: "${esc(it.opts[it.correct])}".</span><span class="why">${esc(it.why)}</span></div>`).join('');
    return `<section class="quiz"><div class="qcard"><div class="score"><div class="ring" style="--p:${r.pct};--ringc:var(--${r.pass ? 'good' : 'bad'})"><div>${r.pct}%</div></div>
      <div><h2 class="verdict ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'Passed' : 'Not yet'}</h2><p>You got ${r.right} of ${r.total} right. The pass mark is ${SL.PASS}%.</p><p class="muted">${r.gain ? '+' + r.gain + ' pts added to your total.' : 'No new points. Your best score still counts.'}</p></div></div>
      <div class="patch-top" style="align-items:flex-end"><div class="patch-fig">${patchSvg(r.pass ? 'happy' : 'oops')}</div><div class="bubble" style="flex:1"><span class="say-tag ${r.pass ? 'good' : 'bad'}">${r.pass ? 'Well done' : 'Keep going'}</span><p>${r.pass ? (missed.length ? 'You know where each choice leads. Look at the ones you missed below.' : 'Every answer right. You know this install cold.') : 'You need ' + Math.ceil(r.total * SL.PASS / 100) + ' right to pass. Read the reasons below, check the study sheet and try again.'}</p></div></div>
      ${missed.length ? `<div class="review"><h3>Review the ones you missed</h3>${rev}</div>` : ''}
      <div class="unit-actions"><button class="btn primary" data-go="home">Back to lessons</button><button class="btn" data-act="startquiz">Retake assessment</button><button class="btn ghost" data-act="study">Study sheet</button></div></div></section>`;
  }

  /* ---------- sheets ---------- */
  function sheetView() {
    if (S.sheet === 'study') return `<div class="overlay" data-act="closesheet"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-h"><h2 id="sh-h">Study sheet: Install Windows Server 2019</h2><p class="muted">Learn the order, then switch Patch to Challenge mode and run it from memory.</p><ol>${SL.STEPS.map((s) => `<li><b>${s.title}.</b> ${s.short}.</li>`).join('')}</ol><button class="btn primary" data-act="closesheet">Close</button></div></div>`;
    if (S.sheet === 'account') return `<div class="overlay" data-act="closesheet"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-h"><h2 id="sh-h">Your account</h2><p><b>${esc(S.user.name)}</b><br><span class="muted">Student ID ${esc(S.user.id)}</span></p>
      <div class="unit-actions"><button class="btn" data-act="logout">Log out</button><button class="btn ${S.confirmReset ? 'primary' : ''}" data-act="reset">${S.confirmReset ? 'Yes, reset my progress' : 'Reset my progress'}</button><button class="btn ghost" data-act="closesheet">Close</button></div>
      <p class="fine">Reset clears your points, badges and scores for this account. Progress is saved in this browser only.</p></div></div>`;
    return '';
  }

  /* ---------- render + events ---------- */
  function render() {
    const ae = document.activeElement, key = ae && ae !== document.body ? { act: ae.getAttribute('data-act'), p: ae.getAttribute('data-p'), id: ae.id, go: ae.getAttribute('data-go'), field: ae.getAttribute('data-field') } : null;
    $app.innerHTML = S.user ? shell() : authView();
    if (key) {
      let el = null;
      if (key.id) el = document.getElementById(key.id);
      if (!el && key.field) el = $app.querySelector(`[data-field="${key.field}"]`);
      if (!el && key.act) el = $app.querySelector(`[data-act="${key.act}"]` + (key.p != null ? `[data-p="${key.p}"]` : ''));
      if (!el && key.go) el = $app.querySelector(`[data-go="${key.go}"]`);
      if (el && el.focus) el.focus({ preventScroll: true });
    }
  }
  function go(view) { S.view = view; S.sheet = null; render(); window.scrollTo(0, 0); }
  function startQuiz() {
    if ((S.user.done || 0) < TOTAL) return toast('Finish the lesson first to unlock the assessment.');
    S.quiz = SL.newQuiz(); S.view = 'quiz'; S.sheet = null; render(); window.scrollTo(0, 0);
  }
  const handlers = {
    authtab: (p) => { S.authTab = p; S.authErr = ''; render(); },
    account: () => { S.sheet = 'account'; S.confirmReset = false; render(); },
    closesheet: (p, e) => { if (e.target.classList.contains('overlay') || e.target.closest('button')) { S.sheet = null; render(); } },
    study: () => { S.sheet = 'study'; render(); },
    logout: () => { db.session = null; save(); S.authVals = { name: '', sid: '' }; S.user = null; S.run = null; S.quiz = null; S.sheet = null; S.view = 'home'; render(); },
    reset: () => {
      if (!S.confirmReset) { S.confirmReset = true; return render(); }
      const u = S.user; u.stepBest = {}; u.done = 0; u.badges = {}; u.assess = { best: null, attempts: [] }; u.clean = {};
      S.run = null; S.confirmReset = false; S.sheet = null; save(); S.view = 'home'; render(); toast('Progress reset.');
    },
    startlesson: () => { const d = S.user.done || 0; startRun(d >= TOTAL ? 0 : d); render(); window.scrollTo(0, 0); },
    restart: () => { startRun(0); render(); },
    startquiz: startQuiz,
    hint: () => { const run = S.run; if (!run || run.finished) return; if (!run.hinted) run.hintsTotal++; run.hinted = true; run.mood = 'idle'; run.say = { kind: 'hint', msg: SL.STEPS[run.step].hint }; render(); },
    mode: () => { const run = S.run; if (!run) return; run.mode = run.mode === 'guided' ? 'challenge' : 'guided'; db.mode = run.mode; save(); run.say = { kind: 'nudge', msg: run.mode === 'challenge' ? 'Challenge mode on. Steps are worth double, and I stop giving the goal.' : 'Guided mode on. I will give the goal for each step again.' }; render(); },
    vmreset: () => { const run = S.run; if (!run || run.finished) return; run.local = SL.initLocal(SL.STEPS[run.step].id); run.mood = 'idle'; run.say = { kind: 'nudge', msg: 'VM restarted. This step is back to how it started.' }; render(); },
    cad: () => { if (!S.run) return; if (SL.STEPS[S.run.step].id === 'signin') act('cad'); else { S.run.say = { kind: 'nudge', msg: 'Ctrl+Alt+Del is only needed at the sign-in screen.' }; S.run.mood = 'idle'; render(); } },
    ff: () => { if (!S.run) return; if (SL.STEPS[S.run.step].id === 'install2') act('ff'); else { S.run.say = { kind: 'nudge', msg: 'Fast-forward is for the installation wait. Nothing to skip right now.' }; S.run.mood = 'idle'; render(); } },
    pick: (p) => { S.quiz.picks[S.quiz.i] = Number(p); render(); },
    qprev: () => { if (S.quiz.i > 0) { S.quiz.i--; render(); } },
    qnext: () => {
      const q = S.quiz;
      if (q.picks[q.i] == null) return toast('Pick an answer first.');
      if (q.i < q.items.length - 1) { q.i++; render(); window.scrollTo(0, 0); return; }
      const left = q.picks.filter((x) => x == null).length;
      if (left) { q.i = q.picks.findIndex((x) => x == null); render(); return toast(left + ' question' + (left > 1 ? 's' : '') + ' still unanswered.'); }
      submitQuiz();
    },
  };
  const stepActs = new Set(['boot', 'next', 'install', 'repair', 'sel', 'toggle', 'upgrade', 'custom', 'new', 'loaddrv', 'disabled', 'apply', 'cancel', 'dialogok', 'delete', 'finish', 'lockclick', 'signin', 'nav', 'tile', 'name', 'noop']);

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); return go(g.getAttribute('data-go')); }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.getAttribute('data-act'), p = el.getAttribute('data-p');
    if (a === 'noop') { if (S.run) { S.run.say = { kind: 'nudge', msg: 'Next is grey. Finish the task on this screen first.' }; render(); } return; }
    if (a === 'closesheet' && el.classList.contains('overlay') === false && !el.matches('button')) return;
    if (handlers[a]) return handlers[a](p, e);
    if (stepActs.has(a) && S.view === 'lesson') act(a, p);
  });
  function onField(e) {
    const el = e.target.closest('[data-field]'); if (!el || !S.run || S.view !== 'lesson') return;
    const id = SL.STEPS[S.run.step].id, f = el.getAttribute('data-field');
    const r = SL.check(id, 'set', id === 'language' || id === 'password' ? { field: f, value: el.value } : { field: f, value: el.value }, S.run.local, S.run.vm);
    if (!r) return;
    if (r.patch) Object.assign(S.run.local, r.patch);
  }
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-field]'); if (!el || !S.run) return;
    const id = SL.STEPS[S.run.step].id, f = el.getAttribute('data-field');
    if (id === 'disk2' && f === 'size') { S.run.local.size = el.value; return; }
    if (id === 'signin') { S.run.local.pw = el.value; return; }
    onField(e);
  });
  document.addEventListener('change', onField);
  document.addEventListener('submit', (e) => { if (e.target.id === 'authform') { e.preventDefault(); onAuth(e.target); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); return; }
    if (e.key === 'Enter') {
      const el = e.target.closest && e.target.closest('[data-enter]');
      if (el && S.run) { e.preventDefault(); const a = el.getAttribute('data-enter'); if (el.hasAttribute('data-field')) { /* value already synced by input event */ } act(a); }
      else if (e.target.matches && e.target.matches('.lock[data-act]')) act('lockclick');
    }
  });

  render();
})();