import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get request body first (needed for testing mode)
    const body = await req.json().catch(() => ({}));
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://bgqsivfeglvhzkftelez.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role (used for all database operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request (optional for testing)
    const authHeader = req.headers.get("Authorization");
    
    let user = null;
    let emailToSync = body.email;

    // If email is provided in body, we can work with service role directly (for testing)
    // Otherwise, try to authenticate user
    if (emailToSync) {
      // Testing mode - email provided, try to find user by email
      try {
        const { data: users } = await supabase.auth.admin.listUsers();
        const foundUser = users?.users?.find(u => u.email === emailToSync);
        if (foundUser) {
          user = foundUser;
        }
      } catch (error) {
        // If we can't find user, that's okay - we'll create profile by email
        console.log("Could not find user by email, will create profile by email");
      }
    } else if (authHeader) {
      // Production mode - require user authentication
      const supabaseWithAuth = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Try to get authenticated user
      const { data: { user: authUser }, error: authError } = await supabaseWithAuth.auth.getUser();
      
      if (authUser && !authError) {
        // User is authenticated - use their email
        user = authUser;
        emailToSync = user.email;
      } else {
        // No authenticated user and no email provided
        return new Response(JSON.stringify({ error: "Unauthorized - must be logged in or provide email" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      // No email and no auth header
      return new Response(JSON.stringify({ error: "Unauthorized - must be logged in or provide email" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!emailToSync) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing subscription for email: ${emailToSync}`);

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: emailToSync,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log(`No Stripe customer found for email: ${emailToSync}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No subscription found for this email",
          synced: false 
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const customer = customers.data[0];

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    // Find the most recent active subscription
    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    ) || subscriptions.data[0]; // Fallback to most recent

    if (!activeSubscription) {
      console.log(`No subscription found for customer: ${customer.id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No active subscription found",
          synced: false 
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get product and price info
    const priceId = activeSubscription.items.data[0]?.price?.id;
    const productId = activeSubscription.items.data[0]?.price?.product as string;
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(productId);

    // Calculate subscription end date
    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(activeSubscription.current_period_start * 1000).toISOString();

    // Determine plan status
    let planStatus = "inactive";
    if (activeSubscription.status === "active") {
      planStatus = "active";
    } else if (activeSubscription.status === "trialing") {
      planStatus = "trialing";
    } else if (activeSubscription.status === "past_due") {
      planStatus = "past_due";
    } else if (activeSubscription.status === "canceled") {
      planStatus = "canceled";
    }

    // Upsert user profile
    // Use user.id if available, otherwise use email as identifier
    const profileData: any = {
      email: emailToSync,
      stripe_customer_id: customer.id,
      stripe_subscription_id: activeSubscription.id,
      product_id: productId,
      subscription_start: subscriptionStart,
      subscription_end: subscriptionEnd,
      plan_status: planStatus,
      updated_at: new Date().toISOString(),
    };
    
    // If we have a user ID, use it; otherwise let database handle it
    if (user?.id) {
      profileData.id = user.id;
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        profileData,
        {
          onConflict: user?.id ? "id" : "email",
        }
      )
      .select()
      .single();

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: profileError.message,
          synced: false 
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`✅ Successfully synced subscription for email: ${emailToSync}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: true,
        profile: {
          plan_status: planStatus,
          subscription_end: subscriptionEnd,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to sync subscription",
        synced: false,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

