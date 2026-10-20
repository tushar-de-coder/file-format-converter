# Convertly — File Format Converter

A responsive static website plus a Node.js API backend. The frontend can be hosted on GitHub Pages; the API must be deployed separately (for example, Render or another Node.js host). Real conversions use the CloudConvert API.

## Project layout

- `public/index.html` — website structure
- `public/styles.css` — responsive styling
- `public/app.js` — upload and conversion UI
- `server.js` — backend endpoint
- `.env.example` — required backend environment variables

## 1. Get a conversion API key

1. Create an account at https://cloudconvert.com/
2. Create an API key in your CloudConvert dashboard.
3. Review the provider's current pricing, limits, privacy terms and supported format pairs before launching publicly.

Do not place your API key in `public/app.js`, HTML, GitHub Pages settings, or any file committed to GitHub. The key belongs only in the backend host's environment variables.

## 2. Deploy the backend

Deploy this repository (or a copy containing `server.js` and `package.json`) to a Node.js host such as Render.

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables:
  - `CLOUDCONVERT_API_KEY` = your real API key
  - `MAX_FILE_MB` = `25` (adjust to the host/provider limits)
  - `ALLOWED_ORIGIN` = your exact GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io`
- After deployment, test `https://YOUR-BACKEND-HOST/api/health`. It should return JSON like `{"ok":true,"service":"Convertly API"}`.

The host and conversion provider may have their own file size, timeout, account, and usage limits. This starter API keeps the upload in temporary storage and deletes the local temporary upload after the job finishes. CloudConvert download URLs can expire, so download the result promptly.

## 3. Connect the GitHub Pages frontend

Edit the first line of `public/app.js`:

```js
const API_BASE = "https://YOUR-BACKEND-HOST";
```

Use the backend base URL only, without `/api/convert`. Replace `YOUR-BACKEND-HOST` with the real URL given by your backend host.

## 4. Publish with GitHub Pages

1. Create a GitHub repository, e.g. `file-format-converter`.
2. Upload the contents of the `public/` folder to the repository root (so `index.html`, `styles.css`, and `app.js` are at the root). Do not upload `server.js` or your `.env`.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for the Pages deployment. GitHub displays the public website URL in Settings → Pages.

If you prefer keeping `public/` as a folder in the repository, use a GitHub Actions workflow to publish that folder; the simplest route is to upload its three files to the repository root.

## 5. Run locally

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
# Edit .env and add your CloudConvert API key
npm start
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. The API runs at `http://localhost:3000`. To test the frontend locally, use a static server or open `public/index.html`; then set `API_BASE` in `public/app.js` to `http://localhost:3000`.

## Before sharing publicly

- Set `ALLOWED_ORIGIN` to your real site origin, not `*`.
- Add a Privacy Policy describing the third-party conversion provider, processing, retention and contact details.
- Review CloudConvert's current terms and privacy practices.
- Add abuse/rate limiting, quotas, and monitoring to prevent API-key misuse and unexpected charges.
- Test format pairs with sample files; not every pair or file type is convertible.
- Consider a virus/malware scanning policy and clearly tell users not to upload sensitive files.
- For production, use authenticated or signed server-side result downloads if you need more control over retention; the direct provider URL is temporary.
- Never commit `.env` or API keys.

## Troubleshooting

- **“Conversion service is not configured”**: set `CLOUDCONVERT_API_KEY` in the backend host and redeploy.
- **CORS error**: set `ALLOWED_ORIGIN` to the exact origin of the GitHub Pages site. Project pages normally use `https://USERNAME.github.io`; custom domains use their own origin.
- **404 on API**: make sure `API_BASE` matches the backend URL and the backend is deployed.
- **Unsupported conversion**: choose a format pair supported by the conversion provider. Extension alone does not guarantee the file content is valid.
