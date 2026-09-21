MAPFORGE — mise à jour checkout Stripe + Supabase

Fichiers inclus :
- index.html
- script.js

À faire avant de mettre en ligne :
1. Ouvre script.js.
2. Trouve :
   const SUPABASE_ANON_KEY = "REMPLACE_PAR_TA_CLE_PUBLISHABLE_SUPABASE";
3. Remplace cette valeur par ta clé publishable Supabase.
   Utilise la même clé que celle de ton espace membre.
   Ne mets JAMAIS STRIPE_SECRET_KEY dans ce fichier.

Fonctionnement :
- Utilisateur non connecté → clic sur Acheter → espace.html
- Utilisateur connecté → appel à create-checkout
- Stripe Checkout s'ouvre avec le compte utilisateur associé
- Après paiement, le webhook stripe-webhook enregistrera l'achat

Ne lance pas encore un paiement réel avant le test.
