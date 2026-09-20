/*
  ============================================================
  CONFIGURATION DE TES PROJETS
  ============================================================

  C'est ICI que tu choisis ce qui apparaît sur ton site.

  Pour ajouter une map/bâtiment :
  1. Mets l'image dans le dossier assets/
  2. Copie un bloc ci-dessous
  3. Change title, category, description, image, price, etc.
  4. Si tu veux vendre le projet, mets ton vrai lien de paiement
     dans paymentUrl (Stripe, PayPal, Tebex, Gumroad, etc.).

  Si paymentUrl est vide, le bouton proposera de te contacter.
*/

const PROJECTS = [
  /*
  Exemple :

  {
    id: "ma-map",
    title: "Ma nouvelle map",
    category: "Map",
    description: "Description de ma création.",
    image: "assets/ma-map.jpg",
    tags: ["Map", "Garry's Mod"],
    price: "120 €",
    paymentUrl: "https://TON-LIEN-DE-PAIEMENT",
    status: "Disponible"
  },
  */

  // Tu peux mettre ici tes propres projets.
];

const SITE_CONFIG = {
  discord: "hbitio",
  discordDisplay: "HBiTiO",
  email: "mbkdodos@gmail.com"
};
