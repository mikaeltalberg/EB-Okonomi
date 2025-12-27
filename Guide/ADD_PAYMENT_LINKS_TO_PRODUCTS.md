# Add Payment Links to Stripe Products

## Quick Guide

Your Edge Function is working! ✅ But you need to add Payment Links to your product metadata.

---

## Step-by-Step: Add Payment Links

### Step 1: Create Payment Links in Stripe

For each product, you need to create a Payment Link:

1. Go to: https://dashboard.stripe.com/products
2. Click on a product (e.g., "Litt" or "Ingenting")
3. Scroll down to **"Payment links"** section
4. Click **"Create payment link"**

### Step 2: Configure Payment Link

1. **Product/Price:** Already selected (the product you're on)

2. **Customer information:**
   - ✅ **Require email** (checked)
   - ✅ **Require name** (optional)

3. **After payment:**
   - **Redirect to:** 
     ```
     https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true
     ```

4. Click **"Create link"**

5. **Copy the Payment Link URL** (starts with `https://buy.stripe.com/...`)

### Step 3: Add to Product Metadata

1. Still on the product page in Stripe
2. Scroll to **"Metadata"** section
3. Click **"Add metadata"** (or edit if it exists)
4. Add:
   - **Key:** `payment_link`
   - **Value:** Paste the Payment Link URL you copied
5. Click **"Save"**

### Step 4: Repeat for All Products

Do this for each product:
- "Litt" (prod_TgLRZNjHbrMRv1)
- "Ingenting" (prod_TgLQlwiOf9xsbc)
- Any other products you have

---

## Verify It Works

### Test 1: Check Metadata

1. Go to Stripe Dashboard → Products
2. Click on a product
3. Scroll to Metadata
4. Verify `payment_link` exists with your Payment Link URL

### Test 2: Test Edge Function Again

1. Go to Supabase Dashboard → Edge Functions → fetch-stripe-products
2. Click "Test"
3. Use GET method with Authorization header
4. Check response - `paymentLink` should now have a value

### Test 3: Test in Your App

1. Open your app
2. Click "Velg abonnement"
3. Products should load
4. "Velg" buttons should be enabled (not grayed out)
5. Clicking should redirect to Stripe Payment Link

---

## Your Current Products

Based on your test results:

### Product 1: "Litt"
- **ID:** `prod_TgLRZNjHbrMRv1`
- **Price:** 200 NOK/month
- **Status:** Needs Payment Link in metadata

### Product 2: "Ingenting"
- **ID:** `prod_TgLQlwiOf9xsbc`
- **Price:** 500 NOK/month
- **Status:** Needs Payment Link in metadata

---

## Quick Checklist

For each product:
- [ ] Create Payment Link in Stripe
- [ ] Set redirect URL to: `https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true`
- [ ] Copy Payment Link URL
- [ ] Add to product metadata: Key = `payment_link`, Value = Payment Link URL
- [ ] Save metadata
- [ ] Test Edge Function - verify `paymentLink` appears in response
- [ ] Test in app - verify "Velg" button works

---

## Troubleshooting

### Payment Link Not Showing in API Response

**Check:**
1. Metadata key is exactly `payment_link` (lowercase, underscore)
2. Payment Link URL is correct and active
3. Product metadata is saved
4. Wait a moment and test again (caching)

### "Ikke tilgjengelig" Button Shows

**This means:**
- Payment Link is missing in product metadata
- Add it following Step 3 above

### Payment Link Doesn't Work

**Check:**
1. Payment Link is active in Stripe Dashboard
2. Redirect URL is set correctly
3. Link hasn't expired or been deleted

---

## After Adding Payment Links

Once you've added Payment Links to all products:

1. ✅ Test Edge Function - should return products with `paymentLink` filled
2. ✅ Test in app - products should have working "Velg" buttons
3. ✅ Test payment flow - clicking should redirect to Stripe
4. ✅ Complete test payment - should redirect back to app

---

**Status:** Edge Function working! Just need to add Payment Links to product metadata. 🚀

