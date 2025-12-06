# Subscription System Explained + Dummy Solution

## 🔍 How the System Works

### The Flow:

```
1. User logs in → Supabase creates session
2. App calls checkAuthAndSubscription()
3. Gets user ID from session
4. Queries user_profiles table for subscription_status
5. If status === 'active' → Hide paywall
6. If no subscription → Show subscription prompt
```

### The Code (script.js lines 24-78):

```javascript
// Step 1: Get user session
const { data: { session } } = await supabaseClient.auth.getSession();
const user = session.user; // User ID: 6291ed02-5f73-475b-b6c4-bceb5625b29c

// Step 2: Query user_profiles table
const { data: profile } = await supabaseClient
    .from('user_profiles')  // ← This table needs to exist!
    .select('subscription_status, subscription_end_date')
    .eq('id', user.id)  // Match user's ID
    .single();

// Step 3: Check subscription
const isSubscribed = profile && 
    profile.subscription_status === 'active' && 
    (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date());

// Step 4: Show/hide paywall
if (isSubscribed) {
    hidePaywall();  // ✅ User can access app
} else {
    showSubscriptionPrompt();  // ❌ Show paywall
}
```

---

## 📊 Database Structure Needed

### Table: `user_profiles`

This table stores subscription information for each user.

**Columns:**
- `id` (UUID) - Links to `auth.users.id`
- `email` (TEXT) - User's email
- `subscription_status` (TEXT) - Values: 'active', 'canceled', 'past_due', 'inactive'
- `subscription_id` (TEXT) - Stripe subscription ID (for later)
- `subscription_end_date` (TIMESTAMP) - When subscription expires
- `created_at` (TIMESTAMP) - When profile was created
- `updated_at` (TIMESTAMP) - Last update

---

## 🎯 Dummy Solution: Add Active Subscription

### Step 1: Create the Table

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    subscription_status TEXT DEFAULT 'inactive' 
        CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'inactive')),
    subscription_id TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
```

### Step 2: Add Dummy Subscription for Your User

**Your User ID from screenshot:** `6291ed02-5f73-475b-b6c4-bceb5625b29c`

Run this SQL in Supabase SQL Editor:

```sql
-- Insert dummy subscription for your user
INSERT INTO user_profiles (id, email, subscription_status, subscription_end_date)
VALUES (
    '6291ed02-5f73-475b-b6c4-bceb5625b29c',  -- Your user ID
    'mikaeltalberg@icloud.com',               -- Your email
    'active',                                  -- Dummy: active subscription
    '2025-12-31 23:59:59+00'                  -- Dummy: expires end of 2025
)
ON CONFLICT (id) 
DO UPDATE SET
    subscription_status = 'active',
    subscription_end_date = '2025-12-31 23:59:59+00',
    updated_at = NOW();
```

### Step 3: Test It!

1. Refresh your app: https://mikaeltalberg.github.io/EB-Okonomi
2. Log in again (if needed)
3. The paywall should disappear! ✅
4. You should see the app content

---

## 🔧 Alternative: Quick Test via Supabase Dashboard

### Method 1: Using Table Editor

1. Go to Supabase Dashboard → Table Editor
2. Create new table: `user_profiles`
3. Add columns (see structure above)
4. Insert row manually:
   - `id`: `6291ed02-5f73-475b-b6c4-bceb5625b29c`
   - `email`: `mikaeltalberg@icloud.com`
   - `subscription_status`: `active`
   - `subscription_end_date`: `2025-12-31`

### Method 2: Using SQL Editor (Recommended)

Use the SQL commands above - it's faster and sets up everything correctly.

---

## 📋 What Each Part Does

### Code Breakdown:

**Line 51-55:** Queries the database
```javascript
.from('user_profiles')  // Table name
.select('subscription_status, subscription_end_date')  // What to get
.eq('id', user.id)  // WHERE id = user's ID
.single()  // Expect one result
```

**Line 61-63:** Checks if subscription is valid
```javascript
profile &&  // Profile exists
profile.subscription_status === 'active'  // Status is active
&& (!profile.subscription_end_date || new Date(...) > new Date())  // Not expired
```

**Line 65-72:** Shows/hides paywall
```javascript
if (isSubscribed) {
    hidePaywall();  // ✅ Access granted
} else {
    showSubscriptionPrompt();  // ❌ Show paywall
}
```

---

## 🎯 Quick Reference

**Your User ID:** `6291ed02-5f73-475b-b6c4-bceb5625b29c`  
**Your Email:** `mikaeltalberg@icloud.com`

**To activate subscription:**
1. Create `user_profiles` table (SQL above)
2. Insert row with `subscription_status = 'active'`
3. Refresh app
4. Paywall disappears! ✅

---

## 🔐 Security Note

The RLS (Row Level Security) policies ensure:
- Users can only see their own profile
- Users can only update their own profile
- This is secure even though the query is client-side

---

## ✅ After Adding Dummy Subscription

You'll be able to:
- ✅ See the app content
- ✅ Test all features
- ✅ Use the financial app
- ✅ Everything works!

When you're ready for real subscriptions, you'll:
- Replace dummy data with Stripe webhook updates
- Keep the same table structure
- Just update `subscription_status` from webhooks

---

**Ready to add the dummy subscription?** Follow Step 1 and Step 2 above! 🚀

