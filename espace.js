const SUPABASE_URL = "https://tedqgheovljafhhwufet.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0DFcBQlYPjWMmvhYv6dpFQ_UXKM1iWj";

let sb = null;
let registerMode = false;

const $ = (id) => document.getElementById(id);

function msg(text, error = false) {
  $("authMessage").textContent = text || "";
  $("authMessage").style.color = error ? "#ff8f9b" : "#a7e8bd";
}

function setMode(register) {
  registerMode = register;

  $("authTitle").textContent = register ? "Créer un compte" : "Connexion";
  $("authSubtitle").textContent = register
    ? "Crée ton compte pour acheter et retrouver tes maps."
    : "Connecte-toi pour accéder à tes achats et téléchargements.";

  $("authSubmit").textContent = register
    ? "Créer mon compte"
    : "Se connecter";

  $("switchAuth").textContent = register
    ? "J'ai déjà un compte"
    : "Créer un compte";

  $("nameLabel").classList.toggle("hidden", !register);
  $("confirmLabel").classList.toggle("hidden", !register);
  $("forgotBtn").classList.toggle("hidden", register);
  $("confirmPassword").required = register;
}

function render(session) {
  $("authView").classList.toggle("hidden", !!session);
  $("dashboardView").classList.toggle("hidden", !session);

  if (session) {
    load(session);
  }
}

async function init() {
  if (!window.supabase) {
    return msg("La bibliothèque Supabase n'est pas chargée.", true);
  }

  if (
    SUPABASE_URL.startsWith("REMPLACE_") ||
    SUPABASE_ANON_KEY.startsWith("REMPLACE_")
  ) {
    return msg("Configuration Supabase à renseigner dans espace.js.", true);
  }

  sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  sb.auth.onAuthStateChange((_event, session) => {
    render(session);
  });

  const {
    data: { session },
  } = await sb.auth.getSession();

  render(session);
}

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!sb) {
    return msg("Supabase n'est pas encore configuré.", true);
  }

  const email = $("email").value.trim();
  const password = $("password").value;

  if (registerMode) {
    if (password !== $("confirmPassword").value) {
      return msg("Les mots de passe ne correspondent pas.", true);
    }

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: $("displayName").value.trim(),
        },
        emailRedirectTo: `${location.origin}/espace.html`,
      },
    });

    if (error) {
      msg(error.message, true);
    } else {
      msg("Compte créé. Vérifie ton adresse email pour l'activer.");
    }
  } else {
    const { error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      msg(error.message, true);
    }
  }
});

$("googleBtn").addEventListener("click", async () => {
  if (!sb) {
    return msg("Supabase n'est pas encore configuré.", true);
  }

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${location.origin}/espace.html`,
    },
  });

  if (error) {
    msg(error.message, true);
  }
});

$("forgotBtn").addEventListener("click", async () => {
  if (!sb) {
    return msg("Supabase n'est pas encore configuré.", true);
  }

  const email = $("email").value.trim();

  if (!email) {
    return msg("Entre d'abord ton adresse email.", true);
  }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/espace.html?reset=1`,
  });

  if (error) {
    msg(error.message, true);
  } else {
    msg("Un email de récupération a été envoyé.");
  }
});

$("switchAuth").addEventListener("click", () => {
  setMode(!registerMode);
});

$("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
});

document.querySelectorAll(".side-btn").forEach((button) => {
  button.onclick = () => {
    document
      .querySelectorAll(".side-btn")
      .forEach((x) => x.classList.remove("active"));

    document
      .querySelectorAll(".dash-section")
      .forEach((x) => x.classList.remove("active"));

    button.classList.add("active");

    document
      .querySelector(`[data-panel="${button.dataset.section}"]`)
      .classList.add("active");
  };
});

async function load(session) {
  const user = session.user;

  const name =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "toi";

  $("helloName").textContent = name;
  $("profileName").value = user.user_metadata?.display_name || "";
  $("profileEmail").value = user.email || "";

  try {
    const { data, error } = await sb
      .from("purchases")
      .select("*")
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error(error);
      paint([]);
      return;
    }

    paint(data || []);
  } catch (error) {
    console.error(error);
    paint([]);
  }
}

function createPurchaseHtml(purchases) {
  return purchases
    .map((purchase) => {
      const productName = purchase.product_name || "Map";
      const version = purchase.version || "v1.0.0";

      const purchasedDate = purchase.purchased_at
        ? new Date(purchase.purchased_at).toLocaleDateString("fr-FR")
        : "—";

      const amount =
        purchase.amount_total != null
          ? `${(purchase.amount_total / 100).toFixed(2).replace(".", ",")} €`
          : "";

      return `
        <article class="purchase-card">
          <div class="purchase-head">
            <div>
              <h3>${escapeHtml(productName)}</h3>
              <div class="muted">
                ${escapeHtml(version)} · Acheté le ${escapeHtml(purchasedDate)}
              </div>
            </div>

            <strong>${escapeHtml(amount)}</strong>
          </div>

          <div class="purchase-actions">
            <a
              href="#"
              class="download-link"
              data-purchase-id="${escapeHtml(purchase.id)}"
            >
              Télécharger
            </a>

            <a
              class="secondary"
              href="https://steamcommunity.com/sharedfiles/filedetails/?id=3805682573"
              target="_blank"
              rel="noopener"
            >
              Workshop
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function paint(purchases) {
  $("statPurchases").textContent = purchases.length;
  $("statDownloads").textContent = purchases.length;

  const html = purchases.length
    ? createPurchaseHtml(purchases)
    : `<div class="empty-box">Aucun achat associé à ce compte pour le moment.</div>`;

  $("purchaseList").innerHTML = html;
  $("downloadList").innerHTML = html;
  $("recentPurchases").innerHTML = html;
}

$("saveProfile").addEventListener("click", async () => {
  if (!sb) return;

  const { error } = await sb.auth.updateUser({
    data: {
      display_name: $("profileName").value.trim(),
    },
  });

  $("profileMessage").textContent = error
    ? error.message
    : "Profil enregistré.";
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

setMode(false);
init();
