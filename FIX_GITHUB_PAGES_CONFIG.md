# Fix GitHub Pages - Missing config.js

## 🔍 The Problem

Your GitHub Pages site is live at: https://mikaeltalberg.github.io/EB-Okonomi

But you're seeing: **"Supabase ikke konfigurert. Sjekk config.js"**

**Why?** `config.js` is in `.gitignore`, so it wasn't deployed to GitHub Pages!

---

## ✅ The Solution

**Good news:** The Supabase **anon key is safe to expose** in client-side code! That's exactly what it's designed for.

Security comes from **Row Level Security (RLS) policies**, not from hiding the key.

### Option 1: Deploy config.js (Recommended for GitHub Pages)

Since anon keys are meant to be public, we can safely include `config.js` in the repository.

#### Step 1: Remove config.js from .gitignore

Edit `.gitignore` and remove or comment out the `config.js` line:

```gitignore
# Config - keep your actual credentials private
# config.js  <-- Comment this out or remove it
```

#### Step 2: Add config.js to git

```powershell
git add config.js
git commit -m "Add config.js for GitHub Pages deployment"
git push origin master
```

#### Step 3: Wait for GitHub Pages to update

- GitHub Pages will automatically redeploy
- Wait 1-2 minutes
- Refresh your site

### Option 2: Create config.js on GitHub (Alternative)

If you prefer not to change `.gitignore`:

1. Go to your repository on GitHub
2. Click "Add file" → "Create new file"
3. Name it: `config.js`
4. Copy the content from your local `config.js`
5. Commit directly to `master` branch

---

## 🔐 Security Note

**Is it safe to commit the anon key?**

✅ **YES!** The anon key is:
- Designed for client-side use
- Public by nature (anyone can see it in browser)
- Protected by RLS policies in Supabase
- Not a secret - it's a public identifier

**What's NOT safe:**
- ❌ Service role keys (these should NEVER be exposed)
- ❌ Database passwords
- ❌ API secrets

**Your anon key is safe to commit!** 🎯

---

## 🚀 Quick Fix Steps

### Method 1: Remove from .gitignore (Easiest)

```powershell
# 1. Edit .gitignore - remove or comment out config.js line
# 2. Add config.js to git
git add config.js

# 3. Commit
git commit -m "Add config.js for GitHub Pages (anon key is safe to expose)"

# 4. Push
git push origin master

# 5. Wait 1-2 minutes, then refresh your site
```

### Method 2: Create on GitHub

1. Go to: https://github.com/mikaeltalberg/EB-Okonomi
2. Click "Add file" → "Create new file"
3. Name: `config.js`
4. Paste your config.js content
5. Commit to `master` branch
6. Wait for Pages to redeploy

---

## 📋 What Your config.js Should Look Like

```javascript
const SUPABASE_CONFIG = {
    url: "https://bgqsivfeglvhzkftelez.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Your anon key
};
```

Make sure it matches your local `config.js`.

---

## ✅ After Fixing

Once `config.js` is deployed:

1. **Refresh your site:** https://mikaeltalberg.github.io/EB-Okonomi
2. **Check browser console** (F12) - should see: "✅ Supabase client initialized"
3. **Test login** - should work now!

---

## 🎯 Summary

- ✅ Your site IS deployed (good!)
- ❌ `config.js` is missing (because of .gitignore)
- ✅ Anon key is safe to expose
- 🔧 Solution: Add `config.js` to repository

**Quick fix:** Remove `config.js` from `.gitignore`, commit it, and push!

