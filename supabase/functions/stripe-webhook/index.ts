import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEBUG } from "../_shared/debug.ts";

const stripe = require("npm:stripe@14.21.0")(Deno.env.get("STRIPE_SECRET_KEY"));
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  DEBUG.request(req.method, req.url);
  
  // Only allow POST requests
  if (req.method !== "POST") {
    DEBUG.warn('Invalid method for webhook', { method: req.method });
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    DEBUG.api('Stripe', 'webhookReceived', { hasSignature: !!signature });

    if (!signature) {
      DEBUG.error('Stripe webhook signature missing');
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
      DEBUG.api('Stripe', 'webhookVerified', { eventType: event.type });
    } catch (err) {
      DEBUG.error('Webhook signature verification failed', { error: err.message });
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    console.log(`Received event: ${event.type}`);
    DEBUG.api('Stripe', 'webhookEvent', { type: event.type, id: event.id });

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed (one-time payment)
    if (event.type === "checkout.session.completed") {
      DEBUG.api('Stripe', 'checkoutSessionCompleted', { sessionId: event.data.object.id });
      
      const session = event.data.object;
      
      // Get user ID from session metadata (we'll set this in frontend)
      const userId = session.metadata?.user_id;
      
      if (!userId) {
        DEBUG.error('No user_id in session metadata', { sessionId: session.id });
        console.error("No user_id in session metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      DEBUG.api('Stripe', 'updatingSubscription', { userId, email: session.customer_details?.email });

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
        DEBUG.error('Error updating user profile', { error: error.message, userId });
        console.error("Error updating user profile:", error);
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      DEBUG.api('Stripe', 'subscriptionUpdated', { userId, status: 'active' });
      console.log(`✅ Updated subscription for user: ${userId}`);
    }

    // Handle customer.subscription.updated (recurring subscription)
    if (event.type === "customer.subscription.updated") {
      DEBUG.api('Stripe', 'subscriptionUpdated', { subscriptionId: event.data.object.id });
      
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (!userId) {
        DEBUG.error('No user_id in subscription metadata', { subscriptionId: subscription.id });
        console.error("No user_id in subscription metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      const status = subscription.status === "active" ? "active" : 
                    subscription.status === "canceled" ? "canceled" :
                    subscription.status === "past_due" ? "past_due" : "inactive";

      DEBUG.api('Stripe', 'updatingSubscriptionStatus', { userId, status });

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
        DEBUG.error('Error updating subscription', { error: error.message, userId, status });
        console.error("Error updating subscription:", error);
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      DEBUG.api('Stripe', 'subscriptionStatusUpdated', { userId, status });
      console.log(`✅ Updated subscription status for user: ${userId} to ${status}`);
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      DEBUG.api('Stripe', 'subscriptionDeleted', { subscriptionId: event.data.object.id });
      
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        DEBUG.api('Stripe', 'cancelingSubscription', { userId });
        
        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          DEBUG.error('Error canceling subscription', { error: error.message, userId });
          console.error("Error canceling subscription:", error);
        } else {
          DEBUG.api('Stripe', 'subscriptionCanceled', { userId });
          console.log(`✅ Canceled subscription for user: ${userId}`);
        }
      } else {
        DEBUG.warn('No user_id in deleted subscription metadata');
      }
    }

    DEBUG.response(200, { received: true });
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    DEBUG.error('Unexpected webhook error', { error: error.message, stack: error.stack });
    console.error("Unexpected error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

