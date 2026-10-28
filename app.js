(function () {
  const cfg = window.SITE_CONFIG;
  const $ = (sel) => document.querySelector(sel);

  // ---------- Fill static text ----------
  document.title = cfg.brandName;
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = cfg.brandName));
  $("[data-tagline]").textContent = cfg.tagline;
  $("[data-hero-title]").textContent = cfg.heroTitle;
  $("[data-about]").textContent = cfg.about;
  document.querySelectorAll("[data-shipping]").forEach((el) => (el.textContent = cfg.shippingNote));
  document.querySelectorAll("[data-policy]").forEach((el) => (el.textContent = cfg.policyNote));
  $("#year").textContent = new Date().getFullYear();

  const contact = [];
  if (cfg.whatsappNumber) contact.push(`<a href="https://wa.me/${cfg.whatsappNumber}" target="_blank" rel="noopener">WhatsApp</a>`);
  if (cfg.instagramHandle) contact.push(`<a href="https://instagram.com/${cfg.instagramHandle}" target="_blank" rel="noopener">Instagram</a>`);
  if (cfg.email) contact.push(`<a href="mailto:${cfg.email}">Email</a>`);
  $("#contact").innerHTML = contact.join("");

  // ---------- Helpers ----------
  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const formatPrice = (p) => {
    const n = Number(String(p).replace(/[^\d.]/g, ""));
    return isNaN(n) || !n ? String(p) : "₹" + n.toLocaleString("en-IN");
  };

  // "Natural Oak" -> "natural-oak"; also used for collection URLs like #/collection/japandi-landscapes
  const slug = (c) => String(c).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Turn a Google Drive share link into a direct image link
  function driveToImage(url) {
    if (!url) return "";
    const m = url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
    return m && url.includes("drive.google.com") ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : url.trim();
  }

  // ---------- Load paintings.json ----------
  // Fields: title, collection, photo, status (Available / Sold / Hidden), featured (true/false), description
  function normalise(raw) {
    return (Array.isArray(raw) ? raw : [])
      .filter((r) => r && String(r.title || "").trim())
      .map((r) => ({
        title: String(r.title).trim(),
        category: String(r.collection || r.category || "").trim(),
        photo: String(r.photo || "").trim(),
        status: String(r.status || "Available").trim(),
        featured: r.featured === true || /^(yes|y|true|1)$/i.test(String(r.featured || "").trim()) ? "Yes" : "",
        description: String(r.description || "").trim(),
        sizes: Array.isArray(r.sizes) ? r.sizes.map((x) => String(x).trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean) : null,
        prices: r.prices && typeof r.prices === "object" ? r.prices : null,
      }))
      .filter((p) => p.status.toLowerCase() !== "hidden");
  }

  async function loadPaintings() {
    const res = await fetch("paintings.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load paintings.json (HTTP " + res.status + ")");
    const text = await res.text();
    try {
      return normalise(JSON.parse(text));
    } catch (err) {
      // Point to the line with the mistake, e.g. a missing comma or quote
      const pos = Number((String(err.message).match(/position (\d+)/) || [])[1]);
      const line = isNaN(pos) ? "" : " near line " + text.slice(0, pos).split("\n").length;
      throw new Error("paintings.json has a formatting mistake" + line + ". Check for a missing comma, quote or bracket.");
    }
  }

  // ---------- Pricing ----------
  // A painting's own "prices" win; otherwise the shared table in config.js
  const priceFor = (p, size, frame) => Number(p?.prices?.[size]?.[frame] ?? cfg.prices?.[size]?.[frame]) || 0;
  // A painting's own "sizes" list (if given), else the default sizes; sizes without any price are left out
  const sizesFor = (p) => (p?.sizes?.length ? p.sizes : cfg.sizes).filter((sz) => cfg.frames.some((f) => priceFor(p, sz, f)));
  const isDigital = (o) => o.format === "digital";
  const orderPrice = (o) => (isDigital(o) ? Number(cfg.digitalPrice) || 0 : priceFor(o.p, o.size, o.frame));
  const orderLabel = (o) => (isDigital(o) ? "Digital download (300 DPI files)" : `${sizeLabel(o.size)} · ${o.frame} frame`);
  const minPrice = (p) => Math.min(...sizesFor(p).flatMap((sz) => cfg.frames.map((f) => priceFor(p, sz, f))).filter(Boolean));
  // Text with {sizes} / {sizeCount} placeholders filled in for a painting
  const fillSizes = (text, p) => String(text || "")
    .replace(/\{sizeCount\} Sizes/g, sizesFor(p).length === 1 ? "1 Size" : sizesFor(p).length + " Sizes")
    .replace(/\{sizeCount\}/g, sizesFor(p).length)
    .replace(/\{sizes\}/g, sizesFor(p).map((sz) => sz.replace("x", " x ") + " in").join(", "));
  const frameClass = (f) => slug(f);
  const sizeLabel = (sz) => sz.replace("x", " × ") + " in";

  // ---------- Render ----------
  let paintings = [];

  const isSold = (p) => p.status.toLowerCase() === "sold";
  const isFeatured = (p) => ["yes", "y", "true", "1"].includes(String(p.featured || "").trim().toLowerCase());
  const sameCat = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  function cardsHtml(list, showCategory) {
    return list
      .map((p) => {
        const i = paintings.indexOf(p);
        const sold = isSold(p);
        return `
        <article class="card ${sold ? "sold" : ""}">
          <div class="img-wrap" ${sold ? "" : `data-buy="${i}"`}>
            <img src="${escapeHtml(driveToImage(p.photo))}" alt="${escapeHtml(p.title)}" loading="lazy">
            ${sold ? '<span class="badge">Sold</span>' : ""}
          </div>
          <div class="card-body">
            ${showCategory && p.category ? `<div class="tag">${escapeHtml(p.category)}</div>` : ""}
            <h3>${escapeHtml(p.title)}</h3>
            <div class="meta">${escapeHtml(fillSizes(cfg.cardFeatures, p))}</div>
            <div class="desc"></div>
            ${sold ? "" : `<div class="card-prices">${cfg.digitalPrice ? `<span>Digital ${formatPrice(cfg.digitalPrice)}</span><span class="sep"> · </span>` : ""}<span>Framed from ${formatPrice(minPrice(p))}</span></div>`}
            <div class="card-foot">
              <button class="btn small" data-buy="${i}" ${sold ? "disabled" : ""}>${sold ? "Sold" : "Customize &amp; Buy"}</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderPicks() {
    const picks = paintings.filter((p) => isFeatured(p) && !isSold(p));
    $("#picks").hidden = !picks.length;
    $("#picks-grid").innerHTML = cardsHtml(picks, true);
  }

  function renderCategories() {
    const cats = cfg.categories || [];
    $("#cat-tiles").innerHTML = cats
      .map((c) => {
        const inCat = paintings.filter((p) => sameCat(p.category, c));
        const cover = inCat.find((p) => !isSold(p)) || inCat[0];
        return `
        <a class="cat-tile" href="#/collection/${slug(c)}">
          ${cover ? `<img src="${escapeHtml(driveToImage(cover.photo))}" alt="" loading="lazy">` : ""}
          <span class="cat-label">
            <span class="cat-name">${escapeHtml(c)}</span>
            <span class="cat-count">${inCat.length ? inCat.length + " painting" + (inCat.length > 1 ? "s" : "") : "Coming soon"}</span>
          </span>
        </a>`;
      })
      .join("");
  }

  function renderCollection(c) {
    const list = paintings.filter((p) => sameCat(p.category, c));
    $("#gallery-title").textContent = c;
    $("#grid").innerHTML = list.length
      ? cardsHtml(list, false)
      : '<p class="muted">New paintings coming soon!</p>';
  }

  // Pages: home  |  #/collection/<name>  |  #/painting/<title>  |  #/checkout/...
  const paintingUrl = (p) => "#/painting/" + slug(p.title);
  const collectionUrl = (c) => "#/collection/" + slug(c);

  function route() {
    const h = location.hash;
    const cm = h.match(/^#\/collection\/(.+)$/);
    const pm = h.match(/^#\/painting\/(.+)$/);
    const cat = cm && (cfg.categories || []).find((c) => slug(c) === cm[1]);
    const painting = pm && paintings.find((p) => slug(p.title) === pm[1]);
    // #/checkout/<title>/digital  or  #/checkout/<title>/<size>/<frame>
    const km = h.match(/^#\/checkout\/([^/]+)\/(.+)$/);
    const kp = km && paintings.find((p) => slug(p.title) === km[1]);
    let checkout = null;
    if (kp && !isSold(kp)) {
      if (km[2] === "digital") checkout = { p: kp, format: "digital", frame: cfg.frames[0], size: sizesFor(kp)[0] };
      else {
        const [sz, fr] = km[2].split("/");
        const size = sizesFor(kp).find((x) => x === sz);
        const frame = cfg.frames.find((f) => slug(f) === fr);
        if (size && frame) checkout = { p: kp, format: "framed", frame, size };
      }
    }
    const onHome = !cat && !painting && !checkout;

    document.querySelectorAll(".home-only").forEach((el) => el.classList.toggle("is-hidden", !onHome));
    $("#gallery").hidden = !cat;
    $("#product").hidden = !painting;
    $("#checkout").hidden = !checkout;

    if (cat) {
      renderCollection(cat);
      document.title = `${cat} · ${cfg.brandName}`;
      window.scrollTo(0, 0);
    } else if (checkout) {
      renderCheckout(checkout);
      document.title = `Checkout · ${cfg.brandName}`;
      window.scrollTo(0, 0);
    } else if (painting) {
      renderProduct(painting);
      document.title = `${painting.title} · ${cfg.brandName}`;
      window.scrollTo(0, 0);
    } else {
      document.title = cfg.brandName;
      const target = h.length > 1 && document.getElementById(h.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  // Hero: three paintings, one in each frame style
  function renderHero() {
    const avail = paintings.filter((p) => !isSold(p));
    const pool = [...avail.filter(isFeatured), ...avail.filter((p) => !isFeatured(p))].slice(0, 3);
    $("#hero-art").innerHTML = pool
      .map((p, k) => `
        <div class="frame hero-frame f${k} ${frameClass(cfg.frames[k % cfg.frames.length])}">
          <img src="${escapeHtml(driveToImage(p.photo))}" alt="${escapeHtml(p.title)}">
        </div>`)
      .join("");
  }

  function render() {
    renderHero();
    renderPicks();
    renderCategories();
    route();
  }

  // ---------- Product page ----------
  let current = null; // { p, format: "framed" | "digital", frame, size }

  function updateDetail() {
    const { frame, size } = current;
    const digital = isDigital(current);

    document.querySelectorAll("#format-opts .format-btn").forEach((b) => b.classList.toggle("selected", b.dataset.format === current.format));
    $("#framed-opts").hidden = digital;
    $("#digital-note").hidden = !digital;
    $("#frame").className = "frame " + (digital ? "digital" : frameClass(frame));
    $("#frame-name").textContent = frame;
    document.querySelectorAll("#frame-opts .swatch").forEach((b) => b.classList.toggle("selected", b.dataset.frame === frame));
    document.querySelectorAll("#size-opts .size-btn").forEach((b) => b.classList.toggle("selected", b.dataset.size === size));
    const price = orderPrice(current);
    $("#buy-price").textContent = price ? formatPrice(price) : "Not available in this frame";
    $("#to-pay").disabled = !price;
    $("#to-pay").textContent = digital ? "Get Instant Download" : "Buy now";
  }

  function renderProduct(p) {
    if (!current || current.p !== p) current = { p, format: "framed", frame: cfg.frames[0], size: sizesFor(p)[0] };

    $("#buy-img").src = driveToImage(p.photo);
    $("#buy-img").alt = p.title;
    $("#buy-cat").textContent = p.category || "";
    $("#buy-cat").href = p.category ? collectionUrl(p.category) : "#";
    $("#buy-title").textContent = p.title;
    $("#crumb-cat").textContent = p.category || "Collections";
    $("#crumb-cat").href = p.category ? collectionUrl(p.category) : "#collections";
    $("#crumb-title").textContent = p.title;
    $("#buy-desc").textContent = p.description || "";
    $("#buy-desc").hidden = !p.description;
    $("#details").innerHTML = (cfg.productDetails || [])
      .map(([k, v]) => `<li><span>${escapeHtml(k)}</span><span>${escapeHtml(fillSizes(v, p))}</span></li>`)
      .join("");

    const related = paintings.filter((o) => o !== p && !isSold(o) && sameCat(o.category, p.category)).slice(0, 4);
    $("#related").hidden = !related.length;
    $("#related-grid").innerHTML = cardsHtml(related, false);

    $("#frame-opts").innerHTML = cfg.frames
      .map((f) => `<button class="swatch ${frameClass(f)}" data-frame="${escapeHtml(f)}" title="${escapeHtml(f)}" aria-label="${escapeHtml(f)} frame"></button>`)
      .join("");
    $("#size-opts").innerHTML = sizesFor(p)
      .map((sz) => `<button class="size-btn" data-size="${escapeHtml(sz)}">${escapeHtml(sz.replace("x", " × "))}</button>`)
      .join("");

    updateDetail();
  }

  // ---------- Checkout page ----------
  const checkoutUrl = (o) =>
    `#/checkout/${slug(o.p.title)}/` + (isDigital(o) ? "digital" : `${o.size}/${slug(o.frame)}`);

  function renderCheckout(order) {
    current = order;
    const { p } = order;
    const digital = isDigital(order);
    const price = orderPrice(order);

    $("#checkout-back").href = paintingUrl(p);
    $("#sum-change").href = paintingUrl(p);
    $("#sum-img").src = driveToImage(p.photo);
    $("#sum-img").alt = p.title;
    $("#sum-frame").className = "frame sum-frame " + (digital ? "digital" : frameClass(order.frame));
    $("#sum-title").textContent = p.title;
    $("#sum-opts").textContent = orderLabel(order);
    $("#sum-total").textContent = formatPrice(price);
    $("#sum-note").textContent = digital ? "Files delivered instantly via email/WhatsApp after payment." : cfg.shippingNote;

    // Digital orders need no shipping address
    $("#details-heading").textContent = digital ? "1. Your details" : "1. Delivery details";
    document.querySelectorAll("#address-step [data-physical]").forEach((el) => (el.hidden = digital));
    document.querySelectorAll("#address-step [data-digital]").forEach((el) => (el.hidden = !digital));
    $("#details-submit").textContent = digital ? "Place order" : "Continue to payment";
    $("#details-submit").disabled = false;

    $("#buy-qr").src = cfg.upiQrImage;
    $("#buy-upi").textContent = cfg.upiId;
    const upi = new URLSearchParams({ pa: cfg.upiId, pn: cfg.upiName, am: price, cu: "INR", tn: `${p.title} - ${orderLabel(order)}` });
    $("#buy-upi-link").href = "upi://pay?" + upi.toString();

    // Always start at the details step (details typed earlier are kept)
    const open = typeof cfg.ordersOpen === "object" ? !!cfg.ordersOpen[order.format] : !!cfg.ordersOpen;
    const digitalOpen = typeof cfg.ordersOpen === "object" ? !!cfg.ordersOpen.digital : !!cfg.ordersOpen;
    $("#closed-text").textContent = !digital && digitalOpen
      ? "Framed canvas orders are opening very soon. Digital downloads of this painting are available now!"
      : "We're putting the finishing touches on our shop. Orders will open very soon. Thank you for your patience!";
    $("#closed-digital").hidden = digital || !digitalOpen;
    $("#closed-digital").href = checkoutUrl({ ...order, format: "digital" });
    $("#orders-closed").hidden = open;
    $("#pay-step").hidden = true;
    $("#wa-step").hidden = true;
    $("#address-step").hidden = !open;
    $("#address-error").hidden = true;
    $("#steps-track").hidden = !(open && digital);
    setStep(1);
  }

  function setStep(n) {
    document.querySelectorAll("#steps-track li").forEach((li) => {
      const k = Number(li.dataset.step);
      li.classList.toggle("done", k < n);
      li.classList.toggle("current", k === n);
    });
  }

  // Backup order ID made in the browser if the Sheet can't be reached: BV-YYMMDDHH-XXXX (India time)
  function localOrderId() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date()).map((x) => [x.type, x.value])
    );
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => chars[n % chars.length]).join("");
    return `BV-${parts.year}${parts.month}${parts.day}${parts.hour}-${rnd}`;
  }

  // Send the order to her Google Sheet (Apps Script). Returns { orderId, emailSent } or throws.
  async function recordOrder(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(cfg.orderEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request: no CORS preflight
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  $("#format-opts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-format]");
    if (b) { current.format = b.dataset.format; updateDetail(); }
  });
  $("#frame-opts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-frame]");
    if (b) { current.frame = b.dataset.frame; updateDetail(); }
  });
  $("#size-opts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if (b) { current.size = b.dataset.size; updateDetail(); }
  });
  // Back from payment to the (still filled-in) address form
  $("#edit-address").addEventListener("click", () => {
    $("#pay-step").hidden = true;
    $("#address-step").hidden = false;
    $("#address-step").name.focus();
  });

  $("#to-pay").addEventListener("click", () => { location.hash = checkoutUrl(current); });

  // Delivery details -> validate, then show payment + WhatsApp order message
  function readAddress() {
    const f = $("#address-step");
    const v = Object.fromEntries([...new FormData(f)].map(([k, val]) => [k, String(val).trim()]));
    v.phone = v.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    const bad = [];
    if (!v.name) bad.push("name");
    if (isDigital(current)) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) bad.push("email");
    } else {
      ["address", "city", "state"].forEach((k) => { if (!v[k]) bad.push(k); });
      if (!/^[6-9]\d{9}$/.test(v.phone)) bad.push("phone");
      if (!/^\d{6}$/.test(v.pincode)) bad.push("pincode");
    }
    f.querySelectorAll("input, textarea").forEach((el) => el.classList.toggle("invalid", bad.includes(el.name)));
    return { v, bad };
  }

  $("#address-step").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { v, bad } = readAddress();
    if (bad.length) {
      const err = $("#address-error");
      err.textContent = bad.includes("email")
        ? "Please enter a valid email address. Your files will be sent there."
        : bad.includes("phone") || bad.includes("pincode")
        ? "Please check the highlighted fields (phone number, 6-digit pincode)."
        : "Please fill in the highlighted fields.";
      err.hidden = false;
      return;
    }
    $("#address-error").hidden = true;

    const { p } = current;
    const price = orderPrice(current);
    let msg;
    if (isDigital(current)) {
      const btn = $("#details-submit");
      btn.disabled = true;
      btn.textContent = "Placing order…";
      const paintingLink = location.origin + location.pathname + paintingUrl(p);
      let orderId = null, emailSent = false;
      if (cfg.orderEndpoint) {
        try {
          const r = await recordOrder({
            name: v.name, email: v.email, website: v.website || "",
            painting: p.title, link: paintingLink, format: "digital", size: "", frame: "", amount: price,
          });
          if (r && r.ok) { orderId = r.orderId; emailSent = r.emailSent !== false; }
          else if (r && r.error) {
            btn.disabled = false; btn.textContent = "Place order";
            $("#address-error").textContent = r.error;
            $("#address-error").hidden = false;
            return;
          }
        } catch (err) {
          console.error("Order could not be recorded:", err); // fall through to a browser-made ID
        }
      }
      if (!orderId) orderId = localOrderId();

      msg = ["Hey Boundless Visionz!", `Painting: ${p.title}`, paintingLink, `Order ID: ${orderId}`].join("\n");
      $("#wa-order-id").textContent = orderId;
      $("#wa-email-note").textContent = emailSent
        ? `A confirmation has been sent to ${v.email}.`
        : "We'll confirm your order on WhatsApp.";
      $("#wa-open").href = `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      $("#address-step").hidden = true;
      $("#wa-step").hidden = false;
      setStep(2);
      $("#steps-track").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    } else {
      const addressLines = [v.address, v.landmark && "Landmark: " + v.landmark, `${v.city}, ${v.state} - ${v.pincode}`].filter(Boolean);
      $("#ship-to").textContent = `Shipping to: ${v.name} (${v.phone})\n` + addressLines.join("\n");
      msg = [
        "Hi! I'd like to order:",
        `• ${p.title}`,
        `• Size: ${sizeLabel(current.size)}`,
        `• Frame: ${current.frame}`,
        `• Amount paid: ${formatPrice(price)}`,
        "",
        "Deliver to:",
        v.name,
        v.phone,
        ...addressLines,
        "",
        "Payment screenshot attached.",
      ].join("\n");
    }
    $("#buy-wa").href = `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(msg)}`;

    $("#address-step").hidden = true;
    $("#pay-step").hidden = false;
    $("#pay-step").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.addEventListener("click", (e) => {
    const buy = e.target.closest("[data-buy]");
    if (buy) location.hash = paintingUrl(paintings[Number(buy.dataset.buy)]);
  });
  window.addEventListener("hashchange", route);

  // Discourage saving paintings: no right-click / long-press menu, no dragging (QR code and logo unaffected)
  const PAINTING_IMG = ".img-wrap img, .frame img, .cat-tile img";
  ["contextmenu", "dragstart"].forEach((type) =>
    document.addEventListener(type, (e) => {
      if (e.target.closest && e.target.closest(PAINTING_IMG)) e.preventDefault();
    })
  );
  $("#copy-upi").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cfg.upiId);
      $("#copy-upi").textContent = "Copied!";
      setTimeout(() => ($("#copy-upi").textContent = "Copy"), 1500);
    } catch (_) {}
  });

  // ---------- Go ----------
  loadPaintings()
    .then((list) => { paintings = list; render(); })
    .catch((err) => {
      console.error(err);
      const box = document.createElement("div");
      box.className = "load-error";
      box.textContent = "⚠️ " + err.message;
      document.querySelector(".site-header").after(box);
      $("#picks").hidden = true;
      $("#cat-tiles").innerHTML = '<p class="muted">Paintings couldn\'t be loaded right now. Please refresh in a moment.</p>';
    });
})();
