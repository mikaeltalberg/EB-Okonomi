-- ============================================
-- Setup user_profiles table and dummy subscription
-- ============================================
-- 
-- Run this in Supabase SQL Editor:
-- 1. Go to: Supabase Dashboard → SQL Editor
-- 2. Click "New query"
-- 3. Paste this entire file
-- 4. Click "Run"
-- ============================================

-- Step 1: Create user_profiles table (updated schema for Stripe FDW sync)
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- Add unique constraint on email for email-only profiles (before user signs up)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email) WHERE id IS NULL;

-- Step 2: Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
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

-- Policy: Service role can manage profiles (for sync task)
-- Note: This allows the scheduled sync task to update profiles
CREATE POLICY "Service role can manage profiles"
    ON user_profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_status ON user_profiles(plan_status);

-- Step 5: (Optional) Add dummy active subscription for test user
-- Uncomment and replace with your actual user ID if needed for testing
-- INSERT INTO user_profiles (id, email, plan_status, subscription_end)
-- VALUES (
--     '6291ed02-5f73-475b-b6c4-bceb5625b29c',  -- Your user ID (from Users table)
--     'mikaeltalberg@icloud.com',               -- Your email
--     'active',                                  -- Dummy: active subscription
--     '2025-12-31 23:59:59+00'                  -- Dummy: expires end of 2025
-- )
-- ON CONFLICT (id) 
-- DO UPDATE SET
--     plan_status = 'active',
--     subscription_end = '2025-12-31 23:59:59+00',
--     updated_at = NOW();

-- ============================================
-- Done! 
-- Now refresh your app and the paywall should disappear!
-- ============================================