// ===========================
// SUPABASE CONFIGURATION
// ===========================
// 
// IMPORTANT: For production, you should use environment variables or
// a build process to inject these values. For GitHub Pages, you can:
// 1. Use GitHub Secrets and inject during build
// 2. Or keep this file and add it to .gitignore (but then you need to manually add it)
// 3. Or use a config service
//
// For now, replace these with your actual Supabase credentials:
// - Get them from: https://app.supabase.com/project/_/settings/api

const SUPABASE_CONFIG = {
    url: "https://bgqsivfeglvhzkftelez.supabase.co",  // Your Supabase project URL
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncXNpdmZlZ2x2aHprZnRlbGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ3NjYsImV4cCI6MjA4MDQ0MDc2Nn0.ymdV-Y8EwoRp47Bk0uzO7by9fyWlmIEBMutLyhkGYMo"  // Your Supabase anon/public key
};

// Note: The anon key is safe to expose in client-side code.
// Security is handled via Row Level Security (RLS) policies in Supabase.

// ===========================
// STRIPE CONFIGURATION
// ===========================
// 
// Stripe API Configuration
// Products are now fetched dynamically from Stripe API via Supabase Edge Function
//
// To set up:
// 1. Get your Stripe Publishable Key from: https://dashboard.stripe.com/apikeys
// 2. Add it below (safe to expose in client-side code)
// 3. Set up the Supabase Edge Function (see Guide/STRIPE_API_SETUP.md)
//
const STRIPE_CONFIG = {
    publishableKey: "pk_test_XXXXXXXXXXXXX",  // Your Stripe Publishable Key (starts with pk_test_ or pk_live_)
    // Note: Products are fetched via Supabase Edge Function for security
    // The function uses your Stripe Secret Key server-side
};

// Payment redirect URL (where users return after payment)
const STRIPE_REDIRECT_URL = "https://mikaeltalberg.github.io/EB-Okonomi/?payment_success=true";
