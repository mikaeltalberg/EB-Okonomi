// ===========================
// SUPABASE CONFIGURATION
// ===========================
// 
// IMPORTANT: This file is auto-generated from GitHub Secrets during deployment.
// For local development, replace the placeholders below with your actual values.
// For production, GitHub Actions will automatically inject values from GitHub Secrets.
//
// Get your credentials from: https://app.supabase.com/project/_/settings/api

const SUPABASE_CONFIG = {
    url: "YOUR_SUPABASE_URL_HERE",  // Replace with your Supabase project URL or use GitHub Secret: SUPABASE_URL
    anonKey: "YOUR_SUPABASE_ANON_KEY_HERE"  // Replace with your Supabase anon key or use GitHub Secret: SUPABASE_ANON_KEY
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
    publishableKey: "YOUR_STRIPE_PUBLISHABLE_KEY_HERE",  // Replace with your Stripe key or use GitHub Secret: STRIPE_PUBLISHABLE_KEY
    // Note: Products are fetched via Supabase Edge Function for security
    // The function uses your Stripe Secret Key server-side
};

// Payment redirect URL (where users return after payment)
const STRIPE_REDIRECT_URL = "YOUR_STRIPE_REDIRECT_URL_HERE";  // Replace with your redirect URL or use GitHub Secret: STRIPE_REDIRECT_URL

// ===========================
// MICROSOFT OAUTH CONFIGURATION
// ===========================
// 
// To set up Microsoft OAuth:
// 1. Go to Azure Portal: https://portal.azure.com
// 2. Navigate to Azure Active Directory > App registrations
// 3. Click "New registration"
// 4. Fill in:
//    - Name: EB-Okonomi (or your app name)
//    - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
//    - Redirect URI: Web - https://mikaeltalberg.github.io/EB-Okonomi/ (or your domain)
// 5. After registration, copy:
//    - Application (client) ID → MSAL_CONFIG.clientId
//    - Directory (tenant) ID → MSAL_CONFIG.authority (optional, can use 'common')
// 6. Go to "Certificates & secrets" and create a client secret (if needed for backend)
// 7. Go to "API permissions" and add:
//    - Microsoft Graph > Delegated permissions:
//      * User.Read (for basic profile)
//      * Files.ReadWrite.All (for OneDrive access)
//      * offline_access (for refresh tokens)
// 8. Click "Grant admin consent" for your organization

const MSAL_CONFIG = {
    clientId: "YOUR_MSAL_CLIENT_ID_HERE",  // Replace with your Azure AD Client ID or use GitHub Secret: MSAL_CLIENT_ID
    authority: "https://login.microsoftonline.com/common",  // Use 'common' for multi-tenant, or use GitHub Secret: MSAL_AUTHORITY
    redirectUri: window.location.origin + window.location.pathname,  // Auto-detect current URL
    // Scopes required for authentication and OneDrive access
    scopes: [
        "User.Read",
        "Files.ReadWrite.All",
        "offline_access"
    ]
};

// Office 365 API endpoints
const OFFICE365_CONFIG = {
    graphEndpoint: "https://graph.microsoft.com/v1.0",
    // OneDrive folder name where app data will be stored
    dataFolderName: "EB-Okonomi-Data"
};