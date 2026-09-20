const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');

filters.forEach(filter => {
  filter.addEventListener('click', () => {
    filters.forEach(f => f.classList.remove('active'));
    filter.classList.add('active');
    const wanted = filter.dataset.filter;
    projects.forEach(project => {
      project.classList.toggle('hidden', wanted !== 'all' && !project.dataset.category.includes(wanted));
    });
  });
});

const data = {
  scp: {
    title: "Complexe SCP — Installation souterraine",
    tags: ["MAP","SCP"],
    desc: "Projet de complexe souterrain pensé autour de plusieurs départements : sécurité, scientifique, médical, administratif, LCZ et HCZ, avec de nombreuses cellules de confinement."
  },
  police: {
    title: "Commissariat — US Roleplay",
    tags: ["BÂTIMENT","RP"],
    desc: "Bâtiment de police américain conçu pour un serveur RP, avec accueil, bureaux, cellules, zones techniques et espaces de circulation."
  },
  city: {
    title: "Ville américaine — Roleplay",
    tags: ["MAP","RP"],
    desc: "Environnement urbain destiné au roleplay avec routes, commerces, quartiers résidentiels et bâtiments accessibles."
  },
  industrial: {
    title: "Complexe industriel",
    tags: ["BÂTIMENT"],
    desc: "Environnement industriel détaillé avec zones de production, stockage, espaces techniques et circulation adaptée au gameplay."
  }
};

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalTags = document.getElementById('modal-tags');

document.querySelectorAll('.project-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = data[btn.dataset.project];
    modalTitle.textContent = item.title;
    modalDesc.textContent = item.desc;
    modalTags.innerHTML = item.tags.map(t => `<span class="tag">${t}</span>`).join('');
    modal.classList.add('open');
  });
});

document.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });

document.querySelector('.menu-btn').addEventListener('click', () => {
  const nav = document.querySelector('nav');
  const visible = nav.style.display === 'flex';
  nav.style.display = visible ? '' : 'flex';
  nav.style.position = 'absolute';
  nav.style.top = '78px';
  nav.style.left = '0';
  nav.style.right = '0';
  nav.style.padding = '20px';
  nav.style.background = 'rgba(7,6,11,.97)';
  nav.style.flexDirection = 'column';
  nav.style.borderBottom = '1px solid #211b29';
});
