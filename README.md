# BoundlessVisionz website

Live at **https://boundlessvisionz.github.io**

## Adding or editing paintings

All paintings are in **`paintings.json`**. To edit it on github.com:

1. Open `paintings.json` and tap the ✏️ (pencil) icon.
2. Make your change.
3. Tap **Commit changes** → **Commit changes**.
4. The site updates in a few minutes (refresh the page to see it).

Each painting looks like this:

```json
{
  "title": "Desert Cactus Oasis",
  "collection": "Japandi Landscapes",
  "photo": "https://drive.google.com/file/d/XXXXXXXX/view",
  "status": "Available",
  "featured": false,
  "description": "A solitary cactus rests against sweeping terracotta dunes. ..."
}
```

| Field | What to put |
|---|---|
| `title` | Painting name. Also used for its web link, so avoid renaming once shared. |
| `collection` | Must match a collection name exactly: Japandi Landscapes, Botanical Artwork, Birth Month Flower Collection, Mindful Wall Art, Ocean Collection |
| `photo` | Google Drive share link of the image (folder must be "Anyone with the link → Viewer") |
| `status` | `Available`, `Sold` (shows a Sold badge) or `Hidden` (removed from the site) |
| `featured` | `true` to show in Artist's Picks, otherwise `false` |
| `description` | 2 sentences shown under the title on the painting's page. Leave `""` for none. |

### Optional: different sizes for one painting
By default every painting is offered in **6x9, 8x12 and 10x15** (prices from `config.js`).
To offer other sizes for one painting, add `"sizes"`. For a size that isn't in the normal
price list, also add its `"prices"` (one price per frame):

```json
{
  "title": "Misty Green Mountain Ridges",
  ...
  "sizes": ["8x12", "12x18"],
  "prices": {
    "12x18": { "Black": 2799, "White": 2799, "Natural Oak": 3199, "Deep Walnut": 3199 }
  }
}
```

- Write sizes like `"12x18"` (width x height in inches).
- A size with no price anywhere is hidden automatically.
- Leave `"sizes"` out to use the default three.

### To add a new painting
Copy an existing `{ ... }` block, paste it after another one, and change the values.

### Common mistakes (the site will show a red warning if the file is broken)
- Every block **except the last one** must end with a comma: `},`
- Every line inside a block **except the last one** must end with a comma.
- Text must be inside straight double quotes `"like this"`. To use a quote inside a description, write `\"`.
- `true` / `false` have **no** quotes.

If something breaks, open the file's **History** on GitHub to see or undo the last change.

## Other settings
Brand text, prices, frames, sizes, contact and payment details are in **`config.js`**.
