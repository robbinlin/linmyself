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
