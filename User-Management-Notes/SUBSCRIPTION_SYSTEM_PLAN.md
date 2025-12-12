# Complete Subscription System Plan
## Stripe Payment Links + Supabase FDW Sync

---

## 🎯 **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
├─────────────────────────────────────────────────────────────┤
│ 1. User opens app → Login page                               │
│ 2. Clicks "Sign up" → Signup page with product selection     │
│ 3. Chooses plan → Redirects to Stripe Payment Link           │
│ 4. Completes payment in Stripe                              │
│ 5. Returns to app → App checks Supabase for active status   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              BACKEND SYNC (AUTOMATIC)                        │
├─────────────────────────────────────────────────────────────┤
│ Stripe (Source of Truth)                                     │
│     ↓                                                        │
│ Stripe FDW (Foreign Data Wrapper)                           │
│     ↓                                                        │
│ Supabase Scheduled Task (every 5 min)                       │
│     ↓                                                        │
│ user_profiles table (Source of Truth for App)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    APP CODE (MINIMAL)                        │
├─────────────────────────────────────────────────────────────┤
│ Only checks: user_profiles.plan_status = 'active'           │
│ No Stripe API calls                                          │
│ No webhook handling                                          │
│ No maintenance required                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 **STEP 1: Create Source of Truth Table in Supabase**

### 1.1 Create `user_profiles` Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create user_profiles table (source of truth for app)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  product_id TEXT,
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  plan_status TEXT DEFAULT 'inactive' 
    CHECK (plan_status IN ('active', 'canceled', 'past_due', 'inactive', 'trialing')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile (for settings)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: System can insert/update (for sync task)
-- Note: This requires service role key, which is safe in scheduled tasks
CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 1.2 Create Index for Performance

```sql
-- Index for fast email lookups during sync
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_status ON user_profiles(plan_status);
```

---

## 📋 **STEP 2: Set Up Stripe FDW Sync Query**

### 2.1 Ensure Stripe FDW is Configured

You mentioned you've already created a SQL query with example results. The FDW should be set up to access:
- `stripe_fdw.customers`
- `stripe_fdw.subscriptions`

### 2.2 Create Sync Query

This query extracts subscription data from Stripe FDW and syncs it to `user_profiles`:

```sql
-- Sync query: Stripe FDW → user_profiles table
INSERT INTO public.user_profiles (
  id,
  email,
  stripe_customer_id,
  stripe_subscription_id,
  product_id,
  subscription_start,
  subscription_end,
  plan_status
)
SELECT
  COALESCE(u.id, gen_random_uuid()) as id,  -- Use existing auth user or create placeholder
  stripe_data.email,
  stripe_data.stripe_customer_id,
  stripe_data.subscription_id,
  stripe_data.product_id,
  stripe_data.subscription_start,
  stripe_data.subscription_end,
  CASE 
    WHEN stripe_data.subscription_status = 'active' 
      AND stripe_data.subscription_end > NOW() 
    THEN 'active'
    WHEN stripe_data.subscription_status = 'canceled' THEN 'canceled'
    WHEN stripe_data.subscription_status = 'past_due' THEN 'past_due'
    WHEN stripe_data.subscription_status = 'trialing' THEN 'trialing'
    ELSE 'inactive'
  END as plan_status
FROM (
  SELECT
    c.email,
    c.id as stripe_customer_id,
    s.id as subscription_id,
    (s.attrs->'items'->'data'->0->'price'->>'product') as product_id,
    to_timestamp((s.attrs->>'start_date')::bigint) as subscription_start,
    to_timestamp((s.attrs->'items'->'data'->0->>'current_period_end')::bigint) as subscription_end,
    s.attrs->>'status' as subscription_status
  FROM stripe_fdw.customers c
  JOIN stripe_fdw.subscriptions s ON s.customer = c.id
  WHERE s.attrs->>'status' IN ('active', 'trialing', 'past_due', 'canceled')
) as stripe_data
LEFT JOIN auth.users u ON u.email = stripe_data.email

ON CONFLICT (id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  product_id = EXCLUDED.product_id,
  subscription_start = EXCLUDED.subscription_start,
  subscription_end = EXCLUDED.subscription_end,
  plan_status = EXCLUDED.plan_status,
  updated_at = NOW();

-- Also handle case where email matches but no auth user exists yet
-- (User will be created when they sign up)
INSERT INTO public.user_profiles (
  email,
  stripe_customer_id,
  stripe_subscription_id,
  product_id,
  subscription_start,
  subscription_end,
  plan_status
)
SELECT
  stripe_data.email,
  stripe_data.stripe_customer_id,
  stripe_data.subscription_id,
  stripe_data.product_id,
  stripe_data.subscription_start,
  stripe_data.subscription_end,
  CASE 
    WHEN stripe_data.subscription_status = 'active' 
      AND stripe_data.subscription_end > NOW() 
    THEN 'active'
    WHEN stripe_data.subscription_status = 'canceled' THEN 'canceled'
    WHEN stripe_data.subscription_status = 'past_due' THEN 'past_due'
    WHEN stripe_data.subscription_status = 'trialing' THEN 'trialing'
    ELSE 'inactive'
  END as plan_status
FROM (
  SELECT
    c.email,
    c.id as stripe_customer_id,
    s.id as subscription_id,
    (s.attrs->'items'->'data'->0->'price'->>'product') as product_id,
    to_timestamp((s.attrs->>'start_date')::bigint) as subscription_start,
    to_timestamp((s.attrs->'items'->'data'->0->>'current_period_end')::bigint) as subscription_end,
    s.attrs->>'status' as subscription_status
  FROM stripe_fdw.customers c
  JOIN stripe_fdw.subscriptions s ON s.customer = c.id
  WHERE s.attrs->>'status' IN ('active', 'trialing', 'past_due', 'canceled')
) as stripe_data
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE email = stripe_data.email
)
ON CONFLICT (email) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  product_id = EXCLUDED.product_id,
  subscription_start = EXCLUDED.subscription_start,
  subscription_end = EXCLUDED.subscription_end,
  plan_status = EXCLUDED.plan_status,
  updated_at = NOW();
```

**Note:** The above query handles two scenarios:
1. User exists in `auth.users` → Links by email and uses their UUID
2. User doesn't exist yet → Creates profile with email only (will be linked when they sign up)

---

## 📋 **STEP 3: Set Up Automatic Sync (Scheduled Task)**

### 3.1 Create Supabase Scheduled Task

In Supabase Dashboard:
1. Go to **Database → Scheduled Tasks** (or **Database → Cron Jobs**)
2. Click **"New Task"** or **"Create Cron Job"**
3. Configure:

**Name:** `sync_stripe_subscriptions`

**Schedule:** `*/5 * * * *` (every 5 minutes)

**SQL Command:**
```sql
-- Use the sync query from Step 2.2
-- (Paste the entire INSERT ... ON CONFLICT query here)
```

**Or use pg_cron extension:**
```sql
SELECT cron.schedule(
  'sync-stripe-subscriptions',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  -- Paste sync query here
  $$
);
```

### 3.2 Verify Sync is Working

After setting up, check:
```sql
-- Check recent sync activity
SELECT email, plan_status, subscription_end, updated_at 
FROM user_profiles 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 📋 **STEP 4: Create Product Selection Page**

### 4.1 Update HTML: Add Signup/Product Selection Page

Add this to `index.html` (or create separate `signup.html`):

```html
<!-- Product Selection Modal/Page -->
<div id="product-selection" class="product-selection hidden">
    <div class="product-selection-content">
        <h2>Velg ditt abonnement</h2>
        <div class="products-grid" id="products-container">
            <!-- Products will be loaded here -->
        </div>
        <button onclick="closeProductSelection()" class="close-button">Lukk</button>
    </div>
</div>
```

### 4.2 Add CSS for Product Selection

Add to `styles.css`:

```css
.product-selection {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.product-selection.hidden {
    display: none;
}

.product-selection-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
}

.product-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    transition: all 0.3s;
    cursor: pointer;
}

.product-card:hover {
    border-color: #4CAF50;
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.product-card.selected {
    border-color: #4CAF50;
    background: #f0f8f0;
}

.product-name {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.product-price {
    font-size: 2rem;
    color: #4CAF50;
    margin: 1rem 0;
}

.product-description {
    color: #666;
    margin-bottom: 1rem;
    min-height: 60px;
}

.choose-button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    width: 100%;
    margin-top: 1rem;
}

.choose-button:hover {
    background: #45a049;
}
```

### 4.3 Configure Products in Config

Add to `config.js`:

```javascript
// Stripe Payment Links Configuration
const STRIPE_PRODUCTS = [
    {
        id: 'prod_TYoGOyD47FMCd7',  // Your Stripe Product ID
        name: 'Årlig abonnement',
        price: '10 000 kr',
        description: 'Full tilgang til appen i ett år',
        paymentLink: 'https://buy.stripe.com/...',  // Your Stripe Payment Link URL
        interval: 'year'
    },
    {
        id: 'prod_XXXXX',  // Your second product ID
        name: 'Månedlig abonnement',
        price: '1 000 kr',
        description: 'Full tilgang til appen per måned',
        paymentLink: 'https://buy.stripe.com/...',  // Your second Payment Link URL
        interval: 'month'
    }
];
```

### 4.4 Update JavaScript: Product Selection Functions

Add to `script.js`:

```javascript
// ===========================
// PRODUCT SELECTION
// ===========================

// Show product selection page
function showProductSelection() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    
    STRIPE_PRODUCTS.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}</div>
            <div class="product-description">${product.description}</div>
            <button class="choose-button" onclick="selectProduct('${product.paymentLink}')">
                Velg
            </button>
        `;
        container.appendChild(card);
    });
    
    document.getElementById('product-selection').classList.remove('hidden');
}

// Close product selection
function closeProductSelection() {
    document.getElementById('product-selection').classList.add('hidden');
}

// Select product and redirect to Stripe Payment Link
function selectProduct(paymentLink) {
    // Redirect to Stripe Payment Link
    window.location.href = paymentLink;
}

// Update signup flow
function showSignupPage() {
    showProductSelection();
}
```

---

## 📋 **STEP 5: Update User Journey Flow**

### 5.1 Update Login/Signup UI

Update `index.html` paywall section:

```html
<div id="paywall" class="paywall">
    <div class="paywall-content">
        <h2>🔒 Abonnement påkrevd</h2>
        <p>For å få tilgang må du logge inn med din konto.</p>
        
        <div id="login-buttons" style="display: none;">
            <button onclick="signInWithEmail()" class="oauth-button">
                📧 Logg inn med E-post
            </button>
            <p style="margin-top: 1rem;">
                Har du ikke konto? 
                <a href="#" onclick="showProductSelection(); return false;" style="color: #4CAF50; text-decoration: underline;">
                    Registrer deg her
                </a>
            </p>
        </div>
        
        <div id="user-info" style="display: none;">
            <p>Logget inn som: <span id="user-email"></span></p>
            <button onclick="signOut()" class="signout-button">Logg ut</button>
        </div>
        
        <div id="subscription-prompt" style="display: none;">
            <p>Du må ha et aktivt abonnement for å bruke denne tjenesten.</p>
            <button onclick="showProductSelection()" class="subscribe-button">
                Velg abonnement
            </button>
        </div>
    </div>
</div>
```

### 5.2 Update Subscription Check Logic

The existing `checkAuthAndSubscription()` function should work, but update it to check `plan_status`:

```javascript
// Update subscription check (already in script.js, just verify)
async function checkAuthAndSubscription() {
    // ... existing code ...
    
    // Check subscription status from user profile
    const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('plan_status, subscription_end')
        .eq('id', user.id)
        .single();

    // Also check by email (in case user hasn't signed up yet but has subscription)
    if (profileError && profileError.code === 'PGRST116') {
        const { data: profileByEmail } = await supabaseClient
            .from('user_profiles')
            .select('plan_status, subscription_end')
            .eq('email', user.email)
            .single();
        
        if (profileByEmail) {
            // Link the profile to the user ID
            await supabaseClient
                .from('user_profiles')
                .update({ id: user.id })
                .eq('email', user.email);
            
            profile = profileByEmail;
        }
    }

    const isSubscribed = profile && 
        profile.plan_status === 'active' && 
        (!profile.subscription_end || new Date(profile.subscription_end) > new Date());

    if (isSubscribed) {
        hidePaywall();
        showUserInfo(user.email);
    } else {
        showSubscriptionPrompt(user.email);
    }
}
```

### 5.3 Handle Return from Stripe Payment Link

Update the page load handler to check for successful payment:

```javascript
document.addEventListener("DOMContentLoaded", async () => {
    // Check for return from Stripe Payment Link
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    
    if (paymentSuccess === 'true') {
        // Payment completed - wait a moment for sync, then check status
        console.log("Payment successful, waiting for sync...");
        setTimeout(async () => {
            await checkAuthAndSubscription();
            // Remove query param
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 10000); // Wait 10 seconds for sync (or poll)
        return;
    }
    
    // ... rest of existing code ...
});
```

**Note:** Since sync runs every 5 minutes, you might want to add a polling mechanism:

```javascript
// Poll for subscription status after payment
async function pollForSubscription(maxAttempts = 12) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        await checkAuthAndSubscription();
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('plan_status')
                .eq('id', session.user.id)
                .single();
            
            if (profile && profile.plan_status === 'active') {
                console.log("Subscription active!");
                return;
            }
        }
    }
    alert("Betalingen er registrert, men det kan ta noen minutter før tilgangen aktiveres.");
}
```

---

## 📋 **STEP 6: User Settings & License Management**

### 6.1 Create User Settings Table

```sql
-- Table for license management (multiple users per license)
CREATE TABLE IF NOT EXISTS public.license_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(license_owner_id, email)
);

-- RLS Policies
ALTER TABLE license_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "License owners can manage their users"
  ON license_users FOR ALL
  USING (
    auth.uid() = license_owner_id OR
    auth.uid()::text IN (
      SELECT email FROM license_users 
      WHERE email = auth.jwt()->>'email' AND is_active = true
    )
  );
```

### 6.2 Add User Settings UI

Add to `index.html`:

```html
<!-- User Settings Button (top right when logged in) -->
<div id="user-settings" class="user-settings hidden">
    <button onclick="showSettingsModal()" class="settings-button">
        ⚙️ Innstillinger
    </button>
</div>

<!-- Settings Modal -->
<div id="settings-modal" class="modal hidden">
    <div class="modal-content">
        <h2>Kontoinnstillinger</h2>
        
        <!-- Subscription Info -->
        <div class="settings-section">
            <h3>Abonnement</h3>
            <p id="subscription-info">Laster...</p>
            <button onclick="cancelSubscription()" class="cancel-button">
                Avslutt abonnement
            </button>
        </div>
        
        <!-- License Users -->
        <div class="settings-section">
            <h3>Gi tilgang til e-postadresser (maks 5)</h3>
            <div id="license-users-list"></div>
            <input type="email" id="new-license-email" placeholder="E-postadresse">
            <button onclick="addLicenseUser()">Legg til</button>
        </div>
        
        <button onclick="closeSettingsModal()">Lukk</button>
    </div>
</div>
```

### 6.3 Add Settings Functions

Add to `script.js`:

```javascript
// ===========================
// USER SETTINGS
// ===========================

async function showSettingsModal() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    // Load subscription info
    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (profile) {
        document.getElementById('subscription-info').innerHTML = `
            Status: ${profile.plan_status}<br>
            Slutter: ${profile.subscription_end ? new Date(profile.subscription_end).toLocaleDateString() : 'N/A'}
        `;
    }
    
    // Load license users
    await loadLicenseUsers();
    
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

async function loadLicenseUsers() {
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
                ${user.email} 
                <button onclick="removeLicenseUser('${user.id}')">Fjern</button>
            `;
            container.appendChild(div);
        });
    }
    
    // Show count
    const count = users ? users.length : 0;
    container.innerHTML += `<p>Antall: ${count}/5</p>`;
}

async function addLicenseUser() {
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
    const { error } = await supabaseClient
        .from('license_users')
        .update({ is_active: false })
        .eq('id', userId);
    
    if (!error) {
        await loadLicenseUsers();
    }
}

async function cancelSubscription() {
    if (!confirm('Er du sikker på at du vil avslutte abonnementet?')) return;
    
    // Note: Actual cancellation should be done via Stripe Customer Portal
    // For now, we'll just show a message
    alert('For å avslutte abonnementet, vennligst kontakt support eller bruk Stripe Customer Portal.');
    
    // TODO: Redirect to Stripe Customer Portal
    // window.location.href = 'https://billing.stripe.com/p/login/...';
}

// Update checkAuthAndSubscription to also check license_users
async function checkAuthAndSubscription() {
    // ... existing code ...
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        showLoginPrompt();
        return;
    }
    
    // Check if user has direct subscription
    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('plan_status, subscription_end')
        .eq('id', session.user.id)
        .single();
    
    let hasAccess = false;
    
    if (profile && profile.plan_status === 'active') {
        hasAccess = true;
    } else {
        // Check if user is granted access via license
        const { data: license } = await supabaseClient
            .from('license_users')
            .select('license_owner_id')
            .eq('email', session.user.email)
            .eq('is_active', true)
            .single();
        
        if (license) {
            // Check if license owner has active subscription
            const { data: ownerProfile } = await supabaseClient
                .from('user_profiles')
                .select('plan_status')
                .eq('id', license.license_owner_id)
                .single();
            
            if (ownerProfile && ownerProfile.plan_status === 'active') {
                hasAccess = true;
            }
        }
    }
    
    if (hasAccess) {
        hidePaywall();
        showUserInfo(session.user.email);
        document.getElementById('user-settings').classList.remove('hidden');
    } else {
        showSubscriptionPrompt(session.user.email);
    }
}
```

---

## 📋 **STEP 7: Configure Stripe Payment Links**

### 7.1 Create Payment Links in Stripe Dashboard

1. Go to Stripe Dashboard → **Products** → Select your product
2. Click **"Create payment link"**
3. Configure:
   - **Price:** Select your price
   - **After payment:** Set redirect URL to:
     ```
     https://your-domain.com/?payment_success=true
     ```
   - **Customer information:** Require email and name
4. Copy the Payment Link URL
5. Add it to `config.js` in `STRIPE_PRODUCTS` array

### 7.2 Set Up Customer Portal (Optional, for cancellation)

1. Go to Stripe Dashboard → **Settings → Billing → Customer portal**
2. Enable Customer Portal
3. Configure cancellation settings
4. Get the portal URL for use in settings

---

## 📋 **STEP 8: Testing Checklist**

- [ ] Stripe FDW is configured and accessible
- [ ] `user_profiles` table created with RLS policies
- [ ] Sync query tested manually in SQL Editor
- [ ] Scheduled task created and running
- [ ] Products configured in `config.js` with Payment Links
- [ ] Product selection page displays correctly
- [ ] Clicking "Choose" redirects to Stripe Payment Link
- [ ] After payment, user returns to app
- [ ] Subscription syncs within 5 minutes (or polling works)
- [ ] Paywall disappears for active subscribers
- [ ] User settings page works
- [ ] License user management works (add/remove)
- [ ] Subscription cancellation flow works

---

## 🎯 **Summary: What Your App Code Does**

### ✅ **App Code Responsibilities:**
1. **Authentication:** Login/signup via Supabase Auth
2. **Subscription Check:** Query `user_profiles.plan_status = 'active'`
3. **Product Display:** Show products from `config.js`
4. **Redirect:** Send user to Stripe Payment Link
5. **UI:** Show/hide paywall based on subscription status

### ❌ **App Code Does NOT:**
1. ❌ Call Stripe API directly
2. ❌ Handle webhooks
3. ❌ Sync subscription data
4. ❌ Manage Stripe-Supabase communication
5. ❌ Require maintenance for backend sync

### 🔄 **Backend (Supabase) Responsibilities:**
1. **Stripe FDW:** Connects to Stripe data
2. **Scheduled Task:** Syncs every 5 minutes
3. **Database:** Stores subscription status
4. **RLS:** Secures user data

---

## 🚀 **Next Steps**

1. **Set up Stripe Payment Links** for your products
2. **Run SQL** to create tables and sync query
3. **Create scheduled task** in Supabase
4. **Update frontend** with product selection
5. **Test full flow** with test payment
6. **Deploy** when ready!

---

## 💡 **Future Enhancements**

- **Real-time sync:** Use Stripe webhooks + Edge Function for instant updates (optional)
- **Email notifications:** Send welcome email when subscription activates
- **Usage tracking:** Track which license users are active
- **Admin dashboard:** View all subscriptions and users
- **Trial periods:** Handle trial subscriptions in sync query

---

**Need help implementing any step? Let me know!** 🚀
