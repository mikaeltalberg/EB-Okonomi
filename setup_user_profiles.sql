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

-- Step 1: Create user_profiles table
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

-- Step 4: Add dummy active subscription for test user
-- Replace the user ID with your actual user ID from Supabase Users table
INSERT INTO user_profiles (id, email, subscription_status, subscription_end_date)
VALUES (
    '6291ed02-5f73-475b-b6c4-bceb5625b29c',  -- Your user ID (from Users table)
    'mikaeltalberg@icloud.com',               -- Your email
    'active',                                  -- Dummy: active subscription
    '2025-12-31 23:59:59+00'                  -- Dummy: expires end of 2025
)
ON CONFLICT (id) 
DO UPDATE SET
    subscription_status = 'active',
    subscription_end_date = '2025-12-31 23:59:59+00',
    updated_at = NOW();

-- ============================================
-- Done! 
-- Now refresh your app and the paywall should disappear!
-- ============================================

