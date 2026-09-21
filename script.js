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
let galleryAnimating = false;

function safeText(value) {
  return String(value ?? "");
}

function categoryList() {
  const categories = [...new Set(PROJECTS.map(project => safeText(project.category).trim()).filter(Boolean))];
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
    <button type="button" class="gallery-arrow gallery-prev" aria-label="Image précédente">‹</button>
    <button type="button" class="gallery-arrow gallery-next" aria-label="Image suivante">›</button>
  `);

  imageBox.querySelector(".gallery-prev").addEventListener("click", event => {
    event.stopPropagation();
    showGalleryImage(galleryIndex - 1, "prev");
  });

  imageBox.querySelector(".gallery-next").addEventListener("click", event => {
    event.stopPropagation();
    showGalleryImage(galleryIndex + 1, "next");
  });
}

function preloadGallery(images) {
  images.forEach(src => {
    const image = new Image();
    image.src = src;
  });
}

function animateImageChange(src, direction) {
  if (!modalImage || galleryAnimating) return;

  galleryAnimating = true;
  const safeDirection = direction === "prev" ? "prev" : "next";
  const enterClass = safeDirection === "prev" ? "gallery-enter-prev" : "gallery-enter-next";
  const exitClass = safeDirection === "prev" ? "gallery-exit-prev" : "gallery-exit-next";

  modalImage.classList.remove(
    "gallery-enter-prev", "gallery-enter-next",
    "gallery-exit-prev", "gallery-exit-next",
    "gallery-current"
  );

  modalImage.classList.add(exitClass);

  window.setTimeout(() => {
    modalImage.src = src;
    modalImage.classList.remove(exitClass);
    modalImage.classList.add(enterClass);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalImage.classList.remove(enterClass);
        modalImage.classList.add("gallery-current");
      });
    });

    window.setTimeout(() => {
      galleryAnimating = false;
    }, 430);
  }, 170);
}

function showGalleryImage(index, direction = "next", immediate = false) {
  if (!currentGallery.length) return;

  const nextIndex = (index + currentGallery.length) % currentGallery.length;
  galleryIndex = nextIndex;
  const src = currentGallery[galleryIndex];

  if (immediate) {
    modalImage.src = src;
    modalImage.classList.remove("gallery-enter-prev", "gallery-enter-next", "gallery-exit-prev", "gallery-exit-next");
    modalImage.classList.add("gallery-current");
    modalImage.classList.add("visible");
  } else {
    animateImageChange(src, direction);
  }

  modalImage.alt = `${galleryProjectTitle} — vue ${galleryIndex + 1}`;
  modalPlaceholder?.classList.add("hidden");

  if (modalGallery) {
    modalGallery.innerHTML = currentGallery.map((imageSrc, i) => `
      <button type="button" class="gallery-thumb ${i === galleryIndex ? "active" : ""}" data-gallery-index="${i}" aria-label="Voir la vue ${i + 1}">
        <img src="${escapeAttribute(imageSrc)}" alt="" loading="lazy">
      </button>
    `).join("");

    modalGallery.querySelectorAll("[data-gallery-index]").forEach(button => {
      button.addEventListener("click", () => {
        const target = Number(button.dataset.galleryIndex);
        const direction = target < galleryIndex ? "prev" : "next";
        showGalleryImage(target, direction);
      });
    });

    modalGallery.querySelector(".gallery-thumb.active")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }
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
  galleryIndex = 0;
  galleryAnimating = false;

  preloadGallery(currentGallery);
  ensureGalleryArrows();

  if (currentGallery.length) {
    showGalleryImage(0, "next", true);
  } else {
    modalImage.removeAttribute("src");
    modalImage.classList.remove("visible");
    modalPlaceholder?.classList.remove("hidden");
    if (modalGallery) modalGallery.innerHTML = "";
  }

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
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

modalClose?.addEventListener("click", closeModal);

modal?.addEventListener("click", event => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("keydown", event => {
  if (!modal?.classList.contains("open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") showGalleryImage(galleryIndex - 1, "prev");
  if (event.key === "ArrowRight") showGalleryImage(galleryIndex + 1, "next");
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
