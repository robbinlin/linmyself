// 導覽、進場、首屏固定、跳數、課程預覽
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');

  // 首屏固定：只在首屏不比視窗高時啟用，內頁才能完整蓋上來
  const pinOK = () => hero && !reduce && innerWidth > 900 && hero.offsetHeight <= innerHeight + 2;
  const setPin = () => hero && hero.classList.toggle('is-pinned', pinOK());
  setPin(); addEventListener('resize', setPin);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (nav) nav.classList.toggle('is-solid', scrollY > 24);
      if (hero && hero.classList.contains('is-pinned')) hero.style.setProperty('--hero-p', Math.min(1, scrollY / innerHeight).toFixed(3));
    });
  };
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  // 清單逐列錯開
  document.querySelectorAll('[data-stagger]').forEach(list => [...list.children].forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8))));

  const links = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.removeAttribute('aria-current'));
      const a = byId.get(e.target.id); if (a) a.setAttribute('aria-current', 'true');
    }), { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  // 三個數字跳數一次
  if (!reduce) {
    const fmt = n => n.toLocaleString('en-US');
    document.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now() + 1300, dur = 1500;
      el.textContent = '0' + suffix;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(Math.round(to * e)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // 課程預覽：新畫面由下往上擦入，蓋過上一張
  const items = [...document.querySelectorAll('.course[data-key]')];
  const shots = [...document.querySelectorAll('.plate__frame img[data-key]')];
  // 桌機才有預覽框：先把另外幾張抓下來，換課時才不會擦出空白
  const plate = document.querySelector('.plate');
  if (plate && getComputedStyle(plate).display !== 'none') shots.forEach(sh => { sh.loading = 'eager'; });
  let current = (shots.find(s => s.classList.contains('is-on')) || {}).dataset?.key;
  const show = key => {
    if (key === current) return;
    shots.forEach(s => {
      s.classList.remove('was-on');
      if (s.dataset.key === current) { s.classList.remove('is-on'); s.classList.add('was-on'); }
    });
    const next = shots.find(s => s.dataset.key === key);
    if (next) { void next.offsetWidth; next.classList.add('is-on'); }
    items.forEach(i => i.classList.toggle('is-on', i.dataset.key === key));
    current = key;
  };
  items.forEach(i => {
    i.addEventListener('pointerenter', () => show(i.dataset.key));
    i.addEventListener('focusin', () => show(i.dataset.key));
  });
})();

// 滑鼠視差：人像朝滑鼠轉向四個面向，光暈與卡片反向位移並帶 3D 傾斜
(() => {
  const stage = document.querySelector('[data-parallax]');
  const hero = document.querySelector('.hero');
  if (!stage || !hero) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce || innerWidth <= 900) return;

  const portrait = stage.querySelector('.portrait');
  const halos = [...stage.querySelectorAll('.halo')].map(el => ({ el, d: +el.dataset.depth }));
  const facets = [...stage.querySelectorAll('.facet')].map(el => ({ el, d: +el.dataset.depth, key: el.dataset.facet }));
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let raf = 0, forced = null, active = null;

  const setActive = key => {
    if (key === active) return; active = key;
    facets.forEach(f => f.el.classList.toggle('is-active', f.key === key));
    stage.classList.toggle('has-active', !!key);
  };
  const pick = () => {
    if (forced) return forced;
    if (Math.hypot(target.x, target.y) < 0.22) return null;   // 中央留一塊不偏向任何面向
    return (target.y < 0 ? 't' : 'b') + (target.x < 0 ? 'l' : 'r');
  };

  const frame = () => {
    cur.x += (target.x - cur.x) * 0.085;
    cur.y += (target.y - cur.y) * 0.085;
    const { x, y } = cur;
    portrait.style.transform = `translate3d(${(x * 12).toFixed(2)}px, ${(y * 9).toFixed(2)}px, 0) rotateY(${(x * 17).toFixed(2)}deg) rotateX(${(-y * 12).toFixed(2)}deg)`;
    for (const h of halos) h.el.style.transform = `translate3d(${(-x * h.d).toFixed(2)}px, ${(-y * h.d * 0.8).toFixed(2)}px, 0)`;
    for (const f of facets) f.el.style.transform = `translate3d(${(-x * f.d).toFixed(2)}px, ${(-y * f.d * 0.8).toFixed(2)}px, 70px) rotateY(${(-x * 11).toFixed(2)}deg) rotateX(${(y * 9).toFixed(2)}deg)`;
    raf = (Math.abs(target.x - x) + Math.abs(target.y - y) > 0.0015) ? requestAnimationFrame(frame) : 0;   // 靜止後停止
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    setActive(pick()); kick();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; forced = null; setActive(null); kick(); });
  facets.forEach(f => {
    f.el.addEventListener('pointerenter', () => { forced = f.key; setActive(f.key); });
    f.el.addEventListener('pointerleave', () => { forced = null; setActive(pick()); });
    f.el.addEventListener('focus', () => { forced = f.key; setActive(f.key); target.x = f.key[1] === 'l' ? -0.7 : 0.7; target.y = f.key[0] === 't' ? -0.7 : 0.7; kick(); });
    f.el.addEventListener('blur', () => { forced = null; target.x = 0; target.y = 0; setActive(null); kick(); });
  });
})();

// 可以讀的鐘形曲線：滑鼠橫移時，標記貼在曲線上，讀出 z 分數與百分位
(() => {
  const hero = document.querySelector('.hero');
  const svg = document.querySelector('.hero__curve');
  const read = document.querySelector('.zread');
  if (!hero || !svg || !read) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || innerWidth <= 900) return;
  const area = svg.querySelector('.area'), big = read.querySelector('b'), small = read.querySelector('.zread__label span');
  const Z = 3.5, W = 1200, BASE = 292, PEAK = 262;
  const y = z => BASE - PEAK * Math.exp(-z * z / 2);
  // 標準常態累積機率（Abramowitz–Stegun 近似，誤差小於 1e-7）
  const cdf = z => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - p : p;
  };
  let px = 0, queued = false, on = false;
  const draw = () => {
    queued = false;
    const r = svg.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (px - r.left) / r.width)), z = -Z + 2 * Z * u;
    read.style.transform = `translate3d(${(r.left - h.left + u * r.width).toFixed(1)}px, ${(r.top - h.top + y(z) / 300 * r.height).toFixed(1)}px, 0)`;
    let d = `M0,${BASE}`;
    for (let i = 0, n = Math.max(1, Math.round(u * 140)); i <= n; i++) { const zi = -Z + (z + Z) * i / n; d += ` L${((zi + Z) / (2 * Z) * W).toFixed(1)},${y(zi).toFixed(1)}`; }
    area.setAttribute('d', d + ` L${(u * W).toFixed(1)},${BASE} Z`);
    const pct = cdf(z) * 100;
    big.textContent = 'z = ' + (z >= 0 ? '+' : '−') + Math.abs(z).toFixed(2);
    small.textContent = '第 ' + (pct < 1 ? pct.toFixed(1) : pct > 99 ? pct.toFixed(1) : Math.round(pct)) + ' 百分位';
    read.classList.toggle('is-left', u < 0.08); read.classList.toggle('is-right', u > 0.92);
  };
  hero.addEventListener('pointermove', e => {
    px = e.clientX;
    if (!on) { on = true; read.classList.add('is-on'); }
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { on = false; read.classList.remove('is-on'); area.setAttribute('d', ''); });
})();

// 經歷時間軸：橫槓與清單互相亮起
(() => {
  const tl = document.querySelector('.tl'), career = document.querySelector('.career');
  if (!tl || !career) return;
  const bars = [...tl.querySelectorAll('.tl__bar')], rows = [...career.querySelectorAll('[data-tl]')], cap = tl.querySelector('.tl__cap span');
  bars.forEach((b, i) => b.style.setProperty('--i', i));
  const idle = cap.textContent;
  const hot = key => {
    bars.forEach(b => b.classList.toggle('is-hot', b.dataset.tl === key));
    rows.forEach(r => r.classList.toggle('is-hot', r.dataset.tl === key));
    tl.classList.toggle('has-hot', !!key); career.classList.toggle('has-hot', !!key);
    const b = bars.find(x => x.dataset.tl === key);
    cap.textContent = b ? b.dataset.cap : idle;
  };
  [...bars, ...rows].forEach(el => {
    el.addEventListener('pointerenter', () => hot(el.dataset.tl));
    el.addEventListener('pointerleave', () => hot(null));
    el.addEventListener('focus', () => hot(el.dataset.tl));
    el.addEventListener('blur', () => hot(null));
  });
  // 觸控：點橫槓捲到對應的那一列
  bars.forEach(b => b.addEventListener('click', () => {
    hot(b.dataset.tl);
    const row = rows.find(r => r.dataset.tl === b.dataset.tl);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
})();

// 著作搜尋與年份篩選
(() => {
  const form = document.querySelector('.finder'), list = document.querySelector('.publist');
  if (!form || !list) return;
  const input = form.querySelector('input'), chips = [...form.querySelectorAll('.chip')], count = form.querySelector('.finder__count'), empty = list.querySelector('.finder__empty');
  const groups = [...list.querySelectorAll('.year-head')].map(h => ({ h, ul: h.nextElementSibling, year: h.textContent.trim(), items: [...h.nextElementSibling.children].map(li => ({ li, text: li.textContent.toLowerCase() })) }));
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let year = '';
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    for (const g of groups) {
      let shown = 0;
      for (const it of g.items) { const ok = (!year || g.year === year) && (!q || it.text.includes(q)); it.li.hidden = !ok; if (ok) shown++; }
      g.h.hidden = g.ul.hidden = !shown; n += shown;
      if (shown) { g.h.classList.add('is-in'); g.ul.classList.add('is-in'); }   // 篩出來的直接顯示，不等捲動進場
    }
    empty.hidden = n > 0;
    count.textContent = (q || year) ? `符合 ${n} 篇，共 ${total} 篇` : `共 ${total} 篇`;
  };
  const run = () => {
    if (reduce || !document.startViewTransition) return apply();
    document.documentElement.classList.add('vt-filter');
    document.startViewTransition(apply).finished.finally(() => document.documentElement.classList.remove('vt-filter'));
  };
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  chips.forEach(c => c.addEventListener('click', () => {
    year = c.dataset.year;
    chips.forEach(x => { const on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    run();
  }));
})();

// 字帶：可拖曳，放開後帶慣性回到原本的速度；滑鼠停在上面會停
(() => {
  const band = document.querySelector('.band'), track = band && band.querySelector('.band__track');
  if (!band || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  band.classList.add('is-js');
  const BASE = -42;                       // 每秒位移（px），向左
  let x = 0, v = BASE, target = BASE, half = track.scrollWidth / 2, last = 0, raf = 0, visible = false;
  let drag = false, lastX = 0, lastT = 0;
  const wrap = () => { if (x <= -half) x += half; else if (x > 0) x -= half; };
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!drag) { v += (target - v) * Math.min(1, dt * 3.2); x += v * dt; wrap(); }
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }).observe(band);
  addEventListener('resize', () => { half = track.scrollWidth / 2; });
  band.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') target = 0; });
  band.addEventListener('pointerleave', () => { if (!drag) target = BASE; });
  band.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; lastT = performance.now(); v = 0; band.classList.add('is-drag'); band.setPointerCapture(e.pointerId); });
  band.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - lastX;
    x += dx; wrap(); v = dx / Math.max(0.001, (now - lastT) / 1000); lastX = e.clientX; lastT = now;
  });
  const end = e => { if (!drag) return; drag = false; band.classList.remove('is-drag'); v = Math.max(-2600, Math.min(2600, v)); target = e.pointerType === 'mouse' && band.matches(':hover') ? 0 : BASE; };
  band.addEventListener('pointerup', end); band.addEventListener('pointercancel', end);
})();

// 複製信箱
(() => {
  document.querySelectorAll('.copybtn').forEach(btn => {
    const text = btn.querySelector('.copybtn__text'), status = btn.parentElement.querySelector('.copybtn__status');
    let timer = 0;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add('is-done'); text.textContent = btn.dataset.done; status.textContent = '';
        clearTimeout(timer); timer = setTimeout(() => { btn.classList.remove('is-done'); text.textContent = btn.dataset.label; }, 1600);
      } catch { status.textContent = btn.dataset.copy; }   // 瀏覽器不給複製時，直接把信箱顯示出來讓人選取
    });
  });
})();
