// ============================================================
//  SITE SETTINGS — edit the values below, nothing else needed.
// ============================================================
window.SITE_CONFIG = {
  brandName: "BoundlessVisionz",
  heroTitle: "Modern Art Beyond Boundaries",
  tagline: "Elevate your living space with calm, reflection-free art. Enjoy the organic texture of canvas encased in solid wood frames, or choose instant digital downloads to suit your custom wall size.",
  about:
    "Hi! I'm an artist who paints digitally and turns each piece into a framed print. " +
    "Every frame is made to order and packed with care.",

  // Orders switch: false = checkout shows a "launching soon" note instead of payment/WhatsApp.
  // Set to true once the real WhatsApp number, UPI ID, QR and prices are filled in.
  ordersOpen: false,

  // Contact (WhatsApp number with country code, digits only). Empty = hidden on the site.
  whatsappNumber: "",
  instagramHandle: "",
  email: "",

  // Payment
  upiId: "",
  upiName: "BoundlessVisionz",
  upiQrImage: "images/upi-qr.svg", // replace with her real QR screenshot

  // Shipping / policy lines shown on the site
  shippingNote: "Ships across India in 7–10 days. Free shipping.",
  policyNote: "Damaged in transit? Send an unboxing video and we'll replace it.",

  // Published Google Sheet (CSV) link. Leave "" to use the sample paintings below.
  // Sheet columns: Title | Category | Photo | Status | Featured | Description
  //   Category  -> must match one of the names in "categories" below
  //   Featured  -> "Yes" to show it in Artist's Picks
  //   Status    -> Available / Sold / Hidden
  sheetCsvUrl: "",

  // Frame and size options offered for every painting
  frames: ["Black", "White", "Natural Oak", "Deep Walnut"],
  sizes: ["6x9", "8x12", "10x15"], // inches

  // Listing card text
  cardFeatures: "3 Sizes • 4 Frame Finishes\nDigital Files Available", // \n = new line
  digitalPrice: 399, // ₹, flat price for the Digital Download format

  // Price (₹) for each size + frame combination — PLACEHOLDER numbers, edit these
  prices: {
    "6x9":   { "Black": 999,  "White": 999,  "Natural Oak": 1199, "Deep Walnut": 1199 },
    "8x12":  { "Black": 1499, "White": 1499, "Natural Oak": 1699, "Deep Walnut": 1699 },
    "10x15": { "Black": 1999, "White": 1999, "Natural Oak": 2299, "Deep Walnut": 2299 },
  },

  // "Details" list on every product page: [label, text]
  productDetails: [
    ["Material", "Heavyweight textured canvas stretched over solid timber (Zero glass, 100% glare-free)."],
    ["Frame Finish", "Handcrafted wooden floater casing in Black, White, Natural Oak, or Deep Walnut."],
    ["Sizes", "6 x 9 in, 8 x 12 in, 10 x 15 in (Arrives ready to hang)."],
    ["Digital Option", "Includes 300 DPI high-resolution files delivered instantly via email/WhatsApp."],
    ["Shipping", "Handcrafted to order. Free doorstep delivery across India in 7–10 business days."],
    ["Safe Transit Guarantee", "Damaged in transit? Send an unboxing video and we'll send a free replacement."],
  ],

  // Collections, in the order they appear on the site
  categories: [
    "Japandi Landscapes",
    "Botanical Artwork",
    "Birth Month Flower Collection",
    "Mindful Wall Art",
    "Ocean Collection",
  ],

  samplePaintings: [
    { title: "Desert Cactus Oasis", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/16a6-Dz1Sl0TgIiVLwCAZ6arVXcOhUViY/view", status: "Available", featured: "", description: "A solitary cactus rests against sweeping terracotta dunes. Woven canvas textures pair with rich clay and soft sage tones to bring a grounded, slow-living warmth to modern spaces." },
    { title: "Lone Tree Hillside", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/1VPk5Y04Y8Yr4esB7AOI_HUipA1SzSSIt/view", status: "Available", featured: "Yes", description: "" },
    { title: "Minimal Island Solitude", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/1ZOVr8enMmcxf66JaFtRh2OzxhJ9IkJw2/view", status: "Available", featured: "", description: "" },
    { title: "Misty Green Mountain Ridges", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/1V6qRR19uJXppfuCm5k9YpEkPHBrbeYmf/view", status: "Available", featured: "Yes", description: "" },
    { title: "Sage Green River Valley", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/10UXg-DyN3mVjhQb1p3xsBoZ3WaJ19wZa/view", status: "Available", featured: "", description: "" },
    { title: "Serene Sage Foliage", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/1UJ5-9U7fOoypPKRwgHfBuxzdae6rkq2Q/view", status: "Available", featured: "", description: "" },
    { title: "Terracotta Desert Horizon", category: "Japandi Landscapes", photo: "https://drive.google.com/file/d/1lyw6n0dJCQ4QHkdgniQIW4ziTp9oe0jb/view", status: "Available", featured: "Yes", description: "" },
  ],
};
