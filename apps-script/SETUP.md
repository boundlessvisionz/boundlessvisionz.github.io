# Order Sheet setup (one time, ~10 minutes)

This connects the website to a Google Sheet. After this, every order:
- gets an order ID like **BV-26102814-7K3Q**
- is added as a row in the Sheet
- sends the buyer a confirmation email (with a copy to you)

> ⚠️ Do every step while logged in to Google as **boundlessvisionz1510@gmail.com**.
> Emails are sent from whichever account sets this up.

---

## 1. Create the Sheet
1. Go to **sheets.google.com** → **Blank spreadsheet**.
2. Name it (top-left) **BoundlessVisionz Orders**.

## 2. Add the script
1. In the Sheet menu: **Extensions → Apps Script**. A new tab opens.
2. Delete everything in the editor (the `function myFunction() {}` text).
3. Copy **everything** from `Code.gs` (in this folder on GitHub) and paste it in.
4. Click the 💾 **Save** icon.

## 3. Give permission (one time)
1. In the toolbar, choose **setup** in the function dropdown (next to "Debug"), then click **▶ Run**.
2. A box says *"Authorization required"* → **Review permissions** → choose **boundlessvisionz1510@gmail.com**.
3. Google warns *"Google hasn't verified this app"*. This is normal for your own script:
   click **Advanced** → **Go to (unsafe)** → **Allow**.
4. Go back to the Sheet tab: a new **Orders** tab with column headings has appeared. ✅

## 4. Publish it for the website
1. Back in Apps Script, top-right: **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Fill in:
   - Description: `Website orders`
   - Execute as: **Me (boundlessvisionz1510@gmail.com)**
   - Who has access: **Anyone**
4. Click **Deploy** (if asked, allow access again).
5. Copy the **Web app URL**. It looks like
   `https://script.google.com/macros/s/AKfycb.../exec`
6. **Send that URL to Siddhant.** That's it!

---

## Using the Sheet
- New orders arrive with **Status = Pending**.
- After you receive payment, change Status to **Paid**; after sending the files, **Sent**.
- Use **Notes** for anything (e.g. the UTR number).
- Don't rename the **Orders** tab or reorder its columns.

## If you change the script later
Edits only go live after **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The web app URL stays the same.
