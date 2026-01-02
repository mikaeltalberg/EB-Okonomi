// ===========================
// SUPABASE CLIENT INITIALIZATION
// ===========================

// Initialize Supabase client
let supabaseClient = null;

try {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log("✅ Supabase client initialized");
    } else {
        console.error("❌ Supabase config not found. Make sure config.js is loaded.");
    }
} catch (error) {
    console.error("❌ Failed to initialize Supabase client:", error);
}

// ===========================
// AUTHENTICATION & PAYWALL
// ===========================

// Check authentication and subscription status
async function checkAuthAndSubscription() {
    if (!supabaseClient) {
        showAuthError("Supabase ikke konfigurert. Sjekk config.js");
        return;
    }

    try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error("Session error:", sessionError);
            showLoginPrompt();
            return;
        }

        if (!session) {
            // No session - show login
            showLoginPrompt();
            return;
        }

        // User is authenticated - check subscription
        const user = session.user;
        console.log("✅ User authenticated:", user.email);

        // Check subscription status from user profile
        let profile = null;
        let profileError = null;
        
        // First try to get profile by user ID
        const profileResult = await supabaseClient
            .from('user_profiles')
            .select('plan_status, subscription_end, email')
            .eq('id', user.id)
            .single();

        profile = profileResult.data;
        profileError = profileResult.error;

        // If no profile by ID, try by email (for users who paid before signing up)
        if (profileError && profileError.code === 'PGRST116') {
            const profileByEmailResult = await supabaseClient
                .from('user_profiles')
                .select('plan_status, subscription_end, email')
                .eq('email', user.email)
                .single();
            
            if (profileByEmailResult.data) {
                profile = profileByEmailResult.data;
                // Link the profile to the user ID
                await supabaseClient
                    .from('user_profiles')
                    .update({ id: user.id })
                    .eq('email', user.email);
            }
        } else if (profileError && profileError.code !== 'PGRST116') {
            console.error("Profile error:", profileError);
        }

        // Check if user has active subscription (direct or via license)
        let hasAccess = false;
        
        if (profile && profile.plan_status === 'active' && 
            (!profile.subscription_end || new Date(profile.subscription_end) > new Date())) {
            hasAccess = true;
        } else {
            // Check if user is granted access via license
            const { data: license } = await supabaseClient
                .from('license_users')
                .select('license_owner_id')
                .eq('email', user.email)
                .eq('is_active', true)
                .single();
            
            if (license) {
                // Check if license owner has active subscription
                const { data: ownerProfile } = await supabaseClient
                    .from('user_profiles')
                    .select('plan_status, subscription_end')
                    .eq('id', license.license_owner_id)
                    .single();
                
                if (ownerProfile && ownerProfile.plan_status === 'active' &&
                    (!ownerProfile.subscription_end || new Date(ownerProfile.subscription_end) > new Date())) {
                    hasAccess = true;
                }
            }
        }

        if (hasAccess) {
            // User has active subscription - hide paywall
            userHasAccess = true; // Set global access flag
            hidePaywall();
            showUserInfo(user.email);
            // Show settings button
            const settingsBtn = document.getElementById('user-settings');
            if (settingsBtn) settingsBtn.classList.remove('hidden');
        } else {
            // User authenticated but no subscription
            userHasAccess = false; // Clear access flag
            showSubscriptionPrompt(user.email);
            const settingsBtn = document.getElementById('user-settings');
            if (settingsBtn) settingsBtn.classList.add('hidden');
        }

    } catch (error) {
        console.error("Auth check error:", error);
        showAuthError("Feil ved autentisering. Prøv igjen.");
    }
}

// Show login prompt
function showLoginPrompt() {
    userHasAccess = false; // Clear access flag
    const authStatus = document.getElementById("auth-status");
    const loginButtons = document.getElementById("login-buttons");
    const userInfo = document.getElementById("user-info");
    const subscriptionPrompt = document.getElementById("subscription-prompt");
    const paywall = document.getElementById("paywall");
    
    if (authStatus) authStatus.style.display = "none";
    if (loginButtons) loginButtons.style.display = "block";
    if (userInfo) userInfo.style.display = "none";
    if (subscriptionPrompt) subscriptionPrompt.style.display = "none";
    if (paywall) paywall.classList.remove("hidden");
}

// Show auth error
function showAuthError(message) {
    document.getElementById("auth-message").textContent = message;
    document.getElementById("auth-status").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("user-info").style.display = "none";
    document.getElementById("subscription-prompt").style.display = "none";
}

// Show user info (logged in)
function showUserInfo(email) {
    document.getElementById("user-email").textContent = email;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("auth-status").style.display = "none";
    document.getElementById("subscription-prompt").style.display = "none";
}

// Show subscription prompt
function showSubscriptionPrompt(email) {
    document.getElementById("user-email").textContent = email;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("subscription-prompt").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("auth-status").style.display = "none";
    document.getElementById("paywall").classList.remove("hidden");
}

// Hide paywall and show app
function hidePaywall() {
    const paywall = document.getElementById("paywall");
    if (paywall) {
        paywall.classList.add("hidden");
    }
}

// Global access state - tracks if user has valid access
let userHasAccess = false;

// Re-check access and enforce paywall
async function enforceAccess() {
    const paywall = document.getElementById("paywall");
    
    // Always verify access with server
    await checkAuthAndSubscription();
    
    // If paywall was removed, restore it if user doesn't have access
    if (!userHasAccess && paywall && paywall.classList.contains("hidden")) {
        paywall.classList.remove("hidden");
        showLoginPrompt();
    }
}

// MutationObserver to detect if paywall is removed from DOM
function setupPaywallProtection() {
    const paywall = document.getElementById("paywall");
    if (!paywall) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Check if paywall was removed
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node === paywall || (node.nodeType === 1 && node.id === 'paywall')) {
                        console.warn("⚠️ Paywall removed - restoring security check");
                        if (!userHasAccess) {
                            // Recreate paywall if removed
                            setTimeout(() => {
                                enforceAccess();
                            }, 100);
                        }
                    }
                });
            }
            
            // Check if paywall class was changed to hide it without permission
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'paywall' && target.classList.contains('hidden') && !userHasAccess) {
                    console.warn("⚠️ Paywall hidden without access - restoring");
                    setTimeout(() => {
                        enforceAccess();
                    }, 100);
                }
            }
        });
    });
    
    // Observe the paywall element and its parent
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    // Also observe the paywall directly
    observer.observe(paywall, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true
    });
}

// Periodic access verification (every 30 seconds)
function startPeriodicAccessCheck() {
    setInterval(async () => {
        if (!userHasAccess) {
            await enforceAccess();
        } else {
            // Even if access is granted, verify periodically
            await checkAuthAndSubscription();
        }
    }, 30000); // Check every 30 seconds
}

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign in with Google
async function signInWithGoogle() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        // User will be redirected to Google, then back to this page
    } catch (error) {
        console.error("Google sign-in error:", error);
        alert("Feil ved innlogging med Google: " + error.message);
    }
}

// Sign in with GitHub
async function signInWithGitHub() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        // User will be redirected to GitHub, then back to this page
    } catch (error) {
        console.error("GitHub sign-in error:", error);
        alert("Feil ved innlogging med GitHub: " + error.message);
    }
}

// Sign in with Email (magic link)
async function signInWithEmail() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    const email = prompt("Skriv inn din e-postadresse:");
    if (!email) return;

    try {
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        alert("Sjekk din e-post for innloggingslenken!");
    } catch (error) {
        console.error("Email sign-in error:", error);
        alert("Feil ved innlogging: " + error.message);
    }
}

// ===========================
// SIGNUP FUNCTIONS
// ===========================

// Show signup modal
function showSignupModal() {
    const modal = document.getElementById("signup-modal");
    if (modal) {
        modal.classList.remove("hidden");
        // Clear form
        document.getElementById("signup-form").reset();
        document.getElementById("signup-error").style.display = "none";
    }
}

// Hide signup modal
function hideSignupModal() {
    const modal = document.getElementById("signup-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    
    if (!supabaseClient) {
        showSignupError("Supabase ikke konfigurert");
        return;
    }

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const passwordConfirm = document.getElementById("signup-password-confirm").value;

    // Validation
    if (!email || !password || !passwordConfirm) {
        showSignupError("Vennligst fyll ut alle felt");
        return;
    }

    if (password.length < 6) {
        showSignupError("Passordet må være minst 6 tegn langt");
        return;
    }

    if (password !== passwordConfirm) {
        showSignupError("Passordene stemmer ikke overens");
        return;
    }

    // Clear previous errors
    showSignupError("");

    try {
        // Sign up user with Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });

        if (authError) throw authError;

        // If email confirmation is required, user will need to confirm email
        if (authData.user && !authData.session) {
            alert("Konto opprettet! Sjekk din e-post for å bekrefte kontoen din.");
            hideSignupModal();
            showLoginPrompt();
            return;
        }

        // If session is created immediately (email confirmation disabled)
        if (authData.session && authData.user) {
            console.log("✅ User signed up:", authData.user.email);
            
            // Create user profile in user_profiles table
            await createUserProfile(authData.user.id, email);
            
            // Check auth and subscription status
            await checkAuthAndSubscription();
            
            // Hide signup modal
            hideSignupModal();
        }

    } catch (error) {
        console.error("Signup error:", error);
        showSignupError(error.message || "Feil ved opprettelse av konto. Prøv igjen.");
    }
}

// Create user profile in user_profiles table
async function createUserProfile(userId, email) {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .insert({
                id: userId,
                email: email,
                plan_status: 'inactive',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            // If profile already exists, that's okay
            if (error.code !== '23505') { // 23505 = unique violation
                console.error("Error creating user profile:", error);
            }
        } else {
            console.log("✅ User profile created:", data);
        }
    } catch (error) {
        console.error("Error in createUserProfile:", error);
    }
}

// Ensure user profile exists (useful for email confirmation flow)
async function ensureUserProfile(userId, email) {
    if (!supabaseClient || !userId) return;

    try {
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabaseClient
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .single();

        // If profile doesn't exist, create it
        if (checkError && checkError.code === 'PGRST116') {
            console.log("Profile doesn't exist, creating...");
            await createUserProfile(userId, email);
        } else if (existingProfile) {
            console.log("✅ User profile already exists");
        }
    } catch (error) {
        console.error("Error ensuring user profile:", error);
    }
}

// Show signup error message
function showSignupError(message) {
    const errorDiv = document.getElementById("signup-error");
    if (errorDiv) {
        if (message) {
            errorDiv.textContent = message;
            errorDiv.style.display = "block";
        } else {
            errorDiv.textContent = "";
            errorDiv.style.display = "none";
        }
    }
}

// Sign out
async function signOut() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Clear local data
        localStorage.removeItem("abonnent");
        
        // Show login prompt
        showLoginPrompt();
    } catch (error) {
        console.error("Sign out error:", error);
        alert("Feil ved utlogging: " + error.message);
    }
}

// ===========================
// PRODUCT SELECTION
// ===========================

// Fetch products from Stripe API via Supabase Edge Function
async function fetchStripeProducts() {
    try {
        // Call Supabase Edge Function to fetch products from Stripe
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/functions/v1/fetch-stripe-products`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data.products || [];
    } catch (error) {
        console.error("Error fetching Stripe products:", error);
        // Fallback: return empty array or show error
        return [];
    }
}

// Show product selection page
async function showProductSelection() {
    const container = document.getElementById('products-container');
    
    // Show loading state
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Laster produkter...</p>';
    document.getElementById('product-selection').classList.remove('hidden');
    
    try {
        // Fetch products from API
        const products = await fetchStripeProducts();
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #dc3545;">Ingen produkter tilgjengelig.</p>
                    <p style="color: #666; margin-top: 1rem;">Vennligst kontakt support.</p>
                </div>
            `;
            return;
        }

        // Clear loading state
        container.innerHTML = '';
        
        // Display products
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Format price for display
            const priceDisplay = formatPrice(product.price);
            
            // Get payment link (from product metadata or construct from price)
            const paymentLink = product.paymentLink || constructPaymentLink(product);
            const productId = product.id || '';
            const hasPaymentLink = paymentLink && paymentLink.trim() !== '';
            
            // Escape payment link for use in onclick
            const escapedPaymentLink = hasPaymentLink ? paymentLink.replace(/'/g, "\\'") : '';
            
            // Create button - disabled if no payment link
            const buttonHTML = hasPaymentLink
                ? `<button class="choose-button" onclick="selectProduct('${escapedPaymentLink}', '${productId}')">Velg</button>`
                : `<button class="choose-button" disabled style="opacity: 0.5; cursor: not-allowed;" title="Betalinglenke ikke konfigurert">Ikke tilgjengelig</button>`;
            
            card.innerHTML = `
                <div class="product-name">${product.name || 'Abonnement'}</div>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-description">${product.description || ''}</div>
                ${!hasPaymentLink ? '<p style="color: #dc3545; font-size: 0.9rem; margin-top: 0.5rem;">⚠️ Betalinglenke mangler</p>' : ''}
                ${buttonHTML}
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: #dc3545;">Feil ved lasting av produkter.</p>
                <p style="color: #666; margin-top: 1rem;">${error.message}</p>
                <button onclick="showProductSelection()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Prøv igjen
                </button>
            </div>
        `;
    }
}

// Format price for display (convert from cents to currency)
function formatPrice(priceData) {
    if (!priceData) return 'Pris ikke tilgjengelig';
    
    // If priceData is an object with amount and currency
    if (typeof priceData === 'object') {
        const amount = priceData.unit_amount || priceData.amount || 0;
        const currency = priceData.currency || 'nok';
        const formatted = (amount / 100).toLocaleString('no-NO');
        return `${formatted} ${currency.toUpperCase()}`;
    }
    
    // If it's already a string, return as is
    if (typeof priceData === 'string') {
        return priceData;
    }
    
    // If it's a number (in cents), convert
    if (typeof priceData === 'number') {
        return `${(priceData / 100).toLocaleString('no-NO')} NOK`;
    }
    
    return 'Pris ikke tilgjengelig';
}

// Construct payment link from product/price data
// Note: This requires Payment Links to be created in Stripe and stored in product metadata
function constructPaymentLink(product) {
    // If payment link is in metadata, use it
    if (product.metadata && product.metadata.payment_link) {
        return product.metadata.payment_link;
    }
    
    // Otherwise, we need to create Payment Links in Stripe and store them
    // For now, return empty - user needs to set up Payment Links
    console.warn("Payment link not found for product:", product.id);
    return '';
}

// Close product selection
function closeProductSelection() {
    document.getElementById('product-selection').classList.add('hidden');
}

// Select product and redirect to Stripe Payment Link
async function selectProduct(paymentLink) {
    if (!paymentLink || paymentLink.includes('...') || paymentLink.includes('XXXXXXXX')) {
        alert("Betalinglenke ikke konfigurert. Vennligst kontakt support.");
        console.error("Payment link not configured:", paymentLink);
        return;
    }
    
    // Get current user session to pass user info to Stripe
    let userId = null;
    let userEmail = null;
    
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            userId = session.user.id;
            userEmail = session.user.email;
        }
    }
    
    // Add user metadata to payment link (if user is logged in)
    // This helps Stripe identify the customer
    let finalPaymentLink = paymentLink;
    
    if (userId && userEmail) {
        // Add user info as URL parameters (Stripe Payment Links support this)
        const separator = paymentLink.includes('?') ? '&' : '?';
        finalPaymentLink = `${paymentLink}${separator}client_reference_id=${userId}&prefilled_email=${encodeURIComponent(userEmail)}`;
    }
    
    console.log("Redirecting to Stripe Payment Link:", finalPaymentLink);
    
    // Redirect to Stripe Payment Link
    window.location.href = finalPaymentLink;
}

// Poll for subscription status after payment
async function pollForSubscription(maxAttempts = 12) {
    if (!supabaseClient) return;
    
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds between attempts
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            console.log("No session, stopping poll");
            break;
        }
        
        // Check subscription status
        await checkAuthAndSubscription();
        
        // Check if subscription is now active
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('plan_status, subscription_end')
            .eq('id', session.user.id)
            .single();
        
        if (profile && profile.plan_status === 'active') {
            console.log("✅ Subscription active!");
            showAuthError("Tilgang aktivert! Velkommen!");
            setTimeout(() => {
                showAuthError("");
            }, 3000);
            return;
        }
        
        console.log(`Polling attempt ${i + 1}/${maxAttempts}...`);
    }
    
    // If we get here, polling didn't find active subscription
    showAuthError("Betalingen er registrert, men det kan ta noen minutter før tilgangen aktiveres. Prøv å oppdatere siden om litt.");
}

// ===========================
// USER SETTINGS
// ===========================

async function showSettingsModal() {
    if (!supabaseClient) return;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    // Load subscription info
    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (profile) {
        const endDate = profile.subscription_end 
            ? new Date(profile.subscription_end).toLocaleDateString('no-NO')
            : 'N/A';
        document.getElementById('subscription-info').innerHTML = `
            <strong>Status:</strong> ${profile.plan_status}<br>
            <strong>Slutter:</strong> ${endDate}
        `;
    } else {
        document.getElementById('subscription-info').innerHTML = 'Ingen abonnement funnet.';
    }
    
    // Load license users
    await loadLicenseUsers();
    
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

async function loadLicenseUsers() {
    if (!supabaseClient) return;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    const { data: users } = await supabaseClient
        .from('license_users')
        .select('*')
        .eq('license_owner_id', session.user.id)
        .eq('is_active', true);
    
    const container = document.getElementById('license-users-list');
    container.innerHTML = '';
    
    if (users && users.length > 0) {
        users.forEach(user => {
            const div = document.createElement('div');
            div.innerHTML = `
                <span>${user.email}</span>
                <button onclick="removeLicenseUser('${user.id}')">Fjern</button>
            `;
            container.appendChild(div);
        });
    }
    
    // Show count
    const count = users ? users.length : 0;
    const countP = document.createElement('p');
    countP.style.marginTop = '0.5rem';
    countP.textContent = `Antall: ${count}/5`;
    container.appendChild(countP);
}

async function addLicenseUser() {
    if (!supabaseClient) return;
    
    const email = document.getElementById('new-license-email').value.trim();
    if (!email) {
        alert('Vennligst oppgi en e-postadresse');
        return;
    }
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    // Check count
    const { data: existing } = await supabaseClient
        .from('license_users')
        .select('id')
        .eq('license_owner_id', session.user.id)
        .eq('is_active', true);
    
    if (existing && existing.length >= 5) {
        alert('Maksimalt 5 e-postadresser per lisens');
        return;
    }
    
    const { error } = await supabaseClient
        .from('license_users')
        .insert({
            license_owner_id: session.user.id,
            email: email
        });
    
    if (error) {
        alert('Feil: ' + error.message);
    } else {
        document.getElementById('new-license-email').value = '';
        await loadLicenseUsers();
    }
}

async function removeLicenseUser(userId) {
    if (!supabaseClient) return;
    
    const { error } = await supabaseClient
        .from('license_users')
        .update({ is_active: false })
        .eq('id', userId);
    
    if (!error) {
        await loadLicenseUsers();
    } else {
        alert('Feil ved fjerning: ' + error.message);
    }
}

// ===========================
// INITIALIZE AUTH ON PAGE LOAD
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
    if (!supabaseClient) {
        showAuthError("Supabase ikke konfigurert. Sjekk config.js");
        return;
    }

    // Check for return from Stripe Payment Link
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    
    if (paymentSuccess === 'true') {
        // Payment completed - trigger immediate sync
        console.log("Payment successful, syncing subscription...");
        
        // Show message to user
        showAuthError("Betaling mottatt! Vent mens vi oppdaterer din tilgang...");
        
        // Get current user session
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.user) {
            // Trigger immediate sync via Edge Function
            try {
                const { data: syncData, error: syncError } = await supabaseClient.functions.invoke(
                    'sync-user-subscription',
                    {
                        body: { email: session.user.email }
                    }
                );
                
                if (syncError) {
                    console.error("Sync error:", syncError);
                    // Fall back to polling
                    await pollForSubscription(12);
                } else if (syncData?.synced) {
                    console.log("✅ Subscription synced successfully!");
                    // Wait a moment for database to update
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Check subscription status
                    await checkAuthAndSubscription();
                } else {
                    console.log("Sync returned but not synced, polling...");
                    await pollForSubscription(12);
                }
            } catch (error) {
                console.error("Error calling sync function:", error);
                // Fall back to polling
                await pollForSubscription(12);
            }
        } else {
            // User not logged in - show login prompt
            showLoginPrompt();
            showAuthError("Vennligst logg inn for å aktivere din tilgang.");
        }
        
        // Remove query param
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Check for old Stripe checkout session_id (backward compatibility)
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
        // Payment successful - refresh subscription status
        console.log("Payment successful, refreshing subscription status...");
        // Remove session_id from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Check auth and subscription (will show updated status)
        await checkAuthAndSubscription();
        return;
    }

    // Check for OAuth/magic link callback (handle redirect after authentication)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAccessToken = hashParams.get('access_token');
    const isMagicLink = hashParams.get('type') === 'magiclink';
    
    if (hasAccessToken || isMagicLink) {
        // Authentication redirect - Supabase needs to process the hash
        console.log("Processing authentication callback...");
        
        try {
            // Wait for Supabase to process the hash and set the session
            // The getSession() call will automatically extract tokens from hash
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            
            if (sessionError) {
                console.error("Session error after redirect:", sessionError);
                showAuthError("Feil ved autentisering. Prøv igjen.");
                // Clear the hash to prevent retry loops
                window.location.hash = '';
                return;
            }
            
            if (session) {
                console.log("✅ Session established:", session.user.email);
                // Clear the hash from URL for cleaner URL
                window.location.hash = '';
                // Check auth and subscription status
                await checkAuthAndSubscription();
            } else {
                console.warn("No session after redirect");
                // Clear hash and show login
                window.location.hash = '';
                showLoginPrompt();
            }
        } catch (error) {
            console.error("Error processing auth callback:", error);
            showAuthError("Feil ved autentisering. Prøv igjen.");
            window.location.hash = '';
        }
    } else {
        // Normal page load - check auth immediately
        await checkAuthAndSubscription();
    }

    // Listen for auth state changes
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth state changed:", event, session?.user?.email);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // If user just signed in, ensure profile exists
                if (session?.user) {
                    await ensureUserProfile(session.user.id, session.user.email);
                }
                checkAuthAndSubscription();
            } else if (event === 'SIGNED_OUT') {
                userHasAccess = false;
                showLoginPrompt();
            }
        });
    }
    
    // Setup security measures
    setupPaywallProtection();
    startPeriodicAccessCheck();
});

// ---------------------------------------------------------------------
// BACKEND CONFIG (added)
// ---------------------------------------------------------------------
const API_BASE = "http://127.0.0.1:5000"; // change if your server runs elsewhere

// Fetch all inntekter from backend and map into local arrays
async function loadInntekterFromBackend() {
    try {
        const res = await fetch(`${API_BASE}/inntekter`);
        if (!res.ok) throw new Error("Failed fetching inntekter");
        const rows = await res.json();

        // Reset local arrays for inntekter
        inntekter = [];
        inntektsDatoer = [];
        inntektsBeskrivelser = [];

        // Map rows -> your frontend arrays
        rows.forEach(r => {
            // backend uses fields: id, amount, date, description
            inntekter.push(parseFloat(r.amount));
            inntektsDatoer.push(r.date || "");
            inntektsBeskrivelser.push(r.description || "");
        });

        // save locally too, so other code keeps working
        lagreData();
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    } catch (err) {
        console.error("Could not load inntekter from backend:", err);
    }
}

// Add a single inntekt to backend
async function backendLeggTilInntekt(amount, date, description) {
    try {
        const res = await fetch(`${API_BASE}/inntekter`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ amount, date, description })
        });
        if (!res.ok) throw new Error("Failed to add inntekt");
        return await res.json();
    } catch (err) {
        console.error("backend add error:", err);
        throw err;
    }
}

// Bulk sync existing local inntekter -> backend
// expects to be called manually if you want to push older local entries
async function backendSyncLocalInntekter() {
    // prepare array of objects
    const payload = inntekter.map((amt, i) => ({
        amount: amt,
        date: inntektsDatoer[i] || "",
        description: inntektsBeskrivelser[i] || ""
    }));

    try {
        const res = await fetch(`${API_BASE}/inntekter/bulk`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Bulk sync failed");
        return await res.json();
    } catch (err) {
        console.error("bulk sync error:", err);
        throw err;
    }
}

// Delete inntekt by id is not wired to UI in this version, because your frontend uses indexes.
// (If you display ids in the UI later we can wire DELETE.)

// ========================================================================
// Initiering av datastrukturer fra localStorage med fallback
// ========================================================================
let inntekter = JSON.parse(localStorage.getItem("inntekter")) || [];
let utgifter = JSON.parse(localStorage.getItem("utgifter")) || [];
let skyldnere = JSON.parse(localStorage.getItem("skyldnere")) || [];
let skyldBeløp = JSON.parse(localStorage.getItem("skyldBeløp")) || [];
let skyldStatus = JSON.parse(localStorage.getItem("skyldStatus")) || [];
let betalingsDatoer = JSON.parse(localStorage.getItem("betalingsDatoer")) || [];
let egenkapitalHistorikk = JSON.parse(localStorage.getItem("egenkapitalHistorikk")) || [];
let datoer = JSON.parse(localStorage.getItem("datoer")) || [];
let inntektsDatoer = JSON.parse(localStorage.getItem("inntektsDatoer")) || [];
let utgiftsDatoer = JSON.parse(localStorage.getItem("utgiftsDatoer")) || [];
let inntektsBeskrivelser = JSON.parse(localStorage.getItem("inntektsBeskrivelser")) || [];
let utgiftsBeskrivelser = JSON.parse(localStorage.getItem("utgiftsBeskrivelser")) || [];
let andeler = parseInt(localStorage.getItem("andeler")) || 0;
let andelVerdi = parseFloat(localStorage.getItem("andelVerdi")) || 0;
let oppstartstid = localStorage.getItem("oppstartstid") || "";
let avviklingstid = localStorage.getItem("avviklingstid") || "";

// Diagramobjekter
let egenkapitalChart = null;
let budsjettChart = null;

// ========================================================================
// Når siden er ferdig lastet
// ========================================================================
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("andeler").value = andeler;
    document.getElementById("andelVerdi").value = andelVerdi;
    document.getElementById("start").value = oppstartstid;
    document.getElementById("end").value = avviklingstid;

    // Load inntekter from backend first; if backend is unavailable, fallback to local
    loadInntekterFromBackend().catch(() => {
        // If fail, use localStorage-stored inntekter (already in arrays)
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    });

    oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");
    oppdaterListeSkyldnere();
    oppdaterEgenkapitalGraf();
});

// ========================================================================
// Lagre oppstart og avvikling ved endring
// ========================================================================
document.getElementById("start").addEventListener("change", function() {
    oppstartstid = this.value;
    localStorage.setItem("oppstartstid", oppstartstid);
});
document.getElementById("end").addEventListener("change", function() {
    avviklingstid = this.value;
    localStorage.setItem("avviklingstid", avviklingstid);
});

// ========================================================================
// Legg til inntekt
// ========================================================================
async function leggTilInntekt() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    let inntekt = parseFloat(document.getElementById("nyInntekt").value);
    let inntektDato = document.getElementById("inntektDato").value;
    let inntektBeskrivelse = document.getElementById("inntektBeskrivelse").value.trim();

    if (isNaN(inntekt) || inntekt <= 0) { alert("Vennligst oppgi en gyldig inntekt."); return; }
    if (!inntektDato) { alert("Vennligst velg en dato for inntekten."); return; }

    // Try to send to backend first
    try {
        await backendLeggTilInntekt(inntekt, inntektDato, inntektBeskrivelse);

        // After backend insert, reload from backend to get canonical data
        await loadInntekterFromBackend();
    } catch (err) {
        // If backend fails, fallback to localStorage (keeps app usable offline)
        console.warn("Falling back to localStorage for inntekt because backend failed.");
        inntekter.push(inntekt);
        inntektsDatoer.push(inntektDato);
        inntektsBeskrivelser.push(inntektBeskrivelse);

        lagreData();
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    }

    document.getElementById("nyInntekt").value = "";
    document.getElementById("inntektDato").value = "";
    document.getElementById("inntektBeskrivelse").value = "";
}

// ========================================================================
// Legg til utgift
// (unchanged — still local storage)
// ========================================================================
// Check if user has access before allowing function execution
async function requireAccess() {
    if (!userHasAccess) {
        await enforceAccess();
        throw new Error("Tilgang nødvendig. Vennligst logg inn og abonner.");
    }
    // Verify session is still valid
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            userHasAccess = false;
            showLoginPrompt();
            throw new Error("Sesjon utløpt. Vennligst logg inn på nytt.");
        }
    }
} 

async function leggTilUtgift() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    let utgift = parseFloat(document.getElementById("nyUtgift").value);
    let utgiftDato = document.getElementById("utgiftDato").value;
    let utgiftBeskrivelse = document.getElementById("utgiftBeskrivelse").value.trim();

    if (isNaN(utgift) || utgift <= 0) { alert("Vennligst oppgi en gyldig utgift."); return; }
    if (!utgiftDato) { alert("Vennligst velg en dato for utgiften."); return; }

    utgifter.push(utgift);
    utgiftsDatoer.push(utgiftDato);
    utgiftsBeskrivelser.push(utgiftBeskrivelse);

    lagreData();
    oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");

    document.getElementById("nyUtgift").value = "";
    document.getElementById("utgiftDato").value = "";
    document.getElementById("utgiftBeskrivelse").value = "";
}

// ========================================================================
// Legg til skyldner
// ========================================================================
function leggTilSkyldner() {
    const navn = document.getElementById("skyldnerNavn").value.trim();
    const belop = parseFloat(document.getElementById("skyldnerBeløp").value);

    if (!navn || isNaN(belop) || belop <= 0) { alert("Vennligst oppgi både gyldig navn og beløp."); return; }

    skyldnere.push(navn);
    skyldBeløp.push(belop);
    skyldStatus.push(false);
    betalingsDatoer.push("");

    lagreData();
    oppdaterListeSkyldnere();

    document.getElementById("skyldnerNavn").value = "";
    document.getElementById("skyldnerBeløp").value = "";
}

// ========================================================================
// Oppdater liste over skyldnere
// ========================================================================
function oppdaterListeSkyldnere() {
    const container = document.getElementById("skyldnere-list");
    container.innerHTML = "";

    for (let i = 0; i < skyldnere.length; i++) {
        const div = document.createElement("div");
        div.style.marginBottom = "10px";

        const p = document.createElement("span");
        let tekst = `${skyldnere[i]} skylder deg ${skyldBeløp[i]} kr`;
        if (skyldStatus[i]) tekst += ` (Betalt: ${betalingsDatoer[i]})`;
        p.textContent = tekst;
        p.style.color = skyldStatus[i] ? "green" : "black";
        p.style.marginRight = "10px";

        const slettKnapp = document.createElement("button");
        slettKnapp.textContent = "Slett";
        slettKnapp.style.marginRight = "5px";
        slettKnapp.onclick = () => slettSkyldner(i);

        const betaltKnapp = document.createElement("button");
        betaltKnapp.textContent = skyldStatus[i] ? "Marker som ikke betalt" : "Marker som betalt";
        betaltKnapp.onclick = () => markerSomBetalt(i);

        div.appendChild(p);
        div.appendChild(slettKnapp);
        div.appendChild(betaltKnapp);

        container.appendChild(div);
    }
}

// ========================================================================
// Toggle skyldner status med betalingsdato
// ========================================================================
function markerSomBetalt(index) {
    if (!skyldStatus[index]) {
        let dato = prompt("Skriv inn betalingsdato (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
        if (dato) {
            betalingsDatoer[index] = dato;
            skyldStatus[index] = true;
        }
    } else {
        skyldStatus[index] = false;
        betalingsDatoer[index] = "";
    }
    lagreData();
    oppdaterListeSkyldnere();
}

// ========================================================================
// Slett skyldner
// ========================================================================
function slettSkyldner(index) {
    skyldnere.splice(index, 1);
    skyldBeløp.splice(index, 1);
    skyldStatus.splice(index, 1);
    betalingsDatoer.splice(index, 1);
    lagreData();
    oppdaterListeSkyldnere();
}

// ========================================================================
// Oppdater liste inntekter/utgifter
// ========================================================================
function oppdaterListe(elementId, liste, beskrivelser, type) {
    let container = document.getElementById(elementId);
    container.innerHTML = liste.map((item, index) => {
        let dato = type === "inntekter" ? inntektsDatoer[index] : utgiftsDatoer[index];
        let beskrivelse = type === "inntekter" ? inntektsBeskrivelser[index] : utgiftsBeskrivelser[index];
        return `<p>${item} kr (Beskrivelse: ${beskrivelse}, Dato: ${dato})
                <button onclick="slettElement(${index}, '${type}')">Slett</button></p>`;
    }).join("");
}

// ========================================================================
// Slett element fra inntekter/utgifter
// Note: deleting from backend requires knowing the backend row id.
// Current UI deletes by index and will delete locally; backend deletion not wired.
// ========================================================================
function slettElement(index, type) {
    if (type === "inntekter") {
        inntekter.splice(index,1); inntektsDatoer.splice(index,1); inntektsBeskrivelser.splice(index,1);
    } else {
        utgifter.splice(index,1); utgiftsDatoer.splice(index,1); utgiftsBeskrivelser.splice(index,1);
    }
    lagreData();
    oppdaterListe(type === "inntekter" ? "inntekter-list":"utgifter-list", 
                  type === "inntekter" ? inntekter : utgifter, 
                  type === "inntekter" ? inntektsBeskrivelser : utgiftsBeskrivelser,
                  type);
}

// ========================================================================
// Lagre alt på localStorage
// ========================================================================
function lagreData() {
    localStorage.setItem("inntekter", JSON.stringify(inntekter));
    localStorage.setItem("utgifter", JSON.stringify(utgifter));
    localStorage.setItem("skyldnere", JSON.stringify(skyldnere));
    localStorage.setItem("skyldBeløp", JSON.stringify(skyldBeløp));
    localStorage.setItem("skyldStatus", JSON.stringify(skyldStatus));
    localStorage.setItem("betalingsDatoer", JSON.stringify(betalingsDatoer));
    localStorage.setItem("egenkapitalHistorikk", JSON.stringify(egenkapitalHistorikk));
    localStorage.setItem("datoer", JSON.stringify(datoer));
    localStorage.setItem("inntektsDatoer", JSON.stringify(inntektsDatoer));
    localStorage.setItem("utgiftsDatoer", JSON.stringify(utgiftsDatoer));
    localStorage.setItem("inntektsBeskrivelser", JSON.stringify(inntektsBeskrivelser));
    localStorage.setItem("utgiftsBeskrivelser", JSON.stringify(utgiftsBeskrivelser));
    localStorage.setItem("andeler", andeler);
    localStorage.setItem("andelVerdi", andelVerdi);
    localStorage.setItem("oppstartstid", oppstartstid);
    localStorage.setItem("avviklingstid", avviklingstid);
}

// ========================================================================
// Beregn budsjett, andeler, egenkapital
// ========================================================================
async function beregnBudsjett() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    const totalInntekter = inntekter.reduce((sum,val)=>sum+val,0);
    const totalUtgifter = utgifter.reduce((sum,val)=>sum+val,0);

    andeler = parseInt(document.getElementById("andeler").value) || 0;
    andelVerdi = parseFloat(document.getElementById("andelVerdi").value) || 0;

    const nettoResultat = totalInntekter - totalUtgifter;
    const totalAndelVerdi = andeler * andelVerdi;
    const egenkapital = nettoResultat + totalAndelVerdi;

    document.getElementById("resultat").innerHTML = `
        <strong>Netto resultat:</strong> ${nettoResultat} kr <br>
        <strong>Totalt andelverdi:</strong> ${totalAndelVerdi} kr <br>
        <strong>Egenkapital:</strong> ${egenkapital} kr`;
    document.getElementById("resultat").style.color = egenkapital<0 ? "red":"green";

    datoer.push(new Date().toLocaleDateString());
    egenkapitalHistorikk.push(egenkapital);

    lagreData();
    oppdaterDiagram(totalInntekter,totalUtgifter);
    oppdaterEgenkapitalGraf();
}

// ========================================================================
// Diagrammer
// ========================================================================
function oppdaterDiagram(inntekter, utgifter) {
    let ctx = document.getElementById("budsjettChart").getContext("2d");
    if(budsjettChart) budsjettChart.destroy();
    budsjettChart = new Chart(ctx,{
        type:"bar",
        data:{
            labels:["Inntekter","Utgifter"],
            datasets:[{
                label:"Økonomisk utvikling",
                data:[inntekter,utgifter],
                backgroundColor:["#4CAF50","#FF5733"],
                borderColor:["#388E3C","#C62828"],
                borderWidth:1
            }]
        },
        options:{responsive:true, scales:{y:{beginAtZero:true,ticks:{callback:value=>value+" kr"}}}}
    });
}

function oppdaterEgenkapitalGraf() {
    let ctx = document.getElementById("egenkapitalChart").getContext("2d");
    if(egenkapitalChart) egenkapitalChart.destroy();
    egenkapitalChart = new Chart(ctx,{
        type:"line",
        data:{
            labels:datoer,
            datasets:[{label:"Egenkapital over tid",data:egenkapitalHistorikk,borderColor:"#2980B9",fill:false}]
        }
    });
}

// ========================================================================
// Eksporter PDF
// ========================================================================
async function eksporterPDF() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("EB Økonomi",10,10);
    doc.setFontSize(12);
    doc.text(document.getElementById("resultat").innerText,10,20);
    doc.addImage(document.getElementById("budsjettChart").toDataURL("image/png"),"PNG",10,40,180,80);
    doc.addPage();
    doc.addImage(document.getElementById("egenkapitalChart").toDataURL("image/png"),"PNG",10,20,180,80);
    doc.save("EB_Okonomi.pdf");
}

// ========================================================================
// Eksporter Excel
// ========================================================================
async function eksporterExcel() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    let ws = XLSX.utils.json_to_sheet([{
        "Inntekt": inntekter.join(", "),
        "Utgifter": utgifter.join(", "),
        "Egenkapital": egenkapitalHistorikk.join(", "),
        "Datoer": datoer.join(", "),
        "Inntektsdatoer": inntektsDatoer.join(", "),
        "Utgiftsdatoer": utgiftsDatoer.join(", "),
        "Inntektsbeskrivelser": inntektsBeskrivelser.join(", "),
        "Utgiftsbeskrivelser": utgiftsBeskrivelser.join(", "),
        "Andeler": andeler,
        "Andelverdi": andelVerdi,
        "Oppstartstid": oppstartstid,
        "Avviklingstid": avviklingstid
    }]);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Økonomi");
    XLSX.writeFile(wb,"EB_Okonomi.xlsx");
}

// ========================================================================
// Nullstill alt
// ========================================================================
function nullstillData() {
    if(!confirm("Er du sikker på at du vil nullstille alle data?")) return;
    localStorage.clear();
    inntekter=[]; utgifter=[]; skyldnere=[]; skyldBeløp=[]; skyldStatus=[]; betalingsDatoer=[];
    egenkapitalHistorikk=[]; datoer=[]; inntektsDatoer=[]; utgiftsDatoer=[]; inntektsBeskrivelser=[]; utgiftsBeskrivelser=[];
    andeler=0; andelVerdi=0; oppstartstid=""; avviklingstid="";

    document.getElementById("andeler").value = "";
    document.getElementById("andelVerdi").value = "";
    document.getElementById("start").value = "";
    document.getElementById("end").value = "";

    oppdaterListe("inntekter-list",inntekter,inntektsBeskrivelser,"inntekter");
    oppdaterListe("utgifter-list",utgifter,utgiftsBeskrivelser,"utgifter");
    oppdaterListeSkyldnere();
    document.getElementById("resultat").innerHTML="";
    document.querySelectorAll("input").forEach(input=>input.value="");
    oppdaterEgenkapitalGraf();
}
