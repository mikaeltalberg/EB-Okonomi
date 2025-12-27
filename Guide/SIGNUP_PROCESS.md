# Signup Process - Implementation Guide

## Overview

The signup process allows new users to create an account with email and password, which automatically:
1. Creates a user in Supabase Auth
2. Creates a user profile in `user_profiles` table
3. Sets up the user for subscription management

---

## How It Works

### User Flow

1. **User clicks "Registrer deg her"** on the login screen
2. **Signup modal appears** with email and password fields
3. **User fills out form:**
   - Email address
   - Password (minimum 6 characters)
   - Password confirmation
4. **Form submission:**
   - Validates input
   - Creates account in Supabase Auth
   - Creates user profile in database
   - Handles email confirmation (if enabled)

### Two Scenarios

#### Scenario A: Email Confirmation Disabled (Recommended for Testing)

**What happens:**
- User is immediately signed in
- Session is created automatically
- User profile is created
- User can access the app (if they have subscription)

**Code flow:**
```javascript
signUp() → Session created → createUserProfile() → checkAuthAndSubscription()
```

#### Scenario B: Email Confirmation Enabled (Production)

**What happens:**
- User account is created
- Confirmation email is sent
- User must click link in email to confirm
- After confirmation, user can log in

**Code flow:**
```javascript
signUp() → Email sent → User confirms → Login → createUserProfile() → checkAuthAndSubscription()
```

---

## Implementation Details

### 1. Signup Modal (`index.html`)

**Location:** After paywall, before product selection modal

**Features:**
- Email input field
- Password input field
- Password confirmation field
- Form validation
- Error message display
- Link to login if user already has account

### 2. Signup Functions (`script.js`)

#### `showSignupModal()`
- Shows the signup modal
- Clears previous form data
- Hides error messages

#### `hideSignupModal()`
- Hides the signup modal

#### `handleSignup(event)`
- Prevents default form submission
- Validates input:
  - All fields filled
  - Password minimum 6 characters
  - Passwords match
- Calls Supabase `signUp()`
- Creates user profile
- Handles success/error

#### `createUserProfile(userId, email)`
- Creates entry in `user_profiles` table
- Sets `plan_status` to 'inactive'
- Links profile to user ID
- Handles errors gracefully

#### `showSignupError(message)`
- Displays error messages in the modal
- Hides error when message is empty

---

## Database Integration

### User Profile Creation

When a user signs up, a profile is automatically created in `user_profiles`:

```sql
INSERT INTO user_profiles (
    id,           -- User ID from auth.users
    email,        -- User's email
    plan_status,  -- Set to 'inactive'
    created_at,   -- Current timestamp
    updated_at    -- Current timestamp
)
```

### RLS Policy

The `user_profiles` table has an RLS policy that allows users to insert their own profile:

```sql
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
```

This ensures users can only create profiles for themselves.

---

## Supabase Configuration

### Email Confirmation Settings

**To disable email confirmation (for testing):**
1. Go to: https://app.supabase.com/project/bgqsivfeglvhzkftelez/auth/providers
2. Click on "Email" provider
3. Toggle off "Confirm email"
4. Save

**To enable email confirmation (for production):**
1. Same location as above
2. Toggle on "Confirm email"
3. Configure email templates if needed
4. Save

### Email Templates

You can customize the confirmation email:
1. Go to: Authentication → Email Templates
2. Select "Confirm signup"
3. Customize the template
4. Save

---

## Error Handling

### Common Errors

1. **"User already registered"**
   - User tries to sign up with existing email
   - Solution: Show message to log in instead

2. **"Password too short"**
   - Password less than 6 characters
   - Solution: Validation prevents this

3. **"Passwords don't match"**
   - Password and confirmation don't match
   - Solution: Validation prevents this

4. **"Email already exists"**
   - Email is already in use
   - Solution: Show error, suggest login

### Error Display

Errors are shown in the signup modal:
- Red text below the form
- Clear error messages
- Form remains visible for correction

---

## Testing

### Test 1: Successful Signup (Email Confirmation Disabled)

1. Click "Registrer deg her"
2. Fill out form with valid email and password
3. Submit form
4. **Expected:** 
   - Modal closes
   - User is logged in
   - User profile created
   - Subscription prompt shown (since no subscription yet)

### Test 2: Password Validation

1. Try password less than 6 characters
2. **Expected:** Error message shown

### Test 3: Password Mismatch

1. Enter different passwords in both fields
2. **Expected:** Error message shown

### Test 4: Existing Email

1. Try to sign up with email that already exists
2. **Expected:** Error message, suggest to log in

### Test 5: Email Confirmation (if enabled)

1. Sign up with new email
2. Check email for confirmation link
3. Click confirmation link
4. **Expected:** Redirected back, logged in

---

## Integration with Existing Features

### Subscription Flow

After signup:
1. User profile created with `plan_status = 'inactive'`
2. `checkAuthAndSubscription()` runs
3. Since no subscription, subscription prompt is shown
4. User can click "Velg abonnement" to subscribe

### Login Flow

If user already has account:
- Click "Logg inn her" in signup modal
- Modal closes, login prompt shown
- User can log in with email/password or magic link

---

## Security Considerations

### Password Requirements

- Minimum 6 characters (Supabase requirement)
- Can add more requirements if needed:
  - Uppercase letters
  - Numbers
  - Special characters

### Email Validation

- Supabase validates email format
- Prevents duplicate emails
- Can enable email confirmation for extra security

### Profile Creation

- Only happens after successful signup
- User can only create their own profile (RLS policy)
- Profile linked to authenticated user ID

---

## Future Enhancements

### Possible Improvements

1. **Password Strength Indicator**
   - Show password strength as user types
   - Require stronger passwords

2. **Email Verification Status**
   - Show if email is verified
   - Resend verification email option

3. **Social Signup**
   - Add Google/GitHub signup options
   - Already have code, just need to enable

4. **Terms and Conditions**
   - Add checkbox for terms acceptance
   - Link to terms page

5. **Welcome Email**
   - Send welcome email after signup
   - Include getting started guide

---

## Troubleshooting

### Issue: Profile Not Created

**Symptoms:** User signs up but profile doesn't exist

**Solutions:**
- Check browser console for errors
- Verify RLS policies allow profile creation
- Check Supabase logs for database errors
- Ensure `createUserProfile()` is called after signup

### Issue: User Can't Sign Up

**Symptoms:** Signup fails with error

**Solutions:**
- Check Supabase Auth settings
- Verify email provider is enabled
- Check redirect URLs are configured
- Review error message in console

### Issue: Email Confirmation Not Working

**Symptoms:** User doesn't receive confirmation email

**Solutions:**
- Check spam folder
- Verify email provider settings
- Check email templates are configured
- Verify SMTP settings (if using custom SMTP)

---

## Summary

✅ **Implemented:**
- Signup modal UI
- Form validation
- Supabase signup integration
- Automatic user profile creation
- Error handling
- Integration with existing auth flow

✅ **Works with:**
- Existing login system
- Subscription management
- Paywall system
- User profile system

**Status:** Signup process is fully functional and integrated! 🎉

