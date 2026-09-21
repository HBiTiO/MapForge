const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalImage = document.getElementById("modal-image-img");
const modalPlaceholder = document.getElementById("modal-placeholder");
const modalGallery = document.getElementById("modal-gallery");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalTags = document.getElementById("modal-tags");
const modalMeta = document.getElementById("modal-meta");
const modalBuy = document.getElementById("modal-buy");
const projectsContainer = document.getElementById("projects");
const filtersContainer = document.getElementById("filters");
const emptyState = document.getElementById("empty-state");

let currentFilter = "Tous";

function safeText(value) {
  return String(value ?? "");
}

function categoryList() {
  const categories = [...new Set(
    PROJECTS
      .map(project => safeText(project.category).trim())
      .filter(Boolean)
  )];
  return ["Tous", ...categories];
}

function renderFilters() {
  filtersContainer.innerHTML = categoryList().map(category => `
    <button type="button" class="filter ${category === currentFilter ? "active" : ""}" data-filter="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  filtersContainer.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      renderFilters();
      renderProjects();
    });
  });
}

function renderProjects() {
  const visible = currentFilter === "Tous"
    ? PROJECTS
    : PROJECTS.filter(project => project.category === currentFilter);

  emptyState.classList.toggle("hidden", visible.length !== 0);

  projectsContainer.innerHTML = visible.map(project => {
    const image = project.image ? `
      <img src="${escapeAttribute(project.image)}" alt="${escapeAttribute(project.title)}" loading="lazy">
    ` : `<div class="project-placeholder">AJOUTE TON IMAGE</div>`;

    const tags = (project.tags || [project.category]).map(tag =>
      `<span class="tag">${escapeHtml(tag)}</span>`
    ).join("");

    const price = project.price
      ? `<span class="price">${escapeHtml(project.price)}</span>`
      : "";

    return `
      <article class="project">
        <button class="project-image" type="button" data-project-id="${escapeAttribute(project.id)}">
          ${image}
        </button>
        <div class="project-info">
          <div class="project-tags">${tags}</div>
          <div class="project-title-row">
            <h3>${escapeHtml(project.title)}</h3>
            ${price}
          </div>
          <p>${escapeHtml(project.description)}</p>
          <button class="project-link" type="button" data-project-id="${escapeAttribute(project.id)}">
            Voir le projet <span>↗</span>
          </button>
        </div>
      </article>
    `;
  }).join("");

  projectsContainer.querySelectorAll("[data-project-id]").forEach(button => {
    button.addEventListener("click", () => openProject(button.dataset.projectId));
  });

  document.getElementById("project-count").textContent = PROJECTS.length;
}

function openProject(id) {
  const project = PROJECTS.find(item => item.id === id);
  if (!project) return;

  modalTitle.textContent = safeText(project.title);
  modalDesc.textContent = safeText(project.description);

  modalTags.innerHTML = (project.tags || [project.category]).map(tag =>
    `<span class="tag">${escapeHtml(tag)}</span>`
  ).join("");

  const meta = [];
  if (project.status) meta.push(project.status);
  if (project.price) meta.push(project.price);
  if (project.category) meta.push(project.category);

  modalMeta.innerHTML = meta.map(item =>
    `<span>${escapeHtml(item)}</span>`
  ).join("");

  const galleryImages = project.images?.length ? project.images : (project.image ? [project.image] : []);
  if (galleryImages.length) {
    let activeIndex = 0;
    const showImage = (index) => {
      activeIndex = index;
      modalImage.src = galleryImages[activeIndex];
      modalImage.alt = `${project.title} — vue ${activeIndex + 1}`;
      modalImage.classList.add("visible");
      modalPlaceholder.classList.add("hidden");
      if (modalGallery) {
        modalGallery.innerHTML = galleryImages.map((src, i) => `
          <button type="button" class="gallery-thumb ${i === activeIndex ? "active" : ""}" data-gallery-index="${i}" aria-label="Voir la vue ${i + 1}">
            <img src="${escapeAttribute(src)}" alt="" loading="lazy">
          </button>
        `).join("");
        modalGallery.querySelectorAll("[data-gallery-index]").forEach(button => {
          button.addEventListener("click", () => showImage(Number(button.dataset.galleryIndex)));
        });
      }
    };
    showImage(0);
  } else {
    modalImage.removeAttribute("src");
    modalImage.classList.remove("visible");
    modalPlaceholder.classList.remove("hidden");
    if (modalGallery) modalGallery.innerHTML = "";
  }

  if (project.paymentUrl) {
    modalBuy.innerHTML = `
      <a class="btn primary buy-btn" href="${escapeAttribute(project.paymentUrl)}" target="_blank" rel="noopener">
        Acheter cette création <b>↗</b>
      </a>
    `;
  } else {
    const subject = encodeURIComponent(`Commande — ${project.title}`);
    modalBuy.innerHTML = `
      <a class="btn primary buy-btn" href="mailto:${SITE_CONFIG.email}?subject=${subject}">
        Demander cette création <b>→</b>
      </a>
    `;
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", event => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal.classList.contains("open")) closeModal();
});

document.getElementById("copy-discord").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(SITE_CONFIG.discord);
    document.getElementById("copy-message").classList.add("show");
    setTimeout(() => document.getElementById("copy-message").classList.remove("show"), 1800);
  } catch {
    window.prompt("Copie ton pseudo Discord :", SITE_CONFIG.discord);
  }
});

function escapeHtml(value) {
  return safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

renderFilters();
renderProjects();
