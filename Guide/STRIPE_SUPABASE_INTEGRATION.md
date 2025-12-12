# Stripe + Supabase Integration Guide

## 🎯 Goal

1. User completes purchase in Stripe Checkout
2. Stripe sends webhook to Supabase Edge Function
3. Edge Function updates `user_profiles.subscription_status` to 'active'
4. User can access the app

---

## 📊 Architecture Overview

```
User → Stripe Checkout → Payment Success
                              ↓
                    Stripe Webhook Event
                              ↓
              Supabase Edge Function (receives webhook)
                              ↓
              Updates user_profiles table
                              ↓
              User's subscription_status = 'active'
```

---

## 🛠️ Step-by-Step Setup

### Step 1: Create Supabase Edge Function

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bgqsivfeglvhzkftelez

# Create the function
supabase functions new stripe-webhook
```

#### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bgqsivfeglvhzkftelez/functions
2. Click "Create a new function"
3. Name it: `stripe-webhook`
4. Use the code below

---

### Step 2: Edge Function Code

Create/edit: `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = require("npm:stripe@14.21.0")(Deno.env.get("STRIPE_SECRET_KEY"));
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    console.log(`Received event: ${event.type}`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed (one-time payment)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      // Get user ID from session metadata (we'll set this in frontend)
      const userId = session.metadata?.user_id;
      
      if (!userId) {
        console.error("No user_id in session metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      // Update user_profiles table
      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          email: session.customer_details?.email || null,
          subscription_status: "active",
          subscription_id: session.id,
          subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id"
        });

      if (error) {
        console.error("Error updating user profile:", error);
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      console.log(`✅ Updated subscription for user: ${userId}`);
    }

    // Handle customer.subscription.updated (recurring subscription)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (!userId) {
        console.error("No user_id in subscription metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      const status = subscription.status === "active" ? "active" : 
                    subscription.status === "canceled" ? "canceled" :
                    subscription.status === "past_due" ? "past_due" : "inactive";

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          subscription_status: status,
          subscription_id: subscription.id,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id"
        });

      if (error) {
        console.error("Error updating subscription:", error);
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      console.log(`✅ Updated subscription status for user: ${userId} to ${status}`);
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error("Error canceling subscription:", error);
        } else {
          console.log(`✅ Canceled subscription for user: ${userId}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
```

---

### Step 3: Deploy Edge Function

#### Using CLI:
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Important:** `--no-verify-jwt` is needed because Stripe can't provide JWT tokens.

#### Using Dashboard:
1. Go to Functions page
2. Click "Deploy" on your function
3. Make sure to set it to allow unauthenticated requests (for webhooks)

---

### Step 4: Set Environment Variables (Secrets)

In Supabase Dashboard → Settings → Edge Functions → Secrets, add:

```bash
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook endpoint)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (from Supabase Settings → API)
SUPABASE_URL=https://bgqsivfeglvhzkftelez.supabase.co
```

**Or using CLI:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_URL=https://bgqsivfeglvhzkftelez.supabase.co
```

---

### Step 5: Set Up Stripe Checkout (Frontend)

Update your `goToSubscription()` function in `script.js`:

```javascript
// Go to subscription page
async function goToSubscription() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        // Get current user
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            alert("Du må være logget inn");
            return;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // Create Stripe Checkout Session
        // You'll need a backend endpoint or use Stripe directly
        // For now, we'll use Stripe Checkout with client-side
        
        // Option 1: Redirect to Stripe Checkout (simplest)
        const stripe = Stripe('pk_test_...'); // Your Stripe publishable key
        
        const { data, error } = await fetch('YOUR_BACKEND_ENDPOINT/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                userEmail: userEmail,
            })
        }).then(r => r.json());

        if (error) throw error;

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
        if (result.error) {
            alert(result.error.message);
        }
    } catch (error) {
        console.error("Checkout error:", error);
        alert("Feil ved opprettelse av betaling: " + error.message);
    }
}
```

**Better approach:** Create a simple backend endpoint or use Supabase Edge Function to create checkout session.

---

### Step 6: Create Checkout Session Endpoint

Create another Edge Function: `supabase/functions/create-checkout-session/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = require("npm:stripe@14.21.0")(Deno.env.get("STRIPE_SECRET_KEY"));

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get request body
    const { priceId } = await req.json();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      metadata: {
        user_id: user.id, // Important: pass user ID to webhook
      },
      line_items: [
        {
          price: priceId || "price_...", // Your Stripe price ID
          quantity: 1,
        },
      ],
      mode: "payment", // or "subscription" for recurring
      success_url: `${req.headers.get("origin")}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/?canceled=true`,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

### Step 7: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)
6. Add it to Supabase secrets (Step 4)

---

### Step 8: Update Frontend to Use Checkout

Update `script.js`:

```javascript
// Go to subscription page
async function goToSubscription() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        // Get current user
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            alert("Du må være logget inn");
            return;
        }

        // Call Edge Function to create checkout session
        const { data, error } = await supabaseClient.functions.invoke('create-checkout-session', {
            body: { priceId: 'price_...' } // Your Stripe price ID
        });

        if (error) throw error;

        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
        
    } catch (error) {
        console.error("Checkout error:", error);
        alert("Feil ved opprettelse av betaling: " + error.message);
    }
}
```

---

## 🧪 Testing

### 1. Test Webhook Locally (Optional)

Use Stripe CLI:
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### 2. Test Full Flow

1. User clicks "Abonner nå"
2. Redirected to Stripe Checkout
3. Complete test payment (use Stripe test card: `4242 4242 4242 4242`)
4. Stripe sends webhook
5. Edge Function updates database
6. User refreshes app → paywall disappears!

---

## 📋 Checklist

- [ ] Create `stripe-webhook` Edge Function
- [ ] Create `create-checkout-session` Edge Function
- [ ] Deploy both functions
- [ ] Set environment variables/secrets
- [ ] Configure Stripe webhook endpoint
- [ ] Get Stripe publishable key for frontend
- [ ] Update `goToSubscription()` function
- [ ] Test payment flow
- [ ] Verify database updates

---

## 🔐 Security Notes

- ✅ Webhook signature verification (prevents fake requests)
- ✅ Service role key only in Edge Function (server-side)
- ✅ User authentication required for checkout
- ✅ RLS policies protect user data

---

## 🎯 Next Steps

1. Set up Stripe account (if not done)
2. Create a product/price in Stripe
3. Follow steps above
4. Test with Stripe test mode
5. Switch to live mode when ready

Need help with any specific step? Let me know! 🚀

