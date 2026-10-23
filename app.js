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

  // "Light wood" -> "light-wood"; also used for collection URLs like #/collection/japandi-landscapes
  const slug = (c) => String(c).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Turn a Google Drive share link into a direct image link
  function driveToImage(url) {
    if (!url) return "";
    const m = url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
    return m && url.includes("drive.google.com") ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : url.trim();
  }

  // Minimal CSV parser (handles quoted fields with commas/newlines)
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function rowsToPaintings(rows) {
    const header = rows.shift().map((h) => h.trim().toLowerCase());
    const col = (name) => header.indexOf(name);
    return rows
      .filter((r) => r[col("title")] && r[col("title")].trim())
      .map((r) => ({
        title: r[col("title")]?.trim(),
        category: col("category") >= 0 ? r[col("category")]?.trim() : "",
        featured: col("featured") >= 0 ? r[col("featured")]?.trim() : "",
        photo: r[col("photo")]?.trim(),
        status: r[col("status")]?.trim() || "Available",
        description: col("description") >= 0 ? r[col("description")]?.trim() : "",
      }))
      .filter((p) => p.status.toLowerCase() !== "hidden");
  }

  async function loadPaintings() {
    if (!cfg.sheetCsvUrl) return cfg.samplePaintings;
    const res = await fetch(cfg.sheetCsvUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet fetch failed");
    return rowsToPaintings(parseCsv(await res.text()));
  }

  // ---------- Pricing ----------
  const priceFor = (size, frame) => Number(cfg.prices?.[size]?.[frame]) || 0;
  const minPrice = () => Math.min(...cfg.sizes.flatMap((sz) => cfg.frames.map((f) => priceFor(sz, f))).filter(Boolean));
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
            <div class="meta">${escapeHtml(cfg.cardFeatures || "")}</div>
            <div class="desc"></div>
            ${sold ? "" : `<div class="card-prices">${cfg.digitalPrice ? `Digital ${formatPrice(cfg.digitalPrice)} · ` : ""}Framed from ${formatPrice(minPrice())}</div>`}
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

  // Pages: home  |  #/collection/<name>  |  #/painting/<title>  |  #/checkout/<title>/<size>/<frame>
  const paintingUrl = (p) => "#/painting/" + slug(p.title);
  const collectionUrl = (c) => "#/collection/" + slug(c);

  function route() {
    const h = location.hash;
    const cm = h.match(/^#\/collection\/(.+)$/);
    const pm = h.match(/^#\/painting\/(.+)$/);
    const km = h.match(/^#\/checkout\/([^/]+)\/([^/]+)\/([^/]+)$/);
    const kp = km && paintings.find((p) => slug(p.title) === km[1]);
    const ksize = km && cfg.sizes.find((sz) => sz === km[2]);
    const kframe = km && cfg.frames.find((f) => slug(f) === km[3]);
    const checkout = kp && ksize && kframe && !isSold(kp);
    const cat = cm && (cfg.categories || []).find((c) => slug(c) === cm[1]);
    const painting = pm && paintings.find((p) => slug(p.title) === pm[1]);
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
      renderCheckout(kp, kframe, ksize);
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
  let current = null; // { p, frame, size }

  function updateDetail() {
    const { frame, size } = current;
    const price = priceFor(size, frame);

    $("#frame").className = "frame " + frameClass(frame);
    $("#frame-name").textContent = frame;
    document.querySelectorAll("#frame-opts .swatch").forEach((b) => b.classList.toggle("selected", b.dataset.frame === frame));
    document.querySelectorAll("#size-opts .size-btn").forEach((b) => b.classList.toggle("selected", b.dataset.size === size));
    $("#buy-price").textContent = formatPrice(price);
  }

  function renderProduct(p) {
    if (!current || current.p !== p) current = { p, frame: cfg.frames[0], size: cfg.sizes[0] };

    $("#buy-img").src = driveToImage(p.photo);
    $("#buy-img").alt = p.title;
    $("#buy-cat").textContent = p.category || "";
    $("#buy-cat").href = p.category ? collectionUrl(p.category) : "#";
    $("#buy-title").textContent = p.title;
    $("#crumb-cat").textContent = p.category || "Collections";
    $("#crumb-cat").href = p.category ? collectionUrl(p.category) : "#collections";
    $("#crumb-title").textContent = p.title;
    $("#buy-desc").textContent = p.description || "";
    $("#desc-block").hidden = !p.description;
    $("#d-sizes").textContent = cfg.sizes.map(sizeLabel).join(", ");
    $("#d-frames").textContent = cfg.frames.join(", ");

    const related = paintings.filter((o) => o !== p && !isSold(o) && sameCat(o.category, p.category)).slice(0, 4);
    $("#related").hidden = !related.length;
    $("#related-grid").innerHTML = cardsHtml(related, false);

    $("#frame-opts").innerHTML = cfg.frames
      .map((f) => `<button class="swatch ${frameClass(f)}" data-frame="${escapeHtml(f)}" title="${escapeHtml(f)}" aria-label="${escapeHtml(f)} frame"></button>`)
      .join("");
    $("#size-opts").innerHTML = cfg.sizes
      .map((sz) => `<button class="size-btn" data-size="${escapeHtml(sz)}">${escapeHtml(sz.replace("x", " × "))}</button>`)
      .join("");

    updateDetail();
  }

  // ---------- Checkout page ----------
  const checkoutUrl = ({ p, frame, size }) => `#/checkout/${slug(p.title)}/${size}/${slug(frame)}`;

  function renderCheckout(p, frame, size) {
    current = { p, frame, size };
    const price = priceFor(size, frame);

    $("#checkout-back").href = paintingUrl(p);
    $("#sum-change").href = paintingUrl(p);
    $("#sum-img").src = driveToImage(p.photo);
    $("#sum-img").alt = p.title;
    $("#sum-frame").className = "frame sum-frame " + frameClass(frame);
    $("#sum-title").textContent = p.title;
    $("#sum-opts").textContent = `${sizeLabel(size)} · ${frame} frame`;
    $("#sum-total").textContent = formatPrice(price);

    $("#buy-qr").src = cfg.upiQrImage;
    $("#buy-upi").textContent = cfg.upiId;
    const note = `${p.title} - ${sizeLabel(size)} - ${frame} frame`;
    const upi = new URLSearchParams({ pa: cfg.upiId, pn: cfg.upiName, am: price, cu: "INR", tn: note });
    $("#buy-upi-link").href = "upi://pay?" + upi.toString();

    // Always start at the delivery step (details typed earlier are kept)
    $("#orders-closed").hidden = !!cfg.ordersOpen;
    $("#pay-step").hidden = true;
    $("#address-step").hidden = !cfg.ordersOpen;
    $("#address-error").hidden = true;
  }

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
    ["name", "address", "city", "state"].forEach((k) => { if (!v[k]) bad.push(k); });
    if (!/^[6-9]\d{9}$/.test(v.phone)) bad.push("phone");
    if (!/^\d{6}$/.test(v.pincode)) bad.push("pincode");
    f.querySelectorAll("input, textarea").forEach((el) => el.classList.toggle("invalid", bad.includes(el.name)));
    return { v, bad };
  }

  $("#address-step").addEventListener("submit", (e) => {
    e.preventDefault();
    const { v, bad } = readAddress();
    if (bad.length) {
      const err = $("#address-error");
      err.textContent = bad.includes("phone") || bad.includes("pincode")
        ? "Please check the highlighted fields (10-digit phone, 6-digit pincode)."
        : "Please fill in the highlighted fields.";
      err.hidden = false;
      return;
    }
    $("#address-error").hidden = true;

    const { p, frame, size } = current;
    const price = priceFor(size, frame);
    const addressLines = [v.address, v.landmark && "Landmark: " + v.landmark, `${v.city}, ${v.state} - ${v.pincode}`].filter(Boolean);
    $("#ship-to").textContent = `Shipping to: ${v.name} (${v.phone})\n` + addressLines.join("\n");

    const msg = [
      "Hi! I'd like to order:",
      `• ${p.title}`,
      `• Size: ${sizeLabel(size)}`,
      `• Frame: ${frame}`,
      `• Amount paid: ${formatPrice(price)}`,
      "",
      "Deliver to:",
      v.name,
      v.phone,
      ...addressLines,
      "",
      "Payment screenshot attached.",
    ].join("\n");
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
    .catch(() => {
      $("#grid").innerHTML = '<p class="muted">Couldn\'t load paintings right now. Please refresh in a moment.</p>';
    });
})();
