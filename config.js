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
// STRIPE PRODUCTS CONFIGURATION
// ===========================
// 
// Add your Stripe Payment Links here
// Get Payment Links from: Stripe Dashboard → Products → Create payment link
// 
// IMPORTANT: Update these with your actual Stripe Payment Link URLs
// ===========================

const STRIPE_PRODUCTS = [
    {
        id: 'prod_TYoGOyD47FMCd7',  // Your Stripe Product ID (from example data)
        name: 'Årlig abonnement',
        price: '10 000 kr',
        description: 'Full tilgang til appen i ett år',
        paymentLink: 'https://buy.stripe.com/...',  // TODO: Replace with your actual Stripe Payment Link URL
        interval: 'year'
    },
    {
        id: 'prod_XXXXX',  // TODO: Replace with your second product ID
        name: 'Månedlig abonnement',
        price: '1 000 kr',
        description: 'Full tilgang til appen per måned',
        paymentLink: 'https://buy.stripe.com/...',  // TODO: Replace with your second Payment Link URL
        interval: 'month'
    }
];

