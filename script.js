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
let galleryIndex = 0;
let currentGallery = [];
let galleryProjectTitle = "";
let imageChangeLock = false;

function safeText(value) {
  return String(value ?? "");
}

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

function categoryList() {
  const categories = [...new Set(
    PROJECTS.map(project => safeText(project.category).trim()).filter(Boolean)
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

  emptyState?.classList.toggle("hidden", visible.length !== 0);

  projectsContainer.innerHTML = visible.map(project => {
    const image = project.image
      ? `<img src="${escapeAttribute(project.image)}" alt="${escapeAttribute(project.title)}" loading="lazy">`
      : `<div class="project-placeholder">AJOUTE TON IMAGE</div>`;

    const tags = (project.tags || [project.category]).map(tag =>
      `<span class="tag">${escapeHtml(tag)}</span>`
    ).join("");

    return `
      <article class="project">
        <button class="project-image" type="button" data-project-id="${escapeAttribute(project.id)}">
          ${image}
        </button>
        <div class="project-info">
          <div class="project-tags">${tags}</div>
          <div class="project-title-row">
            <h3>${escapeHtml(project.title)}</h3>
            <span class="price">${escapeHtml(project.price || "")}</span>
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

  const count = document.getElementById("project-count");
  if (count) count.textContent = PROJECTS.length;
}

function ensureGalleryArrows() {
  const imageBox = document.getElementById("modal-image");
  if (!imageBox || imageBox.querySelector(".gallery-prev")) return;

  imageBox.insertAdjacentHTML("beforeend", `
    <button type="button" class="gallery-arrow gallery-prev" aria-label="Image précédente">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>
    </button>
    <button type="button" class="gallery-arrow gallery-next" aria-label="Image suivante">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"></path></svg>
    </button>
  `);

  imageBox.querySelector(".gallery-prev").addEventListener("click", event => {
    event.stopPropagation();
    changeGalleryImage(galleryIndex - 1, "prev");
  });

  imageBox.querySelector(".gallery-next").addEventListener("click", event => {
    event.stopPropagation();
    changeGalleryImage(galleryIndex + 1, "next");
  });
}

function preloadGallery(images) {
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

function updateThumbs() {
  if (!modalGallery) return;

  modalGallery.innerHTML = currentGallery.map((src, i) => `
    <button type="button"
            class="gallery-thumb ${i === galleryIndex ? "active" : ""}"
            data-gallery-index="${i}"
            aria-label="Voir la vue ${i + 1}">
      <img src="${escapeAttribute(src)}" alt="" loading="lazy">
    </button>
  `).join("");

  modalGallery.querySelectorAll("[data-gallery-index]").forEach(button => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.galleryIndex);
      if (target === galleryIndex) return;
      changeGalleryImage(target, target < galleryIndex ? "prev" : "next");
    });
  });

  modalGallery.querySelector(".gallery-thumb.active")?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center"
  });
}

function setArrowVisibility() {
  const prev = document.querySelector(".gallery-prev");
  const next = document.querySelector(".gallery-next");
  const show = currentGallery.length > 1;
  if (prev) prev.hidden = !show;
  if (next) next.hidden = !show;
}

/*
  Transition réellement animée :
  - l'image actuelle glisse + s'estompe
  - la nouvelle image entre depuis le côté opposé
  - léger zoom pour donner un effet dynamique
*/
function changeGalleryImage(targetIndex, direction = "next") {
  if (!currentGallery.length || imageChangeLock) return;

  const nextIndex = (targetIndex + currentGallery.length) % currentGallery.length;
  if (nextIndex === galleryIndex) return;

  const nextSrc = currentGallery[nextIndex];
  const oldSrc = modalImage.currentSrc || modalImage.src;
  const box = document.getElementById("modal-image");

  imageChangeLock = true;
  galleryIndex = nextIndex;
  modalImage.alt = `${galleryProjectTitle} — vue ${galleryIndex + 1}`;

  const incoming = new Image();
  incoming.onload = () => {
    const incomingEl = incoming;
    incomingEl.className = "gallery-transition-image incoming";
    incomingEl.alt = modalImage.alt;
    box.appendChild(incomingEl);

    const fromX = direction === "next" ? 42 : -42;
    const toX = direction === "next" ? -42 : 42;

    const oldAnimation = modalImage.animate([
      { opacity: 1, transform: "translate3d(0,0,0) scale(1)" },
      { opacity: 0, transform: `translate3d(${toX}px,0,0) scale(.985)` }
    ], {
      duration: 260,
      easing: "cubic-bezier(.55,.05,.7,.2)",
      fill: "forwards"
    });

    incomingEl.animate([
      { opacity: 0, transform: `translate3d(${fromX}px,0,0) scale(1.025)` },
      { opacity: 1, transform: "translate3d(0,0,0) scale(1)" }
    ], {
      duration: 480,
      easing: "cubic-bezier(.18,.78,.2,1)",
      fill: "forwards"
    }).finished.then(() => {
      modalImage.src = nextSrc;
      modalImage.style.opacity = "1";
      modalImage.style.transform = "translate3d(0,0,0) scale(1)";
      modalImage.style.filter = "none";
      incomingEl.remove();
      oldAnimation.cancel();
      updateThumbs();
      imageChangeLock = false;
    }).catch(() => {
      incomingEl.remove();
      modalImage.src = nextSrc;
      modalImage.style.opacity = "1";
      modalImage.style.transform = "none";
      updateThumbs();
      imageChangeLock = false;
    });
  };

  incoming.onerror = () => {
    imageChangeLock = false;
  };

  incoming.src = nextSrc;
}

function showFirstGalleryImage() {
  if (!currentGallery.length) return;

  galleryIndex = 0;
  modalImage.src = currentGallery[0];
  modalImage.alt = `${galleryProjectTitle} — vue 1`;
  modalImage.style.opacity = "1";
  modalImage.style.transform = "translate3d(0,0,0) scale(1)";
  modalImage.classList.add("visible");
  modalPlaceholder?.classList.add("hidden");

  updateThumbs();
  setArrowVisibility();
}

function ensureDetailsBox() {
  let box = document.getElementById("modal-details");
  if (box) return box;

  box = document.createElement("div");
  box.id = "modal-details";
  box.className = "modal-details";
  modalBuy.parentNode.insertBefore(box, modalBuy);
  return box;
}

function openProject(id) {
  const project = PROJECTS.find(item => item.id === id);
  if (!project) return;

  modalTitle.textContent = safeText(project.title);
  modalDesc.textContent = safeText(project.description);

  modalTags.innerHTML = (project.tags || [project.category]).map(tag =>
    `<span class="tag">${escapeHtml(tag)}</span>`
  ).join("");

  modalMeta.innerHTML = [project.status, project.price, project.category]
    .filter(Boolean)
    .map(item => `<span>${escapeHtml(item)}</span>`)
    .join("");

  const detailsBox = ensureDetailsBox();
  const details = Array.isArray(project.details) ? project.details : [];
  detailsBox.innerHTML = details.length ? `
    <div class="modal-details-title">Ce qui est inclus</div>
    <ul>${details.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  ` : "";
  detailsBox.style.display = details.length ? "block" : "none";

  currentGallery = project.images?.length
    ? project.images
    : (project.image ? [project.image] : []);
  galleryProjectTitle = project.title;
  imageChangeLock = false;

  preloadGallery(currentGallery);
  ensureGalleryArrows();
  showFirstGalleryImage();

  modalBuy.innerHTML = `
    <a class="btn primary buy-btn" href="${escapeAttribute(project.paymentUrl)}" target="_blank" rel="noopener">
      Acheter — ${escapeHtml(project.price || "Voir le prix")} <b>↗</b>
    </a>
    <small class="buy-note">Paiement sécurisé via Stripe. Le téléchargement du fichier sera ajouté après la mise en place du système de livraison.</small>
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal() {
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

modalClose?.addEventListener("click", closeModal);

modal?.addEventListener("click", event => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("keydown", event => {
  if (!modal?.classList.contains("open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") changeGalleryImage(galleryIndex - 1, "prev");
  if (event.key === "ArrowRight") changeGalleryImage(galleryIndex + 1, "next");
});

document.getElementById("copy-discord")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("hbitio");
    document.getElementById("copy-message")?.classList.add("show");
    setTimeout(() => document.getElementById("copy-message")?.classList.remove("show"), 1800);
  } catch {
    window.prompt("Copie ton pseudo Discord :", "hbitio");
  }
});

renderFilters();
renderProjects();
