# HBi — Portfolio Garry's Mod

## Publier sur GitHub Pages

Les fichiers à mettre à la racine du dépôt sont :
- `index.html`
- `style.css`
- `script.js`
- `projects.js`
- `assets/hbi-logo.jpg`

## Ajouter une map ou un bâtiment

Tout se gère dans `projects.js`.

Exemple :

```js
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
}
```

- `category` : tu peux écrire ce que tu veux (Map, Bâtiment, Intérieur, etc.).
- `image` : mets ta capture dans `assets/`.
- `price` : prix affiché.
- `paymentUrl` : lien vers ton vrai paiement (Stripe Payment Link, PayPal, Tebex, etc.).
- Si `paymentUrl` est vide, le site propose de commander par email.
- Tu peux supprimer ou ajouter autant de projets que tu veux.

## Contact déjà configuré

Email : `mbkdodos@gmail.com`
Discord : `HBiTiO` / `hbitio`

Le bouton de fermeture de la fiche projet fonctionne avec la croix, un clic hors de la fenêtre ou la touche Échap.
