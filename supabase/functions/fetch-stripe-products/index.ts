import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch active products from Stripe
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Fetch prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        // Get prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        // Get the default price (first recurring price, or first price)
        const defaultPrice = prices.data.find((p) => p.recurring) || prices.data[0];

        // Fetch Payment Links for this product
        // Note: Payment Links need to be created in Stripe Dashboard and stored in product metadata
        const paymentLink = product.metadata?.payment_link || "";

        // Determine interval from price
        let interval = "one_time";
        if (defaultPrice?.recurring) {
          interval = defaultPrice.recurring.interval; // 'month' or 'year'
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: defaultPrice
            ? {
                id: defaultPrice.id,
                amount: defaultPrice.unit_amount,
                currency: defaultPrice.currency,
                recurring: defaultPrice.recurring ? {
                  interval: defaultPrice.recurring.interval,
                  interval_count: defaultPrice.recurring.interval_count,
                } : null,
              }
            : null,
          paymentLink: paymentLink,
          interval: interval,
          metadata: product.metadata,
        };
      })
    );

    // Filter out products without prices
    const validProducts = productsWithPrices.filter((p) => p.price !== null);

    return new Response(
      JSON.stringify({
        products: validProducts,
        count: validProducts.length,
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
    console.error("Error fetching Stripe products:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch products",
        products: [],
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

