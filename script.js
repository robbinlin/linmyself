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
