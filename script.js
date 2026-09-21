const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const modal=$("#modal"),media=$("#modal-media"),image=$("#modal-image"),placeholder=$("#modal-placeholder"),gallery=$("#modal-gallery"),title=$("#modal-title"),desc=$("#modal-desc"),tags=$("#modal-tags"),price=$("#modal-price"),details=$("#modal-details"),buy=$("#modal-buy"),projectsBox=$("#projects"),filters=$("#filters"),empty=$("#empty-state");
let filter="Tous",current=null,imgs=[],index=0,busy=false,lastFocus=null;

const SUPABASE_URL = "https://tedqgheovljafhhwufet.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0DFcBQlYPjWMmvhYv6dpFQ_UXKM1iWj";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CREATE_CHECKOUT_URL =
  "https://tedqgheovljafhhwufet.supabase.co/functions/v1/create-checkout";

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const projectImages=p=>Array.isArray(p.images)&&p.images.length?p.images:(p.image?[p.image]:[]);
const cats=()=>["Tous",...new Set(PROJECTS.map(p=>String(p.category||"").trim()).filter(Boolean))];

function renderFilters(){filters.innerHTML=cats().map(c=>`<button class="filter ${c===filter?"active":""}" type="button" data-filter="${esc(c)}">${esc(c)}</button>`).join("");$$("button",filters).forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderFilters();renderProjects()})}

function renderProjects(){
  const list=filter==="Tous"?PROJECTS:PROJECTS.filter(p=>p.category===filter);
  empty.classList.toggle("hidden",!!list.length);

  projectsBox.innerHTML=list.map(p=>`
    <article class="project reveal">
      <button class="cover" type="button" data-open="${esc(p.id)}">
        ${p.image?`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`:`<span>IMAGE DU PROJET</span>`}
        <i>Voir le projet ↗</i>
      </button>

      <div class="project-body">
        <div class="tags">
          ${(p.tags||[p.category]).map(t=>`<span>${esc(t)}</span>`).join("")}
        </div>

        <div class="project-head">
          <div>
            <h3>${esc(p.title)}</h3>
            ${(p.status||p.version)?`
              <div class="project-meta">
                ${p.status?`<span class="project-status">✓ ${esc(p.status)}</span>`:""}
                ${p.version?`<span class="project-version">${esc(p.version)}</span>`:""}
              </div>
            `:""}
          </div>

          <strong>${esc(p.price||"")}</strong>
        </div>

        <p>${esc(p.description)}</p>

        <button class="discover" type="button" data-open="${esc(p.id)}">
          Découvrir <span>↗</span>
        </button>
      </div>
    </article>
  `).join("");

  $$("[data-open]",projectsBox).forEach(b=>b.onclick=()=>openProject(b.dataset.open));
  $("#project-count").textContent=PROJECTS.length;
  observe();
}

function arrows(){
  if($(".gallery-prev",media))return;
  [["prev","Image précédente",-1],["next","Image suivante",1]].forEach(([d,l,delta])=>{
    const b=document.createElement("button");
    b.className=`gallery-arrow gallery-${d}`;
    b.type="button";
    b.setAttribute("aria-label",l);
    b.innerHTML=d==="prev"
      ?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>`
      :`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>`;
    b.onclick=e=>{e.stopPropagation();change(index+delta,d)};
    media.append(b)
  })
}

function thumbs(){
  gallery.hidden=imgs.length<2;
  gallery.innerHTML=imgs.map((src,i)=>`<button class="thumb ${i===index?"active":""}" data-i="${i}" type="button"><img src="${esc(src)}" alt=""></button>`).join("");
  $$("[data-i]",gallery).forEach(b=>b.onclick=()=>{
    const n=+b.dataset.i;
    if(n!==index)change(n,n<index?"prev":"next")
  });
  $(".thumb.active",gallery)?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"})
}

function change(n,d="next"){
  if(busy||imgs.length<2)return;
  n=(n+imgs.length)%imgs.length;
  if(n===index)return;
  busy=true;

  const incoming=new Image();
  incoming.src=imgs[n];
  const from=d==="next"?42:-42,to=d==="next"?-42:42;

  incoming.onload=()=>{
    incoming.className="incoming";
    incoming.alt=`${current.title} — vue ${n+1}`;
    media.append(incoming);

    const old=image.animate(
      [{opacity:1,transform:"translate3d(0,0,0) scale(1)"},
       {opacity:0,transform:`translate3d(${to}px,0,0) scale(.985)`}],
      {duration:260,fill:"forwards",easing:"cubic-bezier(.55,.05,.7,.2)"}
    );

    incoming.animate(
      [{opacity:0,transform:`translate3d(${from}px,0,0) scale(1.025)`},
       {opacity:1,transform:"translate3d(0,0,0) scale(1)"}],
      {duration:440,fill:"forwards",easing:"cubic-bezier(.18,.78,.2,1)"}
    ).finished.then(()=>{
      index=n;
      image.src=imgs[n];
      image.alt=incoming.alt;
      image.style.opacity="1";
      image.style.transform="none";
      incoming.remove();
      old.cancel();
      thumbs();
      busy=false
    }).catch(()=>{
      index=n;
      image.src=imgs[n];
      incoming.remove();
      thumbs();
      busy=false
    })
  };

  incoming.onerror=()=>busy=false
}

function openProject(id){
  current=PROJECTS.find(p=>p.id===id);
  if(!current)return;

  lastFocus=document.activeElement;
  imgs=projectImages(current);
  index=0;

  title.textContent=current.title;
  desc.textContent=current.description;
  price.textContent=current.price||"";
  tags.innerHTML=[
    ...(current.tags||[current.category]),
    current.status?`✓ ${current.status}`:"",
    current.version?current.version:"",
    current.updated?`Mis à jour le ${current.updated}`:""
  ].filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join("");

  const hasDetails=Array.isArray(current.details)&&current.details.length;
  const hasChangelog=Array.isArray(current.changelog)&&current.changelog.length;

  details.innerHTML=`
    ${hasDetails?`
      <b>Ce qui est inclus</b>
      <ul>
        ${current.details.map(x=>`<li>${esc(x)}</li>`).join("")}
      </ul>
    `:""}

    ${hasChangelog?`
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
        <b>Dernière mise à jour — ${esc(current.version||"")}</b>
        ${current.updated?`<small style="display:block;margin-top:5px;opacity:.7">${esc(current.updated)}</small>`:""}
        <ul>
          ${current.changelog.map(x=>`<li>${esc(x)}</li>`).join("")}
        </ul>
      </div>
    `:""}
  `;

  details.hidden=!hasDetails&&!hasChangelog;

  buy.innerHTML=`
    <button class="btn primary" type="button" id="buy-project">
      Acheter${current.price?` — ${esc(current.price)}`:""} ↗
    </button>

    ${current.workshopUrl?`
      <a class="btn ghost" href="${esc(current.workshopUrl)}" target="_blank" rel="noopener noreferrer">
        Workshop ↗
      </a>
    `:""}

    <small>Paiement sécurisé via Stripe. Connexion à ton compte requise.</small>
  `;

  const buyButton=$("#buy-project");

  if(buyButton){
    buyButton.onclick=async()=>{
      buyButton.disabled=true;
      buyButton.textContent="Préparation du paiement…";

      try{
        const {data:{session}}=await supabaseClient.auth.getSession();

        if(!session){
          window.location.href="espace.html";
          return;
        }

        const response=await fetch(CREATE_CHECKOUT_URL,{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${session.access_token}`,
            "apikey":SUPABASE_ANON_KEY
          },
          body:JSON.stringify({
            product_id:"redwood"
          })
        });

        const data=await response.json();

        if(!response.ok||!data.url){
          throw new Error(data.error||"Impossible de créer le paiement.");
        }

        window.location.href=data.url;
      }catch(error){
        console.error("Erreur checkout:",error);

        alert(
          error.message||
          "Une erreur est survenue lors de la préparation du paiement."
        );

        buyButton.disabled=false;
        buyButton.textContent=`Acheter${current.price?` — ${esc(current.price)}`:""} ↗`;
      }
    };
  }

  preload();
  arrows();

  if(imgs.length){
    image.src=imgs[0];
    image.alt=`${current.title} — vue 1`;
    image.classList.add("visible");
    placeholder.hidden=true;
    thumbs()
  }else{
    image.removeAttribute("src");
    image.classList.remove("visible");
    placeholder.hidden=false;
    gallery.hidden=true
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  setTimeout(()=>$(".modal-close")?.focus(),40)
}

function preload(){imgs.forEach(s=>{const i=new Image();i.src=s})}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");busy=false;lastFocus?.focus?.()}
$("#modal-close").onclick=closeModal;
modal.onclick=e=>{if(e.target.matches("[data-close-modal]"))closeModal()};
document.onkeydown=e=>{
  if(!modal.classList.contains("open"))return;
  if(e.key==="Escape")closeModal();
  if(e.key==="ArrowLeft")change(index-1,"prev");
  if(e.key==="ArrowRight")change(index+1,"next")
};

$("#copy-discord").onclick=async()=>{
  try{
    await navigator.clipboard.writeText(SITE_CONFIG.discord);
    $("#copy-message").classList.add("show");
    setTimeout(()=>$("#copy-message").classList.remove("show"),1800)
  }catch{
    prompt("Copie ton pseudo Discord :",SITE_CONFIG.discord)
  }
};

$("#contact-email").textContent=SITE_CONFIG.email;
$("#contact-email-link").href=`mailto:${SITE_CONFIG.email}`;
$("#contact-discord-name").textContent=SITE_CONFIG.discordDisplay||SITE_CONFIG.discord;
$("#contact-discord-handle").textContent=`@${SITE_CONFIG.discord}`;

const menu=$("#menu-btn"),nav=$("#main-nav");
menu.onclick=()=>{
  const open=nav.classList.toggle("open");
  menu.classList.toggle("open",open);
  menu.setAttribute("aria-expanded",open)
};
$$("a",nav).forEach(a=>a.onclick=()=>{
  nav.classList.remove("open");
  menu.classList.remove("open");
  menu.setAttribute("aria-expanded","false")
});

let observer;
function observe(){
  if(!observer)observer=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add("show");
      observer.unobserve(e.target)
    }
  }),{threshold:.1});
  $(".reveal") && $$(".reveal").forEach(e=>observer.observe(e))
}

renderFilters();
renderProjects();
observe();
