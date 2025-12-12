-- ============================================
-- License Users Table Setup
-- ============================================
-- 
-- This table allows license owners to grant access to up to 5 email addresses
-- Run this in Supabase SQL Editor
-- ============================================

-- Create license_users table
CREATE TABLE IF NOT EXISTS public.license_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(license_owner_id, email)
);

-- Enable Row Level Security
ALTER TABLE license_users ENABLE ROW LEVEL SECURITY;

-- Policy: License owners can manage their users
CREATE POLICY "License owners can manage their users"
  ON license_users FOR ALL
  USING (
    auth.uid() = license_owner_id OR
    auth.uid()::text IN (
      SELECT license_owner_id::text FROM license_users 
      WHERE email = (auth.jwt()->>'email') AND is_active = true
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_license_users_owner ON license_users(license_owner_id);
CREATE INDEX IF NOT EXISTS idx_license_users_email ON license_users(email);
CREATE INDEX IF NOT EXISTS idx_license_users_active ON license_users(is_active) WHERE is_active = true;

-- ============================================
-- Done!
-- ============================================
