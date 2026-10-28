/** @OnlyCurrentDoc */  // limits access to THIS spreadsheet only

/**
 * BoundlessVisionz — order intake (Google Apps Script, bound to the "BoundlessVisionz Orders" Sheet)
 *
 * The website POSTs each order here. This script:
 *   1. creates an order ID  (BV-YYMMDDHH-XXXX, India time)
 *   2. adds a row to the "Orders" tab
 *   3. emails the buyer a confirmation (copy to the shop owner)
 * and replies to the website with the order ID.
 *
 * Setup steps: see SETUP.md in this folder.
 */

// ---------- Settings ----------
const SHOP_NAME = "BoundlessVisionz";
const OWNER_EMAIL = "boundlessvisionz1510@gmail.com"; // gets a copy of every confirmation (BCC)
const WHATSAPP_NUMBER = "918766791945";
const SITE_URL = "https://boundlessvisionz.github.io/";
const TIMEZONE = "Asia/Kolkata";
const SHEET_NAME = "Orders";
const HEADERS = ["Date", "Time", "Order ID", "Painting", "Format", "Size", "Frame", "Amount", "Name", "Email", "Status", "Notes"];

// ---------- Web app entry points ----------
function doGet() {
  return json({ ok: true, service: SHOP_NAME + " orders" });
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const order = validate(data);

    // Same buyer + same item within 10 minutes (double tap, page reload) -> reuse the first order
    const cache = CacheService.getScriptCache();
    const dupKey = "dup:" + Utilities.base64EncodeWebSafe(order.email + "|" + order.painting + "|" + order.format + "|" + order.size + "|" + order.frame);
    const existing = cache.get(dupKey);
    if (existing) return json({ ok: true, orderId: existing, duplicate: true });

    // Light rate limit: max 5 new orders per email per hour
    const rateKey = "rate:" + Utilities.base64EncodeWebSafe(order.email);
    const count = Number(cache.get(rateKey) || 0);
    if (count >= 5) return json({ ok: false, error: "Too many orders from this email. Please try again later." });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let orderId;
    try {
      const sheet = getSheet();
      orderId = newOrderId(sheet);
      const now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd"),
        Utilities.formatDate(now, TIMEZONE, "HH:mm"),
        orderId,
        safeCell(order.painting),
        safeCell(order.formatLabel),
        safeCell(order.size),
        safeCell(order.frame),
        order.amount,
        safeCell(order.name),
        safeCell(order.email),
        "Pending",
        "",
      ]);
    } finally {
      lock.releaseLock();
    }

    cache.put(dupKey, orderId, 600);
    cache.put(rateKey, String(count + 1), 3600);

    let emailSent = true;
    try {
      sendConfirmation(orderId, order);
    } catch (err) {
      emailSent = false; // row is saved; the owner still sees the order in the Sheet
      console.error("Email failed for " + orderId + ": " + err);
    }
    return json({ ok: true, orderId: orderId, emailSent: emailSent });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------- Helpers ----------
function validate(d) {
  if (d.website) throw new Error("Rejected"); // hidden anti-bot field must stay empty
  const clean = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const o = {
    name: clean(d.name, 100),
    email: clean(d.email, 200).toLowerCase(),
    painting: clean(d.painting, 200),
    link: clean(d.link, 300),
    format: d.format === "framed" ? "framed" : "digital",
    size: clean(d.size, 20),
    frame: clean(d.frame, 40),
    amount: Number(d.amount) || 0,
  };
  if (!o.name) throw new Error("Name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) throw new Error("A valid email is required.");
  if (!o.painting) throw new Error("Painting is missing.");
  if (o.link && o.link.indexOf(SITE_URL) !== 0) o.link = SITE_URL; // only ever link to our own site
  o.formatLabel = o.format === "digital" ? "Digital download" : "Framed canvas";
  if (o.format === "digital") { o.size = ""; o.frame = ""; }
  return o;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// BV-YYMMDDHH-XXXX (India time); re-rolls if the ID somehow already exists
function newOrderId(sheet) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I look-alikes
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, "yyMMddHH");
  for (let i = 0; i < 10; i++) {
    let rnd = "";
    for (let j = 0; j < 4; j++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
    const id = "BV-" + stamp + "-" + rnd;
    if (!sheet.createTextFinder(id).matchEntireCell(true).findNext()) return id;
  }
  throw new Error("Could not create an order ID, please try again.");
}

// Stop text like "=HYPERLINK(...)" from being treated as a formula in the Sheet
function safeCell(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function sendConfirmation(orderId, o) {
  const amount = formatINR(o.amount);
  const item = o.format === "digital"
    ? "Digital download (300 DPI files)"
    : [o.size && o.size.replace("x", " × ") + " in", o.frame && o.frame + " frame"].filter(Boolean).join(" · ");
  const waText = "Hey Boundless Visionz!\nPainting: " + o.painting + "\n" + (o.link || SITE_URL) + "\nOrder ID: " + orderId;
  const waLink = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waText);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const next = o.format === "digital"
    ? "Your files will be sent to this email once payment is confirmed."
    : "We'll start framing your piece once payment is confirmed.";

  const subject = "Your " + SHOP_NAME + " order " + orderId;
  const body =
    "Hi " + o.name + ",\n\n" +
    "Thank you for your order! 🎨\n\n" +
    "Order ID: " + orderId + "\n" +
    "Painting: " + o.painting + "\n" +
    "Item: " + item + "\n" +
    "Amount: " + amount + "\n\n" +
    "Next step: complete your payment on WhatsApp. We'll share the UPI details there.\n" +
    waLink + "\n\n" +
    next + "\n\n" +
    "Warmly,\n" + SHOP_NAME + "\n" + SITE_URL;

  const htmlBody =
    '<div style="font-family:Georgia,serif;color:#2b2520;max-width:520px;line-height:1.6">' +
    '<h2 style="font-weight:600;margin:0 0 12px">Thank you for your order! 🎨</h2>' +
    "<p>Hi " + esc(o.name) + ",</p>" +
    '<table style="border-collapse:collapse;margin:12px 0;font-family:Arial,sans-serif;font-size:14px">' +
    row("Order ID", "<b>" + esc(orderId) + "</b>") +
    row("Painting", '<a href="' + esc(o.link || SITE_URL) + '" style="color:#a0522d">' + esc(o.painting) + "</a>") +
    row("Item", esc(item)) +
    row("Amount", esc(amount)) +
    "</table>" +
    "<p><b>Next step: complete your payment on WhatsApp.</b> We'll share the UPI details there.</p>" +
    '<p><a href="' + esc(waLink) + '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-family:Arial,sans-serif">Complete Payment on WhatsApp</a></p>' +
    "<p>" + esc(next) + "</p>" +
    '<p>Warmly,<br>' + SHOP_NAME + '<br><a href="' + SITE_URL + '" style="color:#a0522d">' + SITE_URL + "</a></p></div>";

  MailApp.sendEmail({
    to: o.email,
    bcc: OWNER_EMAIL,
    replyTo: OWNER_EMAIL,
    name: SHOP_NAME,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
  });

  function row(k, v) {
    return '<tr><td style="padding:4px 16px 4px 0;color:#7a6f64">' + k + '</td><td style="padding:4px 0">' + v + "</td></tr>";
  }
}

// 1499 -> "₹1,499", 125000 -> "₹1,25,000" (Indian grouping)
function formatINR(n) {
  const s = String(Math.round(Number(n) || 0));
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  return "₹" + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (▶ Run) to grant permissions and create the Orders tab with headers.
function setup() {
  getSheet();
  console.log("Orders tab ready. Email quota left today: " + MailApp.getRemainingDailyQuota());
}
