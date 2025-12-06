# Fix: "Forbidden use of secret API key in browser"

## 🚨 The Problem

**Error Message:** "Feil ved innlogging: Forbidden use of secret API key in browser"

**What this means:**
- You're using a **secret/service_role key** in your `config.js`
- Secret keys are **NEVER** allowed in browser/client-side code
- They have admin privileges and can bypass security
- Supabase blocks this for security reasons

## 🔍 How to Identify the Problem

### Wrong Key (Secret Key):
```javascript
anonKey: "sb_secret_tkgSK3FpKVekrvTXZS_dmw_041JnYBV"
//      ^^^^^^^^^^ Starts with "sb_secret_" = WRONG!
```

### Correct Key (Anon Key):
```javascript
anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//      ^^^ Starts with "eyJ" = JWT token = CORRECT!
```

## ✅ The Solution

### Step 1: Get Your Correct Anon Key

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com
   - Select your project
   - Go to **Settings** → **API**

2. **Find the "anon public" key:**
   - Look for **"Project API keys"** section
   - Find **"anon"** or **"public"** key
   - It should start with `eyJ` (a JWT token)
   - It's usually very long (200+ characters)

3. **Copy the anon key** (NOT the service_role key!)

### Step 2: Update config.js

Replace the secret key with the anon key:

```javascript
const SUPABASE_CONFIG = {
    url: "https://bgqsivfeglvhzkftelez.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Your anon key here
};
```

### Step 3: Verify

- Anon key starts with `eyJ` ✅
- Anon key is long (200+ characters) ✅
- NOT the service_role key ❌
- NOT anything starting with `sb_secret_` ❌

## 🔐 Key Types Explained

### Anon Key (Public Key) ✅
- **Use:** Client-side code (browser)
- **Starts with:** `eyJ` (JWT token)
- **Length:** ~200+ characters
- **Permissions:** Limited by Row Level Security (RLS)
- **Safe to expose:** Yes (in client-side code)

### Service Role Key (Secret Key) ❌
- **Use:** Server-side only (backend)
- **Starts with:** `sb_secret_` or `eyJ` but marked as secret
- **Permissions:** Full admin access
- **Bypasses RLS:** Yes
- **Safe to expose:** NO! Never in client-side code

## 🎯 Quick Fix Steps

1. Open Supabase Dashboard → Settings → API
2. Copy the **"anon public"** key (starts with `eyJ`)
3. Open `config.js`
4. Replace the `anonKey` value with the anon key
5. Save the file
6. Refresh your browser
7. Try login again

## ⚠️ Security Warning

**NEVER:**
- ❌ Put service_role key in client-side code
- ❌ Commit secret keys to git
- ❌ Share secret keys publicly

**ALWAYS:**
- ✅ Use anon key in browser
- ✅ Keep secret keys on server only
- ✅ Use environment variables for secrets

## 🧪 Test After Fix

1. Refresh browser (`http://localhost:8000`)
2. Open browser console (F12)
3. Should see: "✅ Supabase client initialized"
4. Click "Logg inn med Google"
5. Should work without the error!

## 📝 Example of Correct config.js

```javascript
const SUPABASE_CONFIG = {
    url: "https://bgqsivfeglvhzkftelez.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncXNpdmZlZ2x2aHprZnRlbGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAxNTU3NTk5OX0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
};
```

Notice:
- Starts with `eyJ` ✅
- Very long ✅
- From "anon" key in Supabase ✅

---

**Fix this and your authentication will work!** 🚀

