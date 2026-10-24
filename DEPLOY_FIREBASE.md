# Firebase Hosting Guide for Ventures Watches

Your project is now fully configured for **Firebase Hosting** and **Firebase App Hosting**.

---

## 📁 Configuration Files Added

1. **`firebase.json`**:
   - Defines the public build folder (`dist`).
   - Configures SPA rewrites (`"source": "**", "destination": "/index.html"`) so that client-side routing works on refresh.
   - Sets HTTP cache headers (immutable long-term caching for assets, immediate revalidation for `index.html`).
   - Configures Cloud Firestore rules and index mapping.

2. **`.firebaserc`**:
   - Pre-configured with your Firebase project ID (`shaped-upgrade-32t1j`).

3. **`apphosting.yaml`**:
   - Configured for Next-Gen Firebase App Hosting (full-stack SSR / Node.js Express server).

4. **`package.json` Scripts**:
   - `npm run deploy:hosting` : Builds production bundle and deploys to Firebase Hosting.
   - `npm run deploy:rules`   : Deploys Firestore security rules.
   - `npm run deploy:firebase`: Builds and deploys both Hosting and Firestore.

---

## 🚀 How to Deploy

### Option 1: Quick Deployment via Firebase CLI

Run this in your terminal:
```bash
# 1. Log in to your Firebase account (first time only)
npx firebase login

# 2. Build and deploy to Firebase Hosting
npm run deploy:hosting
```

Once deployment completes, your site will be live at:
- `https://shaped-upgrade-32t1j.web.app`
- `https://shaped-upgrade-32t1j.firebaseapp.com`

---

## 🌐 Connecting a Custom Domain (e.g. `ventureswatches.com`)

1. Open the [Firebase Console](https://console.firebase.google.com/project/shaped-upgrade-32t1j/hosting/sites).
2. Go to **Build > Hosting**.
3. Click **Add custom domain**.
4. Enter your domain (e.g., `ventureswatches.com` or `www.ventureswatches.com`).
5. Copy the DNS TXT / A records provided by Firebase and add them in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.).
6. Firebase automatically provisions and renews a free **SSL certificate (HTTPS)**.
