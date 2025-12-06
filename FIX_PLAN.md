# Project Fix Plan

## 🔍 Issues Found

### 1. Security Check ✅/⚠️

**Good:**
- ✅ `config.js` is in `.gitignore` (won't be committed)
- ✅ Anon key in `config.js` is correct format (starts with `eyJ`)

**Issues:**
- ⚠️ `supabase_client.py` contains a secret key (`sb_secret_...`) - should be removed or use env vars
- ⚠️ Need to verify no secrets are tracked by git

### 2. Missing Pieces

**Found:**
- ⚠️ OAuth callback handler is incomplete - doesn't properly exchange tokens
- ⚠️ Redirect URL mismatch (you're getting `localhost:3000` but probably running on `8000`)
- ⚠️ Magic link redirect not properly handling the session from URL hash

### 3. Google/GitHub Login

**Current:** Both buttons visible in HTML
**Need:** Hide them, keep only email login

---

## 📋 Fix Plan

### Phase 1: Security Cleanup

1. **Check git status** - verify `config.js` is not tracked
2. **Fix `supabase_client.py`** - remove hardcoded secret key
3. **Update `.gitignore`** - ensure all sensitive files are ignored

### Phase 2: Disable Google/GitHub Login

1. **Hide buttons in `index.html`** - comment out or remove Google/GitHub buttons
2. **Keep email login** - only show email button

### Phase 3: Fix Magic Link Redirect

**The Problem:**
- Magic link redirects to `localhost:3000` but you're running on `8000`
- The callback handler doesn't properly extract session from URL hash
- Supabase client needs explicit instruction to get session from hash

**The Solution:**
1. **Fix redirect URL** - ensure it uses current origin
2. **Improve callback handler** - properly extract tokens from hash
3. **Set session explicitly** - tell Supabase to use the hash tokens
4. **Add redirect URL to Supabase** - add `localhost:3000` OR change to use `8000`

### Phase 4: Testing

1. Test email login flow
2. Verify session is created
3. Verify paywall hides after login
4. Check browser console for errors

---

## 🔧 Detailed Changes

### Change 1: Security - Fix supabase_client.py
- Remove hardcoded secret key
- Use environment variables or remove file (not needed for client-side)

### Change 2: HTML - Hide Google/GitHub Buttons
```html
<!-- Comment out or remove these buttons -->
<!-- <button onclick="signInWithGoogle()">...</button> -->
<!-- <button onclick="signInWithGitHub()">...</button> -->
```

### Change 3: JavaScript - Fix Magic Link Callback
**Current code (line 229-237):**
```javascript
const hashParams = new URLSearchParams(window.location.hash.substring(1));
if (hashParams.get('access_token')) {
    setTimeout(() => {
        checkAuthAndSubscription();
    }, 500);
}
```

**Problem:** This doesn't properly set the session. Supabase needs to extract the session from the hash.

**Fix:** Use Supabase's built-in session recovery from hash:
```javascript
// Check for OAuth callback
const hashParams = new URLSearchParams(window.location.hash.substring(1));
if (hashParams.get('access_token') || hashParams.get('type') === 'magiclink') {
    // Supabase will automatically handle the hash and set the session
    // But we need to wait for it to process
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session) {
        // Clear the hash from URL
        window.location.hash = '';
        // Check auth status
        await checkAuthAndSubscription();
    }
} else {
    // Normal page load
    await checkAuthAndSubscription();
}
```

### Change 4: Fix Redirect URL Mismatch

**Issue:** You're getting redirected to `localhost:3000` but running on `8000`

**Options:**
- **Option A:** Add `localhost:3000` to Supabase redirect URLs
- **Option B:** Change your server to run on port 3000
- **Option C:** Fix the redirect URL in code to always use current origin

**Recommendation:** Option C - use current origin dynamically (already in code, but need to verify Supabase config)

---

## 🎯 Implementation Order

1. ✅ **Security cleanup** (5 min)
2. ✅ **Disable Google/GitHub** (2 min)
3. ✅ **Fix magic link callback** (10 min)
4. ✅ **Test** (5 min)

**Total time:** ~20 minutes

---

## ⚠️ Important Notes

1. **Redirect URL:** The magic link redirects to `localhost:3000` - you need to either:
   - Add `http://localhost:3000` to Supabase redirect URLs, OR
   - Make sure you're running your server on port 3000

2. **Session Handling:** The current callback handler is too simple - it needs to properly wait for Supabase to process the hash

3. **Testing:** After fixes, test the full flow:
   - Click email login
   - Check email
   - Click magic link
   - Should redirect back and be logged in

---

## ✅ Ready to Proceed?

This plan will:
- ✅ Secure your secrets
- ✅ Disable unused login methods
- ✅ Fix magic link authentication
- ✅ Get you logged in successfully

**Should I proceed with these changes?**

