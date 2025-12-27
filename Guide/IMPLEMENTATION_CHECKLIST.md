# Implementation Checklist
## Quick Reference for Setting Up Subscription System

---

## ✅ **Phase 1: Database Setup (Supabase)**

### Step 1.1: Create user_profiles table
- [ ] Open Supabase SQL Editor
- [ ] Run `setup_user_profiles.sql` (or create table from plan)
- [ ] Verify table exists: `SELECT * FROM user_profiles LIMIT 1;`

### Step 1.2: Create license_users table
- [ ] Run `supabase/setup_license_users.sql`
- [ ] Verify table exists

### Step 1.3: Test Stripe FDW connection
- [ ] Run test query: `SELECT * FROM stripe_fdw.customers LIMIT 1;`
- [ ] Verify you can see subscription data

### Step 1.4: Test sync query manually
- [ ] Run `supabase/sync_stripe_subscriptions.sql` manually
- [ ] Check if data appears in `user_profiles` table
- [ ] Verify `plan_status` is set correctly

### Step 1.5: Set up scheduled task
- [ ] Go to Supabase Dashboard → Database → Scheduled Tasks
- [ ] Create new task: `sync_stripe_subscriptions`
- [ ] Schedule: `*/5 * * * *` (every 5 minutes)
- [ ] Paste sync query from `sync_stripe_subscriptions.sql`
- [ ] Save and verify it runs

---

## ✅ **Phase 2: Stripe Configuration**

### Step 2.1: Create Payment Links
- [ ] Go to Stripe Dashboard → Products
- [ ] For each product, click "Create payment link"
- [ ] Set redirect URL: `https://your-domain.com/?payment_success=true`
- [ ] Require email and name in customer information
- [ ] Copy Payment Link URLs

### Step 2.2: Update config.js
- [ ] Add `STRIPE_PRODUCTS` array to `config.js`
- [ ] Add your product IDs and Payment Link URLs
- [ ] Test that products array is accessible

---

## ✅ **Phase 3: Frontend Updates**

### Step 3.1: Add product selection UI
- [ ] Add product selection modal to `index.html`
- [ ] Add CSS for product cards (from plan)
- [ ] Test that modal shows/hides correctly

### Step 3.2: Update JavaScript
- [ ] Add `showProductSelection()` function
- [ ] Add `selectProduct()` function (redirects to Payment Link)
- [ ] Update signup flow to show product selection
- [ ] Update "Subscribe now" button to show product selection

### Step 3.3: Update subscription check
- [ ] Verify `checkAuthAndSubscription()` checks `plan_status`
- [ ] Add email fallback check (for users not yet signed up)
- [ ] Add license user check (if using license management)

### Step 3.4: Handle payment return
- [ ] Add check for `?payment_success=true` in URL
- [ ] Add polling mechanism to check for subscription
- [ ] Show success message or auto-hide paywall

### Step 3.5: Add user settings (optional)
- [ ] Add settings button to UI
- [ ] Add settings modal HTML
- [ ] Add functions: `showSettingsModal()`, `loadLicenseUsers()`, etc.
- [ ] Test license user management

---

## ✅ **Phase 4: Testing**

### Step 4.1: Test sync
- [ ] Create test subscription in Stripe
- [ ] Wait 5 minutes (or trigger sync manually)
- [ ] Verify data appears in `user_profiles` table
- [ ] Check that `plan_status` is 'active'

### Step 4.2: Test user journey
- [ ] Open app → Should show login
- [ ] Click "Sign up" → Should show product selection
- [ ] Click "Choose" on product → Should redirect to Stripe
- [ ] Complete test payment (use test card: `4242 4242 4242 4242`)
- [ ] Return to app → Should show "Payment successful" or poll
- [ ] Wait for sync → Paywall should disappear

### Step 4.3: Test subscription check
- [ ] Log in with active subscription email
- [ ] Verify paywall is hidden
- [ ] Verify user settings button appears

### Step 4.4: Test license management (if implemented)
- [ ] Add license user email
- [ ] Log in with that email
- [ ] Verify access is granted
- [ ] Test removing license user

---

## ✅ **Phase 5: Production Deployment**

### Step 5.1: Switch to live mode
- [ ] Update Stripe Payment Links to use live mode
- [ ] Update `config.js` with live Payment Links
- [ ] Test with real payment (small amount)

### Step 5.2: Monitor sync
- [ ] Check scheduled task is running
- [ ] Monitor `user_profiles` table updates
- [ ] Set up alerts if sync fails (optional)

### Step 5.3: User communication
- [ ] Add helpful messages for payment processing
- [ ] Add support contact information
- [ ] Document user flow

---

## 🐛 **Troubleshooting**

### Sync not working?
- [ ] Check Stripe FDW is accessible
- [ ] Verify scheduled task is enabled
- [ ] Check task logs for errors
- [ ] Test sync query manually

### Payment not syncing?
- [ ] Verify Payment Link redirect URL is correct
- [ ] Check that email in Stripe matches Supabase email
- [ ] Wait 5 minutes for sync (or trigger manually)
- [ ] Check `user_profiles` table for the email

### Paywall not hiding?
- [ ] Check `plan_status` is 'active' in database
- [ ] Verify `subscription_end` is in the future
- [ ] Check browser console for errors
- [ ] Verify RLS policies allow user to read their profile

---

## 📝 **Quick Commands**

### Check subscription status:
```sql
SELECT email, plan_status, subscription_end, updated_at 
FROM user_profiles 
ORDER BY updated_at DESC;
```

### Manually trigger sync:
```sql
-- Run sync_stripe_subscriptions.sql
```

### Check license users:
```sql
SELECT * FROM license_users WHERE is_active = true;
```

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete
