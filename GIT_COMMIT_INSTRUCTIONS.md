# Git Commit & Push Instructions
## Step-by-Step Guide

---

## **Step 1: Check Current Branch**

Open your terminal/PowerShell in the project directory and run:

```bash
git status
```

This shows:
- Current branch
- Modified files
- Untracked files

---

## **Step 2: Switch to Dev Branch (if not already on it)**

If you're on `master` or another branch, switch to `dev`:

```bash
git checkout dev
```

If the `dev` branch doesn't exist yet, create it:

```bash
git checkout -b dev
```

---

## **Step 3: Stage All Changes**

Add all modified and new files:

```bash
git add .
```

Or add specific files:

```bash
git add setup_user_profiles.sql
git add config.js
git add index.html
git add script.js
git add styles.css
git add supabase/
git add User-Management-Notes/
git add IMPLEMENTATION_COMPLETE.md
git add IMPLEMENTATION_CHECKLIST.md
```

---

## **Step 4: Commit with Descriptive Message**

```bash
git commit -m "Implement subscription system with Stripe Payment Links and Supabase FDW sync

- Updated user_profiles table schema with Stripe fields (stripe_customer_id, product_id, subscription_start/end)
- Renamed subscription_status to plan_status for consistency
- Added product selection modal UI with modern card design
- Implemented subscription check using plan_status with email fallback
- Added license user management (5 emails per subscription)
- Configured STRIPE_PRODUCTS array in config.js for Payment Links
- Added payment return handling with polling mechanism
- Added user settings modal for subscription and license management
- Updated subscription sync query for Stripe FDW integration
- Added comprehensive documentation and implementation guides"
```

---

## **Step 5: Push to Dev Branch**

```bash
git push origin dev
```

If the dev branch doesn't exist on remote yet:

```bash
git push -u origin dev
```

---

## **Alternative: Shorter Commit Message**

If you prefer a shorter message:

```bash
git commit -m "Add subscription system: Stripe Payment Links + Supabase FDW sync

- Updated database schema for Stripe integration
- Added product selection UI and subscription management
- Implemented license user system (5 emails per subscription)
- Added payment flow with automatic polling
- Updated documentation with implementation guides"
```

---

## **Troubleshooting**

### If you get "branch dev does not exist":
```bash
git checkout -b dev
git push -u origin dev
```

### If you get "nothing to commit":
- Check `git status` to see if files are already committed
- Make sure you've saved all files

### If you get merge conflicts:
```bash
git pull origin dev
# Resolve conflicts, then:
git add .
git commit -m "Resolve merge conflicts"
git push origin dev
```

---

## **Quick Copy-Paste Commands**

Copy and paste these commands one by one:

```bash
# 1. Check status
git status

# 2. Switch to dev (or create it)
git checkout dev
# OR if it doesn't exist:
git checkout -b dev

# 3. Stage all changes
git add .

# 4. Commit
git commit -m "Implement subscription system with Stripe Payment Links and Supabase FDW sync

- Updated user_profiles table schema with Stripe fields
- Added product selection modal UI
- Implemented subscription check with email fallback
- Added license user management (5 emails per subscription)
- Configured STRIPE_PRODUCTS array for Payment Links
- Added payment return handling with polling
- Added user settings modal
- Updated sync query for Stripe FDW integration
- Added comprehensive documentation"

# 5. Push
git push origin dev
# OR if first time:
git push -u origin dev
```

---

Good luck! 🚀
