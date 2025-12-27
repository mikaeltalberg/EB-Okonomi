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

    // Get origin from request headers
    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://mikaeltalberg.github.io/EB-Okonomi";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      metadata: {
        user_id: user.id, // Important: pass user ID to webhook
      },
      line_items: [
        {
          price: priceId || Deno.env.get("STRIPE_PRICE_ID") || "price_...", // Your Stripe price ID
          quantity: 1,
        },
      ],
      mode: "payment", // or "subscription" for recurring
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        checkoutUrl: session.url 
      }),
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

