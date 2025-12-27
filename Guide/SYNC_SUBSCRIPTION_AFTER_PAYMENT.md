# Sync Subscription After Payment

## Problem

After completing a payment via Stripe Payment Links, users are redirected back to the app but their subscription status isn't immediately updated. The app shows "Betaling mottatt! Vent mens vi oppdaterer din tilgang..." but doesn't grant access.

## Solution

Created an Edge Function that immediately syncs subscription data from Stripe to Supabase when a user returns from payment.

---

## Step 1: Deploy the Edge Function

### 1.1 Create the Function in Supabase

1. Go to: **Supabase Dashboard → Edge Functions**
2. Click **"Create a new function"**
3. Name it: `sync-user-subscription`
4. Copy the code from: `supabase/functions/sync-user-subscription/index.ts`

### 1.2 Set Required Secrets

Make sure these secrets are set in **Supabase Dashboard → Settings → Edge Functions → Secrets**:

- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- ✅ `SUPABASE_URL` - Your Supabase project URL (optional, defaults to your project)

### 1.3 Deploy

1. Click **"Deploy"** on the function
2. Make sure it's set to require authentication (users must be logged in)

---

## Step 2: How It Works

### Flow:

1. **User completes payment** in Stripe Payment Link
2. **User redirected** to app with `?payment_success=true`
3. **App detects payment success** and calls `sync-user-subscription` Edge Function
4. **Edge Function:**
   - Gets user's email from session
   - Searches Stripe for customer by email
   - Finds active subscription
   - Updates `user_profiles` table in Supabase
5. **App checks subscription status** and grants access

---

## Step 3: Testing

### Test 1: Manual Sync

1. Complete a test payment in Stripe
2. Note the email used (the email you used in Stripe checkout)
3. In Supabase Dashboard → Edge Functions → `sync-user-subscription`
4. Click **"Test"**
5. Use **POST** method
6. **Set Role to "service role"** (dropdown at bottom)
7. **Remove the Authorization header:**
   - ⚠️ **Important:** When email is provided in the body, the function works in "testing mode"
   - **Delete the Authorization header** - you don't need it!
   - The function will use service role automatically when email is provided
   - If you see an Authorization header with the anon key, **remove it**
   - **Where to find service role key:**
     - Go to: Supabase Dashboard → Settings → API
     - Find the **"service_role"** key row (NOT the anon key!)
     - Look for a **"Reveal"** or **"Show"** button/icon next to the key
     - Click it to reveal the full key
     - Click the **copy icon** (📋) or **"Copy"** button to copy the full key
     - If you can't see a reveal button, try clicking directly on the key text
     - ⚠️ **Important:** Service role key has full access - keep it secret!
   - **Can't copy?** Try these:
     - Right-click on the key text → "Copy"
     - Look for a small copy icon (📋) next to the key
     - If still masked, regenerate: Settings → API → **"Regenerate service_role key"** → Copy immediately
   - Example format: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full service role key)
9. Body:
   ```json
   {
     "email": "your-email@example.com"
   }
   ```
   - Use the **exact email** you used when making the payment in Stripe
9. Click **"Send Request"**
10. Should return:
   ```json
   {
     "success": true,
     "synced": true,
     "profile": {
       "plan_status": "active",
       "subscription_end": "..."
     }
   }
   ```

### Test 2: Full Payment Flow

1. Log in to your app
2. Click "Velg abonnement"
3. Select a product
4. Complete test payment in Stripe (use test card: `4242 4242 4242 4242`)
5. Should redirect back to app
6. Should see "Betaling mottatt! Vent mens vi oppdaterer din tilgang..."
7. Within 2-3 seconds, should grant access and show app content

---

## Step 4: Troubleshooting

### Issue: "No subscription found for this email"

**Cause:** Email in Stripe doesn't match logged-in user's email

**Solution:**
- Make sure you use the same email in Stripe payment as your Supabase account
- Or manually sync by calling the function with the correct email

### Issue: "Unauthorized"

**Cause:** User not logged in when returning from payment

**Solution:**
- Make sure user is logged in before making payment
- Or add login prompt after payment redirect

### Issue: Edge Function not found

**Cause:** Function not deployed or wrong name

**Solution:**
- Verify function name is exactly: `sync-user-subscription`
- Check function is deployed in Supabase Dashboard

### Issue: Still waiting after sync

**Cause:** Database update hasn't propagated yet

**Solution:**
- The function waits 2 seconds after sync before checking
- If still not working, check browser console for errors
- Verify `plan_status` is 'active' in `user_profiles` table

---

## Step 5: Verify Database Update

Check if subscription was synced:

```sql
SELECT 
  email, 
  plan_status, 
  subscription_end, 
  stripe_customer_id,
  updated_at 
FROM user_profiles 
WHERE email = 'your-email@example.com';
```

Should show:
- `plan_status` = `'active'`
- `subscription_end` = future date
- `stripe_customer_id` = Stripe customer ID
- `updated_at` = recent timestamp

---

## Code Changes

### Frontend (`script.js`)

Updated `DOMContentLoaded` handler to:
1. Detect `payment_success=true` parameter
2. Call `sync-user-subscription` Edge Function
3. Wait for sync to complete
4. Check subscription status
5. Grant access if subscription is active

### Edge Function (`sync-user-subscription/index.ts`)

New function that:
1. Authenticates user
2. Searches Stripe for customer by email
3. Finds active subscription
4. Updates `user_profiles` table
5. Returns sync status

---

## Benefits

✅ **Immediate access** - No waiting for scheduled sync  
✅ **Real-time updates** - Subscription status updated instantly  
✅ **Better UX** - Users get access within seconds  
✅ **Reliable** - Direct Stripe API query, no dependency on FDW  

---

## Fallback

If the Edge Function fails or user isn't logged in, the app falls back to:
- Polling for subscription status (every 30 seconds, up to 6 minutes)
- This ensures access is granted even if immediate sync fails

---

**Status:** Ready to deploy! 🚀

