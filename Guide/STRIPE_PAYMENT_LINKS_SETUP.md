# Stripe Payment Links Setup Guide

## Overview

This guide will help you set up Stripe Payment Links for your subscription system. Payment Links are the simplest way to accept payments - no code required on Stripe's side!

---

## Step 1: Create Products in Stripe

### 1.1 Go to Stripe Dashboard

1. Go to: https://dashboard.stripe.com
2. Sign in to your Stripe account
3. Make sure you're in **Test mode** (toggle in top right) for testing

### 1.2 Create Your First Product

1. Click **"Products"** in the left sidebar
2. Click **"+ Add product"** button
3. Fill in:
   - **Name:** e.g., "Årlig abonnement" or "Månedlig abonnement"
   - **Description:** e.g., "Full tilgang til EB Økonomi appen"
   - **Pricing:**
     - **Price:** Enter amount (e.g., 10000 for 10,000 kr)
     - **Billing period:** Choose "One time" or "Recurring"
     - If recurring: Choose "Monthly" or "Yearly"
   - **Currency:** NOK (Norwegian Krone)
4. Click **"Save product"**

### 1.3 Create Additional Products (Optional)

Repeat Step 1.2 for each subscription tier you want to offer:
- Monthly subscription
- Yearly subscription
- Different price tiers

---

## Step 2: Create Payment Links

### 2.1 Create Payment Link for Each Product

1. In Stripe Dashboard, go to **"Products"**
2. Find your product and click on it
3. Scroll down to **"Payment links"** section
4. Click **"Create payment link"**

### 2.2 Configure Payment Link

**Important Settings:**

1. **Product/Price:** Already selected (the product you're creating link for)

2. **Customer information:**
   - ✅ **Require email** (checked)
   - ✅ **Require name** (optional but recommended)

3. **After payment:**
   - **Redirect to:** 
     ```
     https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true
     ```
   - This is where users return after payment

4. **Other settings:**
   - **Allow promotional codes:** (optional)
   - **Collect shipping address:** (unchecked - not needed for digital subscriptions)

5. Click **"Create link"**

### 2.3 Copy Payment Link URL

After creating the link, you'll see:
- **Payment link URL:** `https://buy.stripe.com/xxxxxxxxxxxxx`
- **Copy this URL** - you'll need it for `config.js`

### 2.4 Repeat for All Products

Create a payment link for each product you want to offer.

---

## Step 3: Update config.js

### 3.1 Open config.js

Edit `config.js` and update the `STRIPE_PRODUCTS` array:

```javascript
const STRIPE_PRODUCTS = [
    {
        id: 'prod_XXXXXXXXXXXXX',           // Your Stripe Product ID (from product page)
        name: 'Årlig abonnement',            // Display name
        price: '10 000 kr',                  // Display price (what users see)
        description: 'Full tilgang til appen i ett år',  // Product description
        paymentLink: 'https://buy.stripe.com/XXXXXXXXXXXXX',  // Your Payment Link URL
        interval: 'year'                     // 'year' or 'month'
    },
    {
        id: 'prod_YYYYYYYYYYYYY',
        name: 'Månedlig abonnement',
        price: '1 000 kr',
        description: 'Full tilgang til appen per måned',
        paymentLink: 'https://buy.stripe.com/YYYYYYYYYYYYY',
        interval: 'month'
    }
];
```

### 3.2 Replace Placeholder Values

**For each product:**
1. **id:** Get from Stripe product page (starts with `prod_`)
2. **name:** What you want to display (can be different from Stripe product name)
3. **price:** Display price (format: "10 000 kr")
4. **description:** What users see in the product card
5. **paymentLink:** The Payment Link URL you copied (starts with `https://buy.stripe.com/`)
6. **interval:** 'year' or 'month' (for reference)

---

## Step 4: Set Up Payment Return Handling

### 4.1 How It Works

When a user completes payment:
1. Stripe redirects to: `https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true`
2. Your app detects `payment_success=true` in URL
3. App polls Supabase for subscription status
4. Once subscription is active, paywall is removed

### 4.2 Sync Payment to Supabase

**Option A: Manual Sync (For Testing)**

After payment, you can manually update the user profile in Supabase:
1. Go to Supabase Dashboard → Table Editor → `user_profiles`
2. Find user by email
3. Update:
   - `plan_status` = 'active'
   - `subscription_end` = (one year from now, or one month if monthly)

**Option B: Automatic Sync (Recommended for Production)**

Set up Stripe webhook to automatically update Supabase when payment is received. See `Guide/STRIPE_SUPABASE_INTEGRATION.md` for details.

---

## Step 5: Test the Flow

### 5.1 Test Locally

1. Start your local server:
   ```powershell
   python -m http.server 8000
   ```

2. Open: `http://localhost:8000`

3. Test the flow:
   - Click "Velg abonnement"
   - Product selection modal should appear
   - Click "Velg" on a product
   - Should redirect to Stripe Payment Link

### 5.2 Test Payment (Test Mode)

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any ZIP code
5. Complete payment
6. Should redirect back to your app
7. Check if subscription status updates

### 5.3 Verify in Supabase

1. Go to Supabase Dashboard → Table Editor → `user_profiles`
2. Find your test user
3. Verify:
   - `plan_status` = 'active'
   - `subscription_end` is set
   - Email matches test user

---

## Step 6: Production Setup

### 6.1 Switch to Live Mode

1. In Stripe Dashboard, toggle **"Test mode"** to **"Live mode"**
2. Create products in live mode (or copy from test)
3. Create new Payment Links in live mode
4. Update `config.js` with live Payment Links

### 6.2 Update Redirect URLs

Make sure Payment Links redirect to your production URL:
```
https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true
```

### 6.3 Test with Real Payment

1. Use a real payment method (small amount)
2. Verify payment processes
3. Check subscription activates
4. Verify user can access app

---

## Troubleshooting

### Issue: "Ingen produkter konfigurert"

**Solution:**
- Make sure `STRIPE_PRODUCTS` is defined in `config.js`
- Check that the array is not empty
- Verify `config.js` is loaded before `script.js`

### Issue: Payment Link Not Working

**Solutions:**
- Verify Payment Link URL is correct
- Check that link is active in Stripe Dashboard
- Make sure you're using the correct mode (test vs live)

### Issue: Payment Completes But Subscription Not Active

**Solutions:**
- Check Supabase `user_profiles` table
- Verify user email matches Stripe customer email
- Check if sync task is running (if using automatic sync)
- Manually update profile for testing

### Issue: Redirect Not Working

**Solutions:**
- Verify redirect URL in Payment Link settings
- Check URL format (should include `?payment_success=true`)
- Make sure URL matches your actual domain

---

## Quick Reference

### Stripe Dashboard Links

- **Products:** https://dashboard.stripe.com/products
- **Payment Links:** https://dashboard.stripe.com/payment-links
- **Test Cards:** https://stripe.com/docs/testing
- **Webhooks:** https://dashboard.stripe.com/webhooks

### Your URLs

- **Production:** `https://mikaeltalberg.github.io/EB-Okonomi`
- **Redirect URL:** `https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true`
- **Local Testing:** `http://localhost:8000/?payment_success=true`

---

## Next Steps

After setting up Payment Links:

1. ✅ Products created in Stripe
2. ✅ Payment Links created
3. ✅ `config.js` updated with Payment Links
4. ✅ Test payment flow
5. ⚠️ Set up automatic sync (webhook) for production
6. ⚠️ Switch to live mode when ready

**See also:**
- `Guide/STRIPE_SUPABASE_INTEGRATION.md` - For automatic sync setup
- `Guide/STRIPE_SETUP_CHECKLIST.md` - Complete checklist

---

**Status:** Ready to configure! Follow the steps above to set up your Payment Links. 🚀

