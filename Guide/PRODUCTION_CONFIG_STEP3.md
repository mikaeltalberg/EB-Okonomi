# Production Configuration - Step 3

## Overview

This step configures Supabase to work with your production deployment on GitHub Pages. You'll need to:
1. Add redirect URLs for authentication callbacks
2. Set the Site URL
3. Verify email provider is enabled
4. Test the configuration

---

## Step-by-Step Instructions

### Step 1: Get Your GitHub Pages URL

Your GitHub Pages URL will be:
```
https://mikaeltalberg.github.io/EB-Okonomi
```

**Note:** If your repository name is different, adjust accordingly.

---

### Step 2: Add Redirect URLs in Supabase

1. Go to Supabase Dashboard:
   - https://app.supabase.com/project/bgqsivfeglvhzkftelez/auth/url-configuration

2. Scroll down to **"Redirect URLs"** section

3. Click **"Add URL"** button

4. Add these URLs (one at a time):
   - `https://mikaeltalberg.github.io/EB-Okonomi`
   - `https://mikaeltalberg.github.io/EB-Okonomi/index.html`
   - `http://localhost:8000` (for local development)
   - `http://localhost:8000/index.html` (for local development)
   - `http://localhost:3000` (if you use port 3000)
   - `http://localhost:3000/index.html` (if you use port 3000)

5. Click **"Save"** after adding each URL

**Why multiple URLs?**
- Production URL: For GitHub Pages deployment
- Localhost URLs: For local development and testing
- With/without index.html: Some browsers handle URLs differently

---

### Step 3: Set Site URL

1. In the same **"URL Configuration"** page
2. Find **"Site URL"** field (at the top)
3. Set it to your production URL:
   ```
   https://mikaeltalberg.github.io/EB-Okonomi
   ```
4. Click **"Save"**

**What is Site URL?**
- This is the default redirect URL after authentication
- Used when no specific redirect is provided
- Should match your production deployment

---

### Step 4: Verify Email Provider is Enabled

1. Go to: https://app.supabase.com/project/bgqsivfeglvhzkftelez/auth/providers

2. Find **"Email"** in the list

3. Make sure it's **enabled** (toggle should be ON)

4. If disabled, click the toggle to enable it

5. Verify **"Confirm email"** settings:
   - For development: You can disable email confirmation
   - For production: Enable email confirmation for security

---

### Step 5: Configure Email Settings (Optional but Recommended)

1. In **"Email"** provider settings, you can configure:
   - **Email templates** - Customize the magic link email
   - **SMTP settings** - Use your own email service (optional)
   - **Rate limiting** - Prevent abuse

2. For now, default Supabase email is fine for testing

---

## Testing the Configuration

### Test 1: Local Development

1. Start your local server:
   ```powershell
   python -m http.server 8000
   ```

2. Open: `http://localhost:8000`

3. Try logging in with email

4. Check that the magic link redirects back to `http://localhost:8000`

5. Verify you can log in successfully

### Test 2: Production (After Deployment)

1. Deploy to GitHub Pages (we'll do this in Step 4)

2. Visit: `https://mikaeltalberg.github.io/EB-Okonomi`

3. Try logging in with email

4. Check that the magic link redirects back to your GitHub Pages URL

5. Verify authentication works

---

## Configuration Checklist

Before moving to deployment, verify:

- [ ] Redirect URLs added (production + localhost)
- [ ] Site URL set to production URL
- [ ] Email provider enabled
- [ ] Local development tested
- [ ] No console errors in browser

---

## Common Issues and Solutions

### Issue: "Redirect URL mismatch"

**Error:** "The redirect URL provided in the request does not match one of the authorized redirect URLs"

**Solution:**
- Make sure the exact URL is in the redirect URLs list
- Check for trailing slashes (add both with and without)
- Verify you're using the correct port for localhost

### Issue: Magic link doesn't redirect

**Error:** Link works but doesn't redirect back to your app

**Solution:**
- Check redirect URLs are added correctly
- Verify Site URL is set
- Check browser console for errors
- Make sure you're using the correct URL format

### Issue: "Email not sent"

**Error:** Magic link email doesn't arrive

**Solution:**
- Check spam folder
- Verify email provider is enabled
- Check Supabase logs for email sending errors
- Make sure your email address is valid

---

## Quick Reference

**Supabase URLs:**
- URL Configuration: https://app.supabase.com/project/bgqsivfeglvhzkftelez/auth/url-configuration
- Email Provider: https://app.supabase.com/project/bgqsivfeglvhzkftelez/auth/providers
- Project Settings: https://app.supabase.com/project/bgqsivfeglvhzkftelez/settings/general

**Your URLs:**
- Production: `https://mikaeltalberg.github.io/EB-Okonomi`
- Local (port 8000): `http://localhost:8000`
- Local (port 3000): `http://localhost:3000`

---

## Next Steps

After completing this configuration:

1. ✅ Supabase is configured for production
2. ✅ Authentication will work on GitHub Pages
3. ✅ Local development is set up
4. ✅ Ready for deployment

**Ready for Step 4?** Once configuration is complete, we can:
- Deploy to GitHub Pages
- Test production authentication
- Verify everything works end-to-end

---

**Let me know when you've completed the configuration, and we can move to deployment!** 🚀

