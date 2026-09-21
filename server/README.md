# MapForge — Stripe download backend

Ce serveur livre automatiquement **RedWood.zip** après un paiement Stripe confirmé.

## Render

- Root Directory : `server`
- Build Command : `npm install`
- Start Command : `npm start`
- Health Check Path : `/health`
- Persistent Disk : `/var/data` (nécessaire pour conserver le ZIP après redémarrage/redéploiement)

## Variables d'environnement

- `STRIPE_SECRET_KEY` : clé secrète Stripe LIVE. Ne jamais la mettre dans GitHub.
- `STRIPE_WEBHOOK_SECRET` : secret du webhook Stripe.
- `DOWNLOAD_SECRET` : chaîne aléatoire d'au moins 32 caractères.
- `ADMIN_UPLOAD_TOKEN` : token aléatoire pour envoyer le ZIP.
- `EXPECTED_AMOUNT` : `5990`
- `EXPECTED_CURRENCY` : `eur`
- `STRIPE_PAYMENT_LINK_ID` : ID `plink_...` du Payment Link RedWood.
- `DOWNLOAD_DIR` : `/var/data/downloads`
- `REDWOOD_ZIP_NAME` : `RedWood.zip`

## Redirection Stripe

Dans le Payment Link RedWood, mets :

`https://TON-SERVICE.onrender.com/download?session_id={CHECKOUT_SESSION_ID}`

## Webhook Stripe

URL :

`https://TON-SERVICE.onrender.com/webhook`

Événements :
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

## Envoyer le ZIP

PowerShell :

```powershell
curl.exe -X POST "https://TON-SERVICE.onrender.com/admin/upload" `
  -H "X-Admin-Token: TON_ADMIN_UPLOAD_TOKEN" `
  -F "file=@C:\cheminers\RedWood.zip"
```

Puis ouvre `/health` et vérifie `fileReady: true`.

Le ZIP n'est pas dans GitHub et le serveur vérifie auprès de Stripe que la session est réellement payée avant d'envoyer le fichier.
