/* ServerLab logic: step checks, scoring, levels, badges, quiz. Pure functions, no DOM. */
 
const _ok = (msg) => ({ kind: 'ok', msg });
const _bad = (msg) => ({ kind: 'bad', msg });
const _local = (patch, msg) => ({ kind: 'local', patch, msg });
const _nudge = (msg, patch) => ({ kind: 'nudge', msg, patch });
 
SL.stepIndex = (id) => SL.STEPS.findIndex((s) => s.id === id);
 
/* Starting local (screen) state for each step. */
SL.initLocal = (id) => {
  switch (id) {
    case 'language': return { lang: SL.LANGS[0], time: SL.TIMES[0], kb: SL.KBS[0] };
    case 'edition': return { sel: null };
    case 'license': return { checked: false };
    case 'disk1': return { sel: false };
    case 'disk2': return { size: '61440', dialog: false };
    case 'disk3': return { sel: null };
    case 'password': return { p1: '', p2: '' };
    case 'signin': return { stage: 'lock', pw: '' };
    case 'sm': return { page: 'dash' };
    default: return {};
  }
};
 
/* Password rule used in this lab: 8+ characters and 3 of 4 character types. */
SL.passwordCheck = (p) => {
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (!p) return { ok: false, msg: 'The Administrator password cannot be blank. Type a password in both boxes.' };
  if (p.length < 8) return { ok: false, msg: 'Too short. The lab rule is at least 8 characters.' };
  if (types < 3) return { ok: false, msg: 'Not complex enough. Use 3 of these 4: uppercase, lowercase, numbers, symbols. Example: Server2019.' };
  return { ok: true, msg: '' };
};
 
/*
  Check one action on one step.
  a = action name, p = payload, l = local state of this step, vm = lab data (partitions, password)
  Returns { kind: 'ok'|'bad'|'local'|'nudge', msg?, patch?, vm? }
    ok    -> step done (+points)
    bad   -> wrong choice, Patch explains why, no points
    local -> changes only the screen (selecting a row, typing)
    nudge -> a disabled control was pressed, Patch says why, no penalty
*/
SL.check = (id, a, p, l, vm) => {
  switch (id) {
    case 'boot':
      if (a !== 'boot') return null;
      if (p === 'cd') return _ok();
      if (p === 'hdd') return _bad('The hard disk is empty, so there is nothing on it to boot. The installer is on the CD/DVD (the ISO).');
      if (p === 'pxe') return _bad('Network (PXE) boot needs a deployment server on the network. This lab installs from the ISO instead.');
      return null;
 
    case 'language':
      if (a === 'set') return _local({ [p.field]: p.value });
      if (a === 'next') {
        if (l.lang !== SL.LANGS[0]) return _bad('Language should be English (United States) so every screen matches your lab manual.');
        if (l.time !== SL.TIMES[0]) return _bad('Time and currency format should be English (United States) for this lab.');
        if (l.kb !== SL.KBS[0]) return _bad('Keyboard should be US. With another layout, symbols like @ and " land on different keys when you type the password.');
        return _ok();
      }
      return null;
 
    case 'install':
      if (a === 'install') return _ok();
      if (a === 'repair') return _bad('Repair your computer fixes a Windows that is already installed. This disk is empty, so choose Install now.');
      return null;
 
    case 'edition':
      if (a === 'sel') return _local({ sel: Number(p) });
      if (a === 'next') {
        if (l.sel === null) return _nudge('Next stays grey until you select an edition. Click one in the list first.');
        if (l.sel === 1) return _ok();
        if (l.sel === 0) return _bad('Plain "Standard" installs Server Core: no desktop, only a command prompt. We want the GUI, so pick the Desktop Experience edition.');
        if (l.sel === 2) return _bad('Plain "Datacenter" is also Server Core (no GUI) and is licensed for large virtualised servers. Pick Standard (Desktop Experience).');
        return _bad('Datacenter (Desktop Experience) has the GUI, but Datacenter is for heavily virtualised servers. This lab uses Standard (Desktop Experience).');
      }
      return null;
 
    case 'license':
      if (a === 'toggle') return _local({ checked: !l.checked });
      if (a === 'next') return l.checked ? _ok() : _nudge('Next is grey until you tick "I accept the license terms".');
      return null;
 
    case 'type':
      if (a === 'custom') return _ok();
      if (a === 'upgrade') return _bad('Upgrade keeps files and settings from an older Windows. The disk is empty and you booted from media, so there is nothing to upgrade. Choose Custom.');
      return null;
 
    case 'disk1':
      if (a === 'sel') return _local({ sel: true });
      if (a === 'new') return l.sel ? _ok() : _nudge('New is grey until you select the unallocated space. Click the row first.');
      if (a === 'loaddrv') return _bad('Load driver is only for when Setup cannot see the disk. Here the 60 GB disk is already listed.');
      if (a === 'disabled') return _nudge('Delete, Extend and Format stay grey because nothing is partitioned yet. Use New.');
      return null;
 
    case 'disk2': {
      if (a === 'size') return _local({ size: String(p) });
      if (a === 'cancel') return _bad('Cancel leaves the disk without a partition. Click Apply to create it.');
      if (a === 'apply') {
        const n = Number(l.size);
        if (!Number.isFinite(n) || l.size === '') return _bad('Type a size in MB. The full disk is 61440.');
        if (n < 32768) return _bad('Windows Server 2019 needs at least 32 GB (32768 MB). Use the whole 61440 MB to leave room for updates.');
        if (n > 61440) return _bad('The disk is only 61440 MB, so a partition cannot be bigger than that.');
        return _local({ dialog: true });
      }
      if (a === 'dialogok') {
        const n = Number(l.size);
        return Object.assign(_ok(), { vm: { parts: [{ name: 'Drive 0 Partition 1: System Reserved', total: '500.0 MB', free: '481.0 MB', type: 'System' }, { name: 'Drive 0 Partition 2', total: (Math.max(n - 500, 0) / 1024).toFixed(1) + ' GB', free: (Math.max(n - 500, 0) / 1024).toFixed(1) + ' GB', type: 'Primary' }] } });
      }
      return null;
    }
 
    case 'disk3':
      if (a === 'sel') return _local({ sel: Number(p) });
      if (a === 'delete') return _bad('Deleting wipes the partitions you just made. Select Partition 2 (Primary) and click Next.');
      if (a === 'next') {
        if (l.sel === null) return _nudge('Next waits for you to select a partition. Click Partition 2.');
        if (l.sel === 0) return _bad('System Reserved is a small partition for boot files, too small for Windows. Install on the large Primary partition (Partition 2).');
        return _ok();
      }
      return null;
 
    case 'install2':
      if (a === 'ff') return _ok();
      return null;
 
    case 'password':
      if (a === 'set') return _local({ [p.field]: p.value });
      if (a === 'finish') {
        if (l.p1 !== l.p2) return _bad('The two passwords do not match. Type the same password in Password and Reenter password.');
        const c = SL.passwordCheck(l.p1);
        if (!c.ok) return _bad(c.msg);
        return Object.assign(_ok(), { vm: { adminPass: l.p1 } });
      }
      return null;
 
    case 'signin':
      if (a === 'cad') return l.stage === 'lock' ? _local({ stage: 'signin' }, 'Good. Now sign in as Administrator.') : _nudge('You are already past the lock screen. Type the password.');
      if (a === 'lockclick') return _nudge('Click does nothing here. Use the Ctrl+Alt+Del button above the screen. On a real keyboard it is three keys together.');
      if (a === 'set') return _local({ pw: p.value });
      if (a === 'signin') {
        if (l.stage !== 'signin') return _nudge('Unlock the screen first with Ctrl+Alt+Del.');
        if (l.pw !== vm.adminPass) return _bad('That is not the password you created in the Customize settings step. Passwords are case-sensitive.');
        return _ok();
      }
      return null;
 
    case 'sm':
      if (a === 'nav') {
        if (p === 'local') return _local({ page: 'local' });
        return _nudge('That page opens, but this task needs Local Server.', { page: p });
      }
      if (a === 'tile') return _nudge('Adding roles comes later, after the server is installed and named. Open Local Server first.');
      if (a === 'name') return l.page === 'local' ? _ok() : _nudge('Open Local Server first.');
      return null;
  }
  return null;
};
 
/* Points for finishing a step. Guided: 10 first try, 5 after a mistake or a hint. Challenge: 20 / 10. */
SL.stepPoints = (mode, mistakes, hinted) => {
  const base = mode === 'challenge' ? 20 : 10;
  return mistakes > 0 || hinted ? base / 2 : base;
};
 
/* Best points per step are kept, so replaying never farms points. */
SL.totalPoints = (user) => {
  const steps = Object.values(user.stepBest || {}).reduce((a, b) => a + b, 0);
  const quiz = user.assess && user.assess.best != null ? user.assess.best * 10 : 0;
  return steps + quiz;
};
 
SL.levelFor = (points) => {
  let cur = SL.LEVELS[0];
  for (const l of SL.LEVELS) if (points >= l.at) cur = l;
  const next = SL.LEVELS.find((l) => l.at > points) || null;
  return { cur, next, into: points - cur.at, span: next ? next.at - cur.at : 1 };
};
 
SL.board = (users, meId) => {
  const rows = SL.SAMPLES.map((s) => ({ name: s.name, points: s.points, sample: true, me: false }));
  for (const u of Object.values(users)) rows.push({ name: u.name, points: SL.totalPoints(u), sample: false, me: u.id === meId });
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return rows.map((r, i) => Object.assign(r, { rank: i + 1, level: SL.levelFor(r.points).cur }));
};
 
/* Badges earned by an event. Returns the ids newly earned. */
SL.awardBadges = (user, ev) => {
  user.badges = user.badges || {};
  const got = [];
  const give = (id) => { if (!user.badges[id]) { user.badges[id] = true; got.push(id); } };
  if (ev.type === 'step') {
    if (ev.id === 'boot') give('first_boot');
    if (ev.id === 'edition' && ev.mistakes === 0 && !ev.hinted) give('right_edition');
    if (ev.id === 'disk3' && ['disk1', 'disk2', 'disk3'].every((k) => ev.clean[k])) give('clean_disk');
  }
  if (ev.type === 'lesson' && ev.hints === 0) give('no_hints');
  if (ev.type === 'quiz') {
    if (ev.pct >= SL.PASS) give('club60');
    if (ev.pct === 100) give('full_marks');
  }
  return got;
};
 
/* Quiz */
SL.shuffle = (arr, rnd = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
SL.newQuiz = (rnd = Math.random) => ({
  items: SL.QUIZ.map((q) => { const opts = SL.shuffle(q.a, rnd); return { q: q.q, opts, correct: opts.indexOf(q.a[0]), why: q.why }; }),
  picks: SL.QUIZ.map(() => null),
  i: 0,
});
SL.scoreQuiz = (quiz) => {
  const total = quiz.items.length;
  const right = quiz.items.reduce((n, it, i) => n + (quiz.picks[i] === it.correct ? 1 : 0), 0);
  const pct = Math.round((right / total) * 100);
  return { right, total, pct, pass: pct >= SL.PASS };
};
 
/* Account helpers */
SL.hashPassword = async (pw, salt) => {
  try {
    const buf = new TextEncoder().encode(salt + ':' + pw);
    const d = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 5381; const s = salt + ':' + pw;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'x' + h.toString(16);
  }
};
SL.newUser = (id, name, hash, salt) => ({ id, name, hash, salt, created: Date.now(), stepBest: {}, done: 0, badges: {}, assess: { best: null, attempts: [] }, clean: {} });
 
if (typeof module !== 'undefined') module.exports = SL;
 