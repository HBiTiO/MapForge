const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hbitio.github.io/MapForge';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/var/data/downloads';
const ZIP_NAME = process.env.REDWOOD_ZIP_NAME || 'RedWood.zip';
const zipPath = path.join(DOWNLOAD_DIR, ZIP_NAME);

if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is missing.');
if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is missing.');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');
if (!process.env.REDWOOD_STRIPE_PRICE_ID) throw new Error('REDWOOD_STRIPE_PRICE_ID is missing.');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

app.use(cors({ origin: FRONTEND_URL, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send('Invalid webhook signature.');
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const userId = session.metadata?.user_id || session.client_reference_id;
        const email = session.customer_details?.email || session.customer_email || '';
        if (userId && email) {
          const { error } = await supabaseAdmin.from('purchases').upsert({
            user_id: userId,
            email,
            product_id: session.metadata?.product_id || 'redwood',
            product_name: 'RedWood',
            version: 'v1.0.0',
            amount_total: session.amount_total || 5990,
            currency: String(session.currency || 'eur').toLowerCase(),
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null
          }, { onConflict: 'stripe_session_id' });
          if (error) console.error('Supabase purchase insert error:', error);
          else console.log('Purchase recorded:', session.id, email);
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).send('Webhook processing failed.');
  }
  return res.status(200).json({ received: true });
});

app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'MapForge API', product: 'RedWood', fileReady: fs.existsSync(zipPath) }));

async function getUser(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié.' }), null;
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (error || !data?.user) return res.status(401).json({ error: 'Session invalide.' }), null;
  return data.user;
}

app.post('/api/checkout', async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, product_id: 'redwood' },
      line_items: [{ price: process.env.REDWOOD_STRIPE_PRICE_ID, quantity: 1 }],
      success_url: FRONTEND_URL + '/merci.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: FRONTEND_URL + '/index.html#projects'
    });
    res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('Checkout creation error:', err);
    res.status(500).json({ ok: false, error: 'Impossible de créer le paiement.' });
  }
});

app.get('/api/me/purchases', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return;
  const { data, error } = await supabaseAdmin.from('purchases').select('*').eq('user_id', user.id).order('purchased_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Impossible de charger les achats.' });
  const base = process.env.PUBLIC_API_URL || '';
  res.json({ purchases: (data || []).map(p => ({
    id: p.id,
    product_name: p.product_name,
    version: p.version,
    amount_display: (Number(p.amount_total || 0) / 100).toFixed(2).replace('.', ',') + ' €',
    purchased_at: p.purchased_at,
    download_url: base + '/api/download/' + encodeURIComponent(p.id),
    workshop_url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3805682573'
  })) });
});

app.get('/api/download/:purchaseId', async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return;
  const { data: purchase, error } = await supabaseAdmin.from('purchases').select('id,product_id,user_id').eq('id', req.params.purchaseId).eq('user_id', user.id).eq('product_id', 'redwood').maybeSingle();
  if (error || !purchase) return res.status(404).send('Achat introuvable ou téléchargement non autorisé.');
  if (!fs.existsSync(zipPath)) return res.status(503).send('RedWood.zip n’est pas disponible sur le serveur.');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="RedWood.zip"');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(zipPath, { dotfiles: 'deny' }, err => { if (err && !res.headersSent) res.status(500).end(); });
});

const upload = multer({
  storage: multer.diskStorage({ destination: (_req,_file,cb) => cb(null, DOWNLOAD_DIR), filename: (_req,_file,cb) => cb(null, ZIP_NAME) }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req,file,cb) => { const ok = file.originalname.toLowerCase().endsWith('.zip'); cb(ok ? null : new Error('Only .zip files are accepted.'), ok); }
});
app.post('/admin/upload', (req,res,next) => {
  const provided = req.headers['x-admin-token'];
  if (!process.env.ADMIN_UPLOAD_TOKEN || typeof provided !== 'string' || provided !== process.env.ADMIN_UPLOAD_TOKEN) return res.status(401).send('Unauthorized.');
  next();
}, upload.single('file'), (req,res) => {
  if (!req.file) return res.status(400).send('Aucun fichier .zip fourni.');
  res.json({ ok:true, filename:req.file.filename, bytes:req.file.size });
});

app.use((err,_req,res,_next) => { console.error(err); res.status(400).send(err.message || 'Bad request.'); });
app.listen(PORT,'0.0.0.0',() => console.log('MapForge API listening on port ' + PORT));
