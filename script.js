// 導覽底色、目前區塊、進場、課程預覽
(() => {
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-solid', window.scrollY > 24);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  const links = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.removeAttribute('aria-current'));
      const a = byId.get(e.target.id); if (a) a.setAttribute('aria-current', 'true');
    }), { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
  }

  const items = [...document.querySelectorAll('.course[data-key]')];
  const shots = [...document.querySelectorAll('.plate__frame img[data-key]')];
  const show = key => {
    items.forEach(i => i.classList.toggle('is-on', i.dataset.key === key));
    shots.forEach(s => s.classList.toggle('is-on', s.dataset.key === key));
  };
  items.forEach(i => {
    i.addEventListener('pointerenter', () => show(i.dataset.key));
    i.addEventListener('focusin', () => show(i.dataset.key));
  });
})();
