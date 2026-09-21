MAPFORGE — ESPACE CLIENT V1

1. Supabase
- Crée un projet Supabase.
- Active Email/Password.
- Active Google si tu le veux.
- Ajoute https://hbitio.github.io/MapForge/espace.html dans les Redirect URLs.
- Exécute supabase.sql.
- Mets l'URL du projet et la clé anon dans espace.js.

2. Stripe
- Récupère le Price ID du produit RedWood à 59,90 €.
- Le nouveau système crée une Checkout Session après connexion.

3. Render
Variables:
FRONTEND_URL=https://hbitio.github.io/MapForge
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
REDWOOD_STRIPE_PRICE_ID=price_...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

Webhook:
https://TON-URL-RENDER/webhook

Événements:
checkout.session.completed
checkout.session.async_payment_succeeded

IMPORTANT: la clé service_role Supabase reste uniquement sur Render.
