-- ============================================
-- Stripe FDW → user_profiles Sync Query
-- ============================================
-- 
-- This query syncs subscription data from Stripe FDW to user_profiles table
-- Run this manually or set it up as a scheduled task (every 5 minutes)
--
-- Prerequisites:
-- 1. Stripe FDW must be configured and accessible
-- 2. user_profiles table must exist (see setup_user_profiles.sql)
-- ============================================

-- Sync subscriptions: Match by email to auth.users, or create email-only profiles
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
  COALESCE(u.id, gen_random_uuid()) as id,
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

-- Handle emails that don't have auth.users yet (will be linked when user signs up)
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

-- ============================================
-- Optional: Mark expired subscriptions as inactive
-- ============================================
UPDATE public.user_profiles
SET 
  plan_status = 'inactive',
  updated_at = NOW()
WHERE plan_status = 'active'
  AND subscription_end IS NOT NULL
  AND subscription_end < NOW();
