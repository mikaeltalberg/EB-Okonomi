# Stripe API Integration Setup

## Overview

This guide explains how to set up dynamic product fetching from Stripe API instead of hardcoding products in `config.js`.

---

## Architecture

```
Frontend (Browser)
    ↓
Supabase Edge Function (fetch-stripe-products)
    ↓
Stripe API (Products & Prices)
    ↓
Returns products with Payment Links
```

**Why use an Edge Function?**
- Stripe Products API requires secret key (cannot be exposed client-side)
- Edge Function acts as secure proxy
- Keeps secret key on server

---

## Step 1: Create Supabase Edge Function

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not installed):
   ```powershell
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```powershell
   supabase login
   ```

3. **Link your project**:
   ```powershell
   supabase link --project-ref bgqsivfeglvhzkftelez
   ```

4. **Create the function**:
   ```powershell
   supabase functions new fetch-stripe-products
   ```

5. **Copy the function code**:
   - The function code is already in: `supabase/functions/fetch-stripe-products/index.ts`
   - Copy it to the function you just created

6. **Deploy the function**:
   ```powershell
   supabase functions deploy fetch-stripe-products
   ```

### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bgqsivfeglvhzkftelez/functions

2. Click **"Create a new function"**

3. Name it: `fetch-stripe-products`

4. Copy the code from: `supabase/functions/fetch-stripe-products/index.ts`

5. Paste into the function editor

6. Click **"Deploy"**

---

## Step 2: Set Up Stripe Secret Key

### 2.1 Verify Your Stripe Secret Key

✅ **If you already have `STRIPE_SECRET_KEY` in Supabase secrets, you can skip this step!**

**Note:** Supabase secrets are hidden for security - you can't view them after saving. This is normal and secure!

**To verify it's set correctly:**
1. Go to: Supabase Dashboard → Settings → Edge Functions → Secrets
2. Check that `STRIPE_SECRET_KEY` exists in the list
3. **Test it:** Deploy the Edge Function and test - if it works, the key is correct!

**If the Edge Function fails (key might be wrong/expired):**
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy your current **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. In Supabase, delete the old `STRIPE_SECRET_KEY` secret
4. Add a new secret with the same name and your current key

---

## Step 3: Add Payment Links to Product Metadata

Since Payment Links are created manually in Stripe Dashboard, you need to store them in product metadata:

### 3.1 Create Payment Links

1. Go to Stripe Dashboard → Products
2. For each product, create a Payment Link (see `Guide/STRIPE_PAYMENT_LINKS_SETUP.md`)
3. Copy the Payment Link URL

### 3.2 Add to Product Metadata

1. In Stripe Dashboard → Products, click on a product
2. Scroll to **"Metadata"** section
3. Click **"Add metadata"**
4. Add:
   - **Key:** `payment_link`
   - **Value:** Your Payment Link URL (e.g., `https://buy.stripe.com/...`)
5. Click **"Save"**

### 3.3 Repeat for All Products

Add `payment_link` metadata to each product that should be available for purchase.

---

## Step 4: Test the Function

### 4.1 Test in Supabase Dashboard

**Using the Test Interface:**

1. Go to: Supabase Dashboard → Edge Functions → `fetch-stripe-products`
2. Click **"Test"** or **"Invoke"** button
3. Configure the test:
   - **HTTP Method:** Select **"GET"** (not POST!)
   - **Request Body:** Leave empty (or delete the default JSON)
   - **Headers:** Click "+ Add Headers" and add:
     - **Key:** `Authorization`
     - **Value:** `Bearer YOUR_SUPABASE_ANON_KEY` (get from Settings → API)
   - **Query Parameters:** Leave empty
4. Click **"Send Request"**
5. **Expected:** Should return JSON with products array

**Example successful response:**
```json
{
  "products": [
    {
      "id": "prod_...",
      "name": "Årlig abonnement",
      "description": "...",
      "price": { "amount": 1000000, "currency": "nok" },
      "paymentLink": "https://buy.stripe.com/...",
      "interval": "year"
    }
  ],
  "count": 1
}
```

### 4.2 Test Locally (if using CLI)

```powershell
supabase functions serve fetch-stripe-products
```

Then test with:
```powershell
curl -X GET http://localhost:54321/functions/v1/fetch-stripe-products -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 4.3 Test from Frontend

1. Open your app
2. Click "Velg abonnement"
3. Products should load from Stripe API
4. Check browser console for any errors

### 4.3 Verify Response

The function should return:
```json
{
  "products": [
    {
      "id": "prod_...",
      "name": "Årlig abonnement",
      "description": "...",
      "price": {
        "amount": 1000000,
        "currency": "nok"
      },
      "paymentLink": "https://buy.stripe.com/...",
      "interval": "year"
    }
  ],
  "count": 1
}
```

---

## Step 5: Update config.js (Already Done)

The `config.js` has been updated to:
- Remove hardcoded `STRIPE_PRODUCTS` array
- Add `STRIPE_CONFIG` with publishable key (for future use)
- Products are now fetched dynamically

---

## How It Works

### Flow:

1. **User clicks "Velg abonnement"**
   - `showProductSelection()` is called

2. **Function fetches products**
   - Calls Supabase Edge Function: `/functions/v1/fetch-stripe-products`
   - Edge Function calls Stripe API with secret key
   - Returns products with prices and Payment Links

3. **Products displayed**
   - Each product card shows name, price, description
   - "Velg" button with Payment Link

4. **User selects product**
   - Redirects to Stripe Payment Link
   - After payment, returns to app

---

## Troubleshooting

### Issue: "Failed to fetch products"

**Solutions:**
- Check Edge Function is deployed
- Verify `STRIPE_SECRET_KEY` exists in Supabase secrets list (you can't view the value, but it should be in the list)
- **Check function logs:** Go to Supabase Dashboard → Edge Functions → fetch-stripe-products → Logs
  - Look for authentication errors (means Stripe key is wrong/expired)
  - Look for API errors (means Stripe key might be invalid)
- **If logs show Stripe auth errors:** The key might be wrong or expired
  - Get your current Stripe secret key from: https://dashboard.stripe.com/apikeys
  - Delete and recreate the `STRIPE_SECRET_KEY` secret in Supabase
- **Verify Stripe mode matches:** Make sure you're using test key for test mode, live key for live mode

### Issue: Products load but no Payment Links

**Solutions:**
- Check product metadata in Stripe Dashboard
- Verify `payment_link` key exists in metadata
- Make sure Payment Links are created and active

### Issue: CORS errors

**Solutions:**
- Edge Function should handle CORS (already included)
- Check function response headers
- Verify function is accessible publicly (anon key should work)

### Issue: Function returns empty products

**Solutions:**
- Check if products are marked as "active" in Stripe
- Verify products have prices attached
- Check Stripe API response in function logs

---

## Security Notes

✅ **Secure:**
- Stripe secret key stored in Supabase secrets (not exposed)
- Edge Function acts as proxy
- Only anon key needed client-side

⚠️ **Important:**
- Edge Function should ideally require authentication
- Currently allows public access (for simplicity)
- Can add auth check if needed

---

## Function Endpoint

**Production:**
```
https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/fetch-stripe-products
```

**Local (if using CLI):**
```
http://localhost:54321/functions/v1/fetch-stripe-products
```

---

## Next Steps

1. ✅ Deploy Edge Function
2. ✅ Set Stripe secret key in Supabase secrets
3. ✅ Add Payment Links to product metadata in Stripe
4. ✅ Test product fetching
5. ✅ Verify products display correctly
6. ✅ Test payment flow

---

## Summary

✅ **Benefits:**
- Products managed in Stripe Dashboard
- No need to update code when adding/removing products
- Dynamic product fetching
- Centralized product management

✅ **What's Changed:**
- `config.js` - Removed hardcoded products, added Stripe config
- `script.js` - Added `fetchStripeProducts()` function
- `showProductSelection()` - Now fetches from API
- Edge Function - Created to proxy Stripe API calls

**Status:** Ready to deploy! Follow the steps above to set up the Edge Function. 🚀

