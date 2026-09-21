const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const Stripe = require("stripe");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const downloadSecret = process.env.DOWNLOAD_SECRET;
const downloadDir = process.env.DOWNLOAD_DIR || "/var/data/downloads";
const zipPath = path.join(downloadDir, process.env.REDWOOD_ZIP_NAME || "RedWood.zip");
const expectedAmount = Number(process.env.EXPECTED_AMOUNT || 5990);
const expectedCurrency = (process.env.EXPECTED_CURRENCY || "eur").toLowerCase();
const expectedPaymentLink = process.env.STRIPE_PAYMENT_LINK_ID || "";

if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is missing.");
if (!downloadSecret || downloadSecret.length < 32) throw new Error("DOWNLOAD_SECRET must be set and contain at least 32 characters.");

const stripe = new Stripe(stripeSecret);
fs.mkdirSync(downloadDir, { recursive: true });

function safeSessionId(value) {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]+$/.test(value);
}
function sign(value) {
  return crypto.createHmac("sha256", downloadSecret).update(value).digest("base64url");
}
function tokenFor(sessionId, expiresAt) {
  const payload = sessionId + "." + expiresAt;
  return payload + "." + sign(payload);
}
function verifyToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const sessionId = parts[0];
  const expiresAt = Number(parts[1]);
  const signature = parts[2];
  if (!safeSessionId(sessionId) || !Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const expected = sign(sessionId + "." + expiresAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { sessionId, expiresAt };
}

async function validatePaidSession(sessionId) {
  if (!safeSessionId(sessionId)) {
    const error = new Error("Invalid checkout session.");
    error.statusCode = 400;
    throw error;
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    const error = new Error("Payment is not confirmed yet.");
    error.statusCode = 402;
    throw error;
  }
  if (expectedPaymentLink && session.payment_link !== expectedPaymentLink) {
    const error = new Error("This checkout does not match the requested product.");
    error.statusCode = 403;
    throw error;
  }
  if (expectedAmount > 0 && session.amount_total !== expectedAmount) {
    const error = new Error("The paid amount does not match this product.");
    error.statusCode = 403;
    throw error;
  }
  if (String(session.currency || "").toLowerCase() !== expectedCurrency) {
    const error = new Error("The payment currency does not match this product.");
    error.statusCode = 403;
    throw error;
  }
  return session;
}

function sendDownload(res) {
  if (!fs.existsSync(zipPath)) return res.status(503).send("Le fichier RedWood.zip n'est pas encore disponible sur le serveur.");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="RedWood.zip"');
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.sendFile(zipPath, { dotfiles: "deny" }, (err) => {
    if (err && !res.headersSent) res.status(500).end();
  });
}

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!webhookSecret) return res.status(200).json({ received: true, configured: false });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send("Invalid webhook signature.");
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    console.log("Paid MapForge checkout:", session.id, session.payment_status, session.amount_total, session.currency);
  }
  return res.status(200).json({ received: true });
});

app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => res.json({
  ok: true,
  product: "RedWood",
  fileReady: fs.existsSync(zipPath),
  paymentLinkConfigured: Boolean(expectedPaymentLink)
}));

app.get("/download", async (req, res) => {
  try {
    await validatePaidSession(req.query.session_id);
    return sendDownload(res);
  } catch (err) {
    const status = Number(err.statusCode) || 500;
    console.error("Download validation failed:", err.message);
    return res.status(status).send(
      status === 402
        ? "Le paiement n'est pas encore confirmé. Réessaie dans quelques instants."
        : "Lien de téléchargement invalide ou paiement non reconnu."
    );
  }
});

app.get("/download/token", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    await validatePaidSession(sessionId);
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    const token = tokenFor(sessionId, expiresAt);
    res.json({
      ok: true,
      expiresAt,
      token,
      downloadUrl: "/download/file?token=" + encodeURIComponent(token)
    });
  } catch (err) {
    const status = Number(err.statusCode) || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.get("/download/file", async (req, res) => {
  const verified = verifyToken(req.query.token);
  if (!verified) return res.status(403).send("Lien de téléchargement expiré ou invalide.");
  try {
    await validatePaidSession(verified.sessionId);
    return sendDownload(res);
  } catch (err) {
    const status = Number(err.statusCode) || 500;
    return res.status(status).send("Paiement non confirmé ou téléchargement non autorisé.");
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, downloadDir),
    filename: (_req, _file, cb) => cb(null, process.env.REDWOOD_ZIP_NAME || "RedWood.zip")
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.originalname.toLowerCase().endsWith(".zip");
    cb(ok ? null : new Error("Only .zip files are accepted."), ok);
  }
});

app.post("/admin/upload", (req, res, next) => {
  const provided = req.headers["x-admin-token"];
  const configured = process.env.ADMIN_UPLOAD_TOKEN;
  if (!configured || typeof provided !== "string" || provided !== configured) return res.status(401).send("Unauthorized.");
  return next();
}, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Aucun fichier .zip fourni.");
  res.json({ ok: true, filename: req.file.filename, bytes: req.file.size });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).send(err.message || "Bad request.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("MapForge download server listening on port " + PORT);
  console.log("Download file: " + zipPath);
});
