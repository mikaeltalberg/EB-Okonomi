# Stripe Integration Setup Checklist

## 📋 Complete Setup Guide

### Step 1: Stripe Account Setup

- [ ] Create Stripe account at https://stripe.com
- [ ] Get your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
- [ ] Get your **Secret Key** (starts with `sk_test_` or `sk_live_`)
- [ ] Create a **Product** in Stripe Dashboard
- [ ] Create a **Price** for that product
- [ ] Copy the **Price ID** (starts with `price_...`)

**Where to find:**
- Dashboard → Developers → API keys (for keys)
- Dashboard → Products → Create product → Add price

---

### Step 2: Supabase Edge Functions Setup

#### Option A: Using Supabase CLI (Recommended)

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref bgqsivfeglvhzkftelez`
- [ ] Create functions:
  ```bash
  supabase functions new stripe-webhook
  supabase functions new create-checkout-session
  ```
- [ ] Copy code from `supabase/functions/stripe-webhook/index.ts`
- [ ] Copy code from `supabase/functions/create-checkout-session/index.ts`
- [ ] Deploy functions:
  ```bash
  supabase functions deploy stripe-webhook --no-verify-jwt
  supabase functions deploy create-checkout-session
  ```

#### Option B: Using Supabase Dashboard

- [ ] Go to: https://supabase.com/dashboard/project/bgqsivfeglvhzkftelez/functions
- [ ] Create function: `stripe-webhook`
- [ ] Paste code from `supabase/functions/stripe-webhook/index.ts`
- [ ] Create function: `create-checkout-session`
- [ ] Paste code from `supabase/functions/create-checkout-session/index.ts`
- [ ] Deploy both functions
- [ ] Set `stripe-webhook` to allow unauthenticated requests (for webhooks)

---

### Step 3: Set Supabase Secrets

Go to: Supabase Dashboard → Settings → Edge Functions → Secrets

Add these secrets:

- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (from Stripe)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Stripe webhook, see Step 4)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase Settings → API)
- [ ] `SUPABASE_URL` = `https://bgqsivfeglvhzkftelez.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = (from Supabase Settings → API, for create-checkout-session)
- [ ] `STRIPE_PRICE_ID` = `price_...` (optional, can pass in request)

**Or using CLI:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SUPABASE_URL=https://bgqsivfeglvhzkftelez.supabase.co
supabase secrets set SUPABASE_ANON_KEY=...
```

---

### Step 4: Configure Stripe Webhook

- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/stripe-webhook`
- [ ] Select events to listen to:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Click "Add endpoint"
- [ ] Copy the **Signing secret** (starts with `whsec_`)
- [ ] Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

### Step 5: Update Frontend Code

- [ ] Update `goToSubscription()` function in `script.js` (already done ✅)
- [ ] Replace `'price_...'` with your actual Stripe Price ID
- [ ] Add Stripe.js to `index.html` (if using client-side Stripe)
- [ ] Test the checkout flow

**Update script.js line with your Price ID:**
```javascript
priceId: 'price_...' // Replace with your actual Stripe price ID
```

---

### Step 6: Database Setup

- [ ] Run `setup_user_profiles.sql` in Supabase SQL Editor (if not done)
- [ ] Verify `user_profiles` table exists
- [ ] Verify RLS policies are set up

---

### Step 7: Testing

#### Test Mode (Recommended First)

- [ ] Use Stripe test mode
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Any future expiry date
- [ ] Any 3-digit CVC
- [ ] Complete checkout
- [ ] Verify webhook is received (check Stripe Dashboard → Webhooks)
- [ ] Verify database is updated (check Supabase Table Editor)
- [ ] Refresh app → paywall should disappear!

#### Test Webhook Locally (Optional)

- [ ] Install Stripe CLI: `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`
- [ ] Test webhook events

---

### Step 8: Production Setup

- [ ] Switch Stripe to live mode
- [ ] Update secrets with live keys
- [ ] Update webhook endpoint URL (if different)
- [ ] Test with real payment (small amount)
- [ ] Monitor webhook logs

---

## 🔍 Troubleshooting

### Webhook Not Received

- [ ] Check webhook endpoint URL is correct
- [ ] Check webhook is enabled in Stripe
- [ ] Check Supabase function is deployed
- [ ] Check function logs in Supabase Dashboard
- [ ] Verify webhook secret matches

### Database Not Updating

- [ ] Check function logs for errors
- [ ] Verify `user_profiles` table exists
- [ ] Verify RLS policies allow updates
- [ ] Check `user_id` is in session metadata
- [ ] Verify service role key is correct

### Checkout Not Working

- [ ] Check user is authenticated
- [ ] Verify Edge Function is deployed
- [ ] Check function logs
- [ ] Verify Price ID is correct
- [ ] Check CORS settings (if needed)

---

## 📝 Quick Reference

**Your Stripe Keys:**
- Publishable Key: `pk_test_...` (for frontend, if needed)
- Secret Key: `sk_test_...` (for Edge Functions)
- Price ID: `price_...` (for checkout)

**Your Supabase:**
- Project URL: `https://bgqsivfeglvhzkftelez.supabase.co`
- Webhook URL: `https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/stripe-webhook`
- Checkout URL: `https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/create-checkout-session`

**Test Card:**
- Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

---

## ✅ When Everything Works

1. User clicks "Abonner nå"
2. Redirected to Stripe Checkout
3. Completes payment
4. Stripe sends webhook to Edge Function
5. Edge Function updates `user_profiles.subscription_status = 'active'`
6. User redirected back to app
7. Paywall disappears! 🎉

---

**Need help with any step? Let me know!** 🚀

