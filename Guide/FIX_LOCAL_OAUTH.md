# Fix Local OAuth Authentication

## 🎯 Quick Fix Guide

OAuth **does work locally** - you just need to configure Supabase correctly!

---

## Problem

When you click "Logg inn med Google/GitHub", nothing happens or you get an error because:
1. Supabase doesn't know your local URL is allowed
2. You might be opening the file with `file://` protocol (doesn't work for OAuth)

---

## Solution: 3 Steps

### Step 1: Add Redirect URLs to Supabase

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com
   - Select your project
   - Go to **Authentication** → **URL Configuration**

2. **Add Redirect URLs:**
   Click "Add URL" and add these one by one:
   - `http://localhost:8000`
   - `http://localhost:8000/index.html`
   - `http://127.0.0.1:8000`
   - `http://127.0.0.1:8000/index.html`

3. **Save Changes**

### Step 2: Start Local HTTP Server

**Don't open `index.html` directly!** Use a local server instead.

**Option A: Python (Recommended)**
```powershell
# Navigate to your project
cd C:\Users\mikae\OneDrive\Dokumenter\randon.1

# Start server
python -m http.server 8000
```

**Option B: Node.js**
```powershell
# Install http-server globally (one time)
npm install -g http-server

# Start server
http-server -p 8000
```

**Option C: VS Code Live Server**
1. Install "Live Server" extension in VS Code/Cursor
2. Right-click `index.html`
3. Select "Open with Live Server"

### Step 3: Open in Browser

Open your browser and go to:
```
http://localhost:8000
```

**NOT** `file:///C:/Users/...` (this won't work!)

---

## Test Authentication

1. **Open browser console** (F12)
2. **Check for errors:**
   - Should see: "✅ Supabase client initialized"
   - No red errors

3. **Click "Logg inn med Google":**
   - Should redirect to Google login
   - After login, redirects back to `http://localhost:8000`
   - Should authenticate successfully

4. **Check console:**
   - Should see: "✅ User authenticated: your@email.com"

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URL isn't in Supabase's allowed list.

**Fix:**
1. Check you added `http://localhost:8000` to Supabase
2. Make sure you're using `http://localhost:8000` (not `file://`)
3. Wait a minute for Supabase to update

### Error: "Supabase ikke konfigurert"

**Problem:** `config.js` not loading.

**Fix:**
1. Check `config.js` exists
2. Check browser console for errors
3. Verify `config.js` is loaded before `script.js` in HTML

### OAuth Button Does Nothing

**Problem:** JavaScript error or Supabase not initialized.

**Fix:**
1. Open browser console (F12)
2. Check for red errors
3. Verify Supabase SDK is loaded
4. Check `config.js` has correct credentials

### Redirects to Wrong URL

**Problem:** Redirect URL in code doesn't match Supabase config.

**Fix:**
The code uses:
```javascript
redirectTo: window.location.origin + window.location.pathname
```

This automatically uses your current URL. Just make sure that URL is in Supabase's allowed list.

---

## Quick Test Commands

```powershell
# 1. Start server
python -m http.server 8000

# 2. Open browser to:
# http://localhost:8000

# 3. Open console (F12) and check:
# - "✅ Supabase client initialized"
# - No errors

# 4. Click login button
# - Should redirect to OAuth provider
# - Should redirect back
# - Should authenticate
```

---

## For Production (GitHub Pages)

When you deploy to GitHub Pages, add your production URL:

1. **Get your GitHub Pages URL:**
   - `https://mikaeltalberg.github.io/EB-Okonomi`
   - Or your custom domain

2. **Add to Supabase:**
   - Go to Authentication → URL Configuration
   - Add: `https://mikaeltalberg.github.io/EB-Okonomi`
   - Add: `https://mikaeltalberg.github.io/EB-Okonomi/index.html`

3. **That's it!** OAuth will work on GitHub Pages too.

---

## Summary

✅ **OAuth works locally** - just needs:
1. Redirect URLs in Supabase dashboard
2. Local HTTP server (not file://)
3. Open `http://localhost:8000`

**Time to fix:** 5-10 minutes

---

## Still Not Working?

1. **Check browser console** for specific errors
2. **Verify Supabase credentials** in `config.js`
3. **Check Supabase dashboard** - are providers enabled?
4. **Try email magic link** instead of OAuth (simpler test)

Let me know what error you see and I'll help fix it! 🚀

