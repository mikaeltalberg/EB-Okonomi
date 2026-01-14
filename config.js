// ===========================
// SUPABASE CONFIGURATION (Edge Functions Only)
// ===========================
// 
// Supabase is used ONLY for Edge Functions (secure API proxy for GitHub API).
// We do NOT use Supabase for authentication or database.
//
// NOTE: The anon key is safe to expose in client-side code - it's designed to be public.
// Security is handled by:
// 1. GitHub token stays server-side (in Edge Function secrets)
// 2. Edge Function validates requests
// 3. GitHub repository is private
//
// Get your anon key from: https://app.supabase.com/project/bgqsivfeglvhzkftelez/settings/api
// If you prefer not to use it, we can modify the Edge Function to not require it (less secure).

const SUPABASE_CONFIG = {
    url: "https://bgqsivfeglvhzkftelez.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY_HERE"  // Get from Supabase Dashboard → Settings → API
    // Note: This is safe to expose - it's public by design
};

// ===========================
// GITHUB CONFIGURATION
// ===========================
// 
// GitHub API is used for user/subscription management.
// The API URL points to Supabase Edge Function (secure proxy).
//
// To set up:
// 1. Create private GitHub repository: EB-Okonomi-UserData ✅
// 2. Create GitHub Personal Access Token with 'repo' and 'workflow' scopes ✅
// 3. Create serverless function proxy (Supabase Edge Function) ✅
// 4. Add serverless function URL below ✅

const GITHUB_CONFIG = {
    apiUrl: "https://bgqsivfeglvhzkftelez.supabase.co/functions/v1/github-user",  // Supabase Edge Function URL
    owner: "mikaeltalberg",  // Your GitHub username
    repo: "EB-Okonomi-UserData"  // Private repository name
};

// ===========================
// STRIPE CONFIGURATION
// ===========================
// 
// Stripe API Configuration
// Products can be fetched directly from Stripe API or via a serverless function
//
// To set up:
// 1. Get your Stripe Publishable Key from: https://dashboard.stripe.com/apikeys
// 2. Add it below (safe to expose in client-side code)
//
const STRIPE_CONFIG = {
    publishableKey: "YOUR_STRIPE_PUBLISHABLE_KEY_HERE",  // Replace with your Stripe key or use GitHub Secret: STRIPE_PUBLISHABLE_KEY
};

// Payment redirect URL (where users return after payment)
const STRIPE_REDIRECT_URL = "YOUR_STRIPE_REDIRECT_URL_HERE";  // Replace with your redirect URL or use GitHub Secret: STRIPE_REDIRECT_URL

// ===========================
// MICROSOFT OAUTH CONFIGURATION (OPTIONAL)
// ===========================
// 
// Microsoft OAuth is used for authentication and OneDrive data storage.
// When logged in with Microsoft, app data is synced to OneDrive.
// Subscription status is managed via GitHub API.
//
// To set up Microsoft OAuth:
// 1. Go to Azure Portal: https://portal.azure.com
// 2. Navigate to Azure Active Directory > App registrations
// 3. Click "New registration"
// 4. Fill in:
//    - Name: EB-Okonomi (or your app name)
//    - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
//    - Redirect URI: Single-page application (SPA) - https://mikaeltalberg.github.io/EB-Okonomi/ (or your domain)
// 5. After registration, copy:
//    - Application (client) ID → MSAL_CONFIG.clientId
// 6. Go to "API permissions" and add:
//    - Microsoft Graph > Delegated permissions:
//      * User.Read (for basic profile)
//      * Files.ReadWrite.All (for OneDrive access)
//      * offline_access (for refresh tokens)
// 7. Click "Grant admin consent" for your organization

const MSAL_CONFIG = {
    clientId: "YOUR_MSAL_CLIENT_ID_HERE",  // Replace with your Azure AD Client ID or use GitHub Secret: MSAL_CLIENT_ID
    authority: "https://login.microsoftonline.com/common",  // Use 'common' for multi-tenant
    redirectUri: window.location.origin + window.location.pathname,  // Auto-detect current URL
    // Scopes required for authentication and OneDrive access
    scopes: [
        "User.Read",
        "Files.ReadWrite.All",
        "offline_access"
    ]
};

// Office 365 API endpoints (for OneDrive data storage)
const OFFICE365_CONFIG = {
    graphEndpoint: "https://graph.microsoft.com/v1.0",
    // OneDrive folder name where app data will be stored
    dataFolderName: "EB-Okonomi-Data"
};

// ===========================
// DEBUG CONFIGURATION
// ===========================
// 
// Debug settings for development and production.
// 
// For DEV branch: Set enabled = true
// For MASTER branch: Set enabled = false (or use build script to strip debug code)
//
// You can also detect branch automatically:
//   const isDevBranch = window.location.hostname === 'localhost' || 
//                       window.location.hostname.includes('dev') ||
//                       document.querySelector('meta[name="branch"]')?.content === 'dev';
//
// To enable debug in console: DEBUG.enable()
// To disable debug in console: DEBUG.disable()
// To set debug level: DEBUG.setLevel('verbose' | 'info' | 'warn' | 'error' | 'none')

// Auto-detect environment (you can customize this logic)
const isDevEnvironment = window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('127.0.0.1') ||
                         window.location.hostname.includes('dev') ||
                         window.location.search.includes('debug=true');

// Debug configuration
window.DEBUG_CONFIG = {
    enabled: isDevEnvironment,  // true for dev, false for production/master
    level: 'verbose',  // 'verbose', 'info', 'warn', 'error', 'none'
    showTimestamp: true,
    showCaller: true,
    showMemory: false,
    colors: true,
    groups: true,
    ui: true,       // Log UI clicks (buttons/links/etc.)
    network: true,  // Log network requests
    api: true,      // Log API calls (GitHub, Stripe, etc.)
    auth: true,     // Log authentication events
    storage: true,  // Log storage operations (OneDrive, localStorage)
    payment: true   // Log payment operations (Stripe)
};
