# Database Setup - Step 2

## Overview

This step sets up the `user_profiles` table in Supabase to manage user subscriptions. This table stores:
- User subscription status
- Stripe customer and subscription IDs
- Subscription start/end dates
- Plan status (active, inactive, canceled, etc.)

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to: https://app.supabase.com
2. Sign in to your account
3. Select your project: `bgqsivfeglvhzkftelez` (or your project name)

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (top right)

### Step 3: Run the Setup Script

1. Open the file `setup_user_profiles.sql` in your project
2. **Copy the entire contents** of the file (Ctrl+A, Ctrl+C)
3. **Paste it into the SQL Editor** in Supabase (Ctrl+V)
4. Click **"Run"** button (or press Ctrl+Enter)

### Step 4: Verify the Table Was Created

1. In Supabase Dashboard, go to **"Table Editor"** (left sidebar)
2. You should see a new table called **`user_profiles`**
3. Click on it to see the columns:
   - `id` (UUID, primary key)
   - `email` (text)
   - `stripe_customer_id` (text, nullable)
   - `stripe_subscription_id` (text, nullable)
   - `product_id` (text, nullable)
   - `subscription_start` (timestamp, nullable)
   - `subscription_end` (timestamp, nullable)
   - `plan_status` (text, default: 'inactive')
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Step 5: Verify RLS Policies

1. In Supabase Dashboard, go to **"Authentication"** → **"Policies"**
2. Select the **`user_profiles`** table from the dropdown
3. You should see these policies:
   - ✅ "Users can view own profile"
   - ✅ "Users can update own profile"
   - ✅ "Users can insert own profile"
   - ✅ "Service role can manage profiles"

---

## Testing the Setup

### Test 1: Check if Table Exists

Run this in Supabase SQL Editor:

```sql
SELECT * FROM user_profiles LIMIT 1;
```

Should return: Empty result (no rows) - this is normal if you haven't added any users yet.

### Test 2: Verify RLS is Enabled

Run this in Supabase SQL Editor:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';
```

Should show: `rowsecurity = true`

---

## Optional: Add Test User Profile

If you want to test the subscription system with your own account:

### Step 1: Get Your User ID

1. In Supabase Dashboard, go to **"Authentication"** → **"Users"**
2. Find your user (by email: `mikaeltalberg@icloud.com`)
3. Copy your **User ID** (UUID format, like: `6291ed02-5f73-475b-b6c4-bceb5625b29c`)

### Step 2: Add Test Profile

Run this in Supabase SQL Editor (replace with your actual User ID):

```sql
INSERT INTO user_profiles (id, email, plan_status, subscription_end)
VALUES (
    'YOUR_USER_ID_HERE',           -- Replace with your User ID
    'mikaeltalberg@icloud.com',    -- Your email
    'active',                       -- Active subscription
    '2025-12-31 23:59:59+00'       -- Expires end of 2025
)
ON CONFLICT (id) 
DO UPDATE SET
    plan_status = 'active',
    subscription_end = '2025-12-31 23:59:59+00',
    updated_at = NOW();
```

### Step 3: Test in Your App

1. Make sure you're logged in to your app
2. The paywall should disappear if your profile has `plan_status = 'active'`
3. Check the browser console for any errors

---

## What This Setup Does

✅ **Creates `user_profiles` table**
- Stores user subscription information
- Links to Supabase Auth users via `id`

✅ **Enables Row Level Security (RLS)**
- Users can only see/edit their own profile
- Service role can manage all profiles (for sync tasks)

✅ **Creates indexes**
- Improves query performance
- Indexes on `email` and `plan_status`

✅ **Sets up policies**
- Users can read their own profile
- Users can update their own profile
- Users can create their own profile
- Service role has full access (for backend tasks)

---

## Troubleshooting

### Error: "relation already exists"
- The table already exists - this is fine
- The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run again

### Error: "permission denied"
- Make sure you're running this as the project owner
- Check that you have the correct permissions in Supabase

### Error: "policy already exists"
- The policies already exist - this is fine
- The script will skip creating duplicates

### Table not showing in Table Editor
- Refresh the page
- Check that you're looking at the correct project

### RLS policies not working
- Make sure RLS is enabled: `ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;`
- Verify policies are created correctly
- Check that users are authenticated when accessing the table

---

## Next Steps

After completing this setup:

1. ✅ Database is ready for subscriptions
2. ✅ Users can have profiles created automatically
3. ✅ Subscription status can be checked
4. ✅ Ready for Stripe integration (if you add it later)

**Ready for Step 3?** Once the database is set up, we can:
- Test the subscription check in your app
- Configure production redirect URLs in Supabase
- Prepare for deployment

---

## Quick Reference

**Supabase Dashboard:**
- SQL Editor: https://app.supabase.com/project/_/sql
- Table Editor: https://app.supabase.com/project/_/editor
- Authentication → Users: https://app.supabase.com/project/_/auth/users
- Authentication → Policies: https://app.supabase.com/project/_/auth/policies

**Your Project:**
- Project URL: `https://bgqsivfeglvhzkftelez.supabase.co`
- Dashboard: https://app.supabase.com/project/bgqsivfeglvhzkftelez

---

**Let me know when you've completed the database setup, and we can move to Step 3!** 🚀

