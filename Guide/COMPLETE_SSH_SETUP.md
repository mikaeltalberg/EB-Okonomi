# Complete SSH Setup Guide for GitHub and Cursor

This guide will walk you through creating a new SSH key, connecting it to GitHub, and setting it up for use with Cursor IDE.

---

## 📋 Table of Contents

1. [Create a New SSH Key](#step-1-create-a-new-ssh-key)
2. [Add SSH Key to GitHub](#step-2-add-ssh-key-to-github)
3. [Test SSH Connection](#step-3-test-ssh-connection)
4. [Add Key to ssh-agent](#step-4-add-key-to-ssh-agent)
5. [Connect Repository to GitHub](#step-5-connect-repository-to-github)
6. [Configure Cursor IDE](#step-6-configure-cursor-ide)
7. [Troubleshooting](#troubleshooting)

---

## Step 1: Create a New SSH Key

### 1.1 Open PowerShell or Terminal

Open PowerShell (Windows) or your terminal in Cursor.

### 1.2 Generate New SSH Key

Run this command:

```powershell
ssh-keygen -t ed25519 -C "mikaeltalberg@icloud.com"
```

**What this does:**
- `-t ed25519` - Creates an Ed25519 key (modern, secure, recommended)
- `-C "your_email"` - Adds a comment (your email) to identify the key

### 1.3 Follow the Prompts

You'll be asked several questions:

**Question 1: File Location**
```
Enter file in which to save the key (C:\Users\mikae/.ssh/id_ed25519):
```
- **Action:** Press `Enter` to use the default location
- **Note:** If you already have a key here, it will ask to overwrite. Type `y` and press Enter.

**Question 2: Passphrase**
```
Enter passphrase (empty for no passphrase):
```
- **Action:** Enter a **strong passphrase** (this protects your key)
- **Recommendation:** Use a password you'll remember, or use a password manager
- **Example:** `MyGitHubKey2024!` (but use something unique!)
- **Press Enter** after typing

**Question 3: Confirm Passphrase**
```
Enter same passphrase again:
```
- **Action:** Type the **same passphrase** again
- **Press Enter**

### 1.4 Verify Key Creation

Check that your keys were created:

```powershell
# List SSH directory
ls $env:USERPROFILE\.ssh

# View your public key
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

You should see:
- `id_ed25519` (private key - **NEVER share this!**)
- `id_ed25519.pub` (public key - this is what you'll add to GitHub)

**Expected output of public key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... mikaeltalberg@icloud.com
```

---

## Step 2: Add SSH Key to GitHub

### 2.1 Copy Your Public Key

**Option A: Using PowerShell (Recommended)**
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```
This copies the key to your clipboard automatically.

**Option B: Manual Copy**
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```
Then manually select and copy the entire output (starts with `ssh-ed25519` and ends with your email).

### 2.2 Go to GitHub Settings

1. Open your web browser
2. Go to [GitHub.com](https://github.com) and sign in
3. Click your **profile picture** (top right corner)
4. Click **Settings** from the dropdown menu

### 2.3 Navigate to SSH Keys

1. In the left sidebar, click **SSH and GPG keys**
   - **Direct link:** https://github.com/settings/keys
2. You'll see a list of existing SSH keys (if any)

### 2.4 Add New SSH Key

1. Click the green **"New SSH key"** button (top right)
2. Fill in the form:
   - **Title:** Give it a descriptive name
     - Examples: `My Windows PC`, `Cursor IDE`, `Work Laptop`, `Home Computer`
   - **Key type:** Select **Authentication Key** (default)
   - **Key:** Paste your public key here
     - Right-click and paste, or press `Ctrl+V`
     - Should be one long line starting with `ssh-ed25519`
3. Click **"Add SSH key"** (green button at bottom)
4. GitHub may ask for your password to confirm - enter it

### 2.5 Verify Key is Added

You should see your new key in the list with the title you gave it.

---

## Step 3: Test SSH Connection

### 3.1 Test Connection to GitHub

Run this command:

```powershell
ssh -T git@github.com
```

**First time connection:**
- You'll see: `The authenticity of host 'github.com' can't be established...`
- Type: `yes` and press Enter

**Expected success message:**
```
Hi mikaeltalberg! You've successfully authenticated, but GitHub does not provide shell access.
```

✅ **If you see this, your SSH key is working!**

**If you get "Permission denied":**
- Make sure you added the key to GitHub correctly
- Wait a minute and try again (GitHub needs a moment to sync)
- Check that you copied the entire public key

---

## Step 4: Add Key to ssh-agent

This step makes it so you only enter your passphrase once per session, instead of every time you use git.

### 4.1 Start ssh-agent (if not running)

```powershell
# Check if ssh-agent is running
Get-Service ssh-agent

# If not running, start it
Start-Service ssh-agent
```

### 4.2 Add Your Key to ssh-agent

```powershell
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

**You'll be prompted:**
```
Enter passphrase for C:\Users\mikae\.ssh\id_ed25519:
```

- Enter the **passphrase** you set when creating the key
- Press Enter

**Success message:**
```
Identity added: C:\Users\mikae\.ssh\id_ed25519 (mikaeltalberg@icloud.com)
```

### 4.3 Verify Key is Loaded

```powershell
ssh-add -l
```

You should see:
```
256 SHA256:xxxxx... mikaeltalberg@icloud.com (ED25519)
```

### 4.4 (Optional) Auto-load Key on Startup

To automatically load your key when you start PowerShell, add this to your PowerShell profile:

```powershell
# Check if profile exists
Test-Path $PROFILE

# If it doesn't exist, create it
New-Item -Path $PROFILE -Type File -Force

# Edit the profile
notepad $PROFILE
```

Add this line to the file:
```powershell
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Save and close. Now your key will load automatically when you open PowerShell.

---

## Step 5: Connect Repository to GitHub

### 5.1 Navigate to Your Project

```powershell
cd C:\Users\mikae\OneDrive\Dokumenter\randon.1
```

### 5.2 Get Your GitHub Repository SSH URL

1. Go to your GitHub repository: `https://github.com/mikaeltalberg/EB-Okonomi`
2. Click the green **"Code"** button
3. Select the **"SSH"** tab
4. Copy the URL (looks like: `git@github.com:mikaeltalberg/EB-Okonomi.git`)

### 5.3 Add GitHub as Remote

**If you don't have a remote yet:**
```powershell
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git
```

**If remote already exists:**
```powershell
# Remove old remote
git remote remove origin

# Add new SSH remote
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git
```

### 5.4 Verify Remote is Set

```powershell
git remote -v
```

**Expected output:**
```
origin  git@github.com:mikaeltalberg/EB-Okonomi.git (fetch)
origin  git@github.com:mikaeltalberg/EB-Okonomi.git (push)
```

Both should show the SSH URL (starting with `git@github.com`).

### 5.5 Push to GitHub

```powershell
# Make sure you're on dev branch
git checkout dev

# Push to GitHub
git push -u origin dev
```

**If it asks for passphrase:**
- Enter the passphrase you set when creating the key
- If key is in ssh-agent, it might not ask

**Success message:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
To github.com:mikaeltalberg/EB-Okonomi.git
 * [new branch]      dev -> dev
Branch 'dev' set up to track remote branch 'dev' from 'origin'.
```

✅ **Your code is now on GitHub!**

---

## Step 6: Configure Cursor IDE

Cursor IDE uses git, so it will automatically use your SSH key once it's set up.

### 6.1 Verify Git is Configured in Cursor

1. Open Cursor IDE
2. Open your project: `C:\Users\mikae\OneDrive\Dokumenter\randon.1`
3. Open the terminal in Cursor (`` Ctrl+` `` or View → Terminal)

### 6.2 Test Git Commands in Cursor

In Cursor's terminal, run:

```powershell
# Check git status
git status

# Check remote
git remote -v

# Test SSH connection
ssh -T git@github.com
```

All should work the same as in PowerShell.

### 6.3 Use Git in Cursor

Cursor has built-in Git support:

1. **Source Control Panel:**
   - Click the Source Control icon in the left sidebar (looks like a branch)
   - Or press `Ctrl+Shift+G`

2. **Commit Changes:**
   - Make changes to files
   - Files appear in Source Control panel
   - Click `+` to stage files
   - Enter commit message
   - Click checkmark or press `Ctrl+Enter` to commit

3. **Push/Pull:**
   - Click the `...` menu in Source Control panel
   - Select "Push" or "Pull"
   - Or use the terminal: `git push origin dev`

### 6.4 Cursor Will Use Your SSH Key

- Cursor uses the same git configuration as your system
- Since you've set up SSH, Cursor will automatically use it
- No additional configuration needed!

---

## Troubleshooting

### Problem: "Permission denied (publickey)" when pushing

**Solutions:**
1. Make sure key is added to GitHub (Step 2)
2. Test SSH connection: `ssh -T git@github.com`
3. Make sure key is in ssh-agent: `ssh-add -l`
4. If not loaded, add it: `ssh-add $env:USERPROFILE\.ssh\id_ed25519`

### Problem: "Enter passphrase" every time

**Solution:**
- Add key to ssh-agent (Step 4)
- Or set up auto-load (Step 4.4)

### Problem: "Host key verification failed"

**Solution:**
```powershell
# Remove old GitHub host key
ssh-keygen -R github.com

# Try connecting again
ssh -T git@github.com
# Type "yes" when asked
```

### Problem: "Could not read from remote repository"

**Solutions:**
1. Check repository URL: `git remote -v`
2. Make sure URL uses SSH (starts with `git@github.com`)
3. Verify you have access to the repository on GitHub
4. Check SSH connection: `ssh -T git@github.com`

### Problem: Forgot your passphrase

**Solution:**
- You can't recover it (it's encrypted)
- Create a new key (Step 1) and add it to GitHub (Step 2)
- Remove the old key from GitHub if needed

### Problem: Multiple SSH keys

**Solution:**
- Use `ssh-add -l` to see loaded keys
- Use `ssh-add -D` to remove all keys
- Add the specific key: `ssh-add $env:USERPROFILE\.ssh\id_ed25519`

---

## Quick Reference Commands

```powershell
# View public key
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub

# Copy public key to clipboard
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard

# Test SSH connection
ssh -T git@github.com

# Add key to ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519

# List loaded keys
ssh-add -l

# Check git remote
git remote -v

# Push to GitHub
git push origin dev
```

---

## Security Best Practices

1. ✅ **Use a strong passphrase** - Protects your key if your computer is stolen
2. ✅ **Never share your private key** (`id_ed25519`) - Only share the public key (`.pub`)
3. ✅ **Use different keys for different purposes** - Work vs personal
4. ✅ **Remove old keys from GitHub** - If you create a new key, remove the old one
5. ✅ **Use Ed25519 keys** - More secure than RSA

---

## Summary Checklist

- [ ] Created new SSH key with passphrase
- [ ] Copied public key to clipboard
- [ ] Added SSH key to GitHub (Settings → SSH and GPG keys)
- [ ] Tested SSH connection (`ssh -T git@github.com`)
- [ ] Added key to ssh-agent (`ssh-add`)
- [ ] Connected repository to GitHub (`git remote add origin`)
- [ ] Pushed code to GitHub (`git push -u origin dev`)
- [ ] Verified it works in Cursor IDE

---

## Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify each step was completed correctly
3. Make sure your passphrase is correct
4. Ensure the key is added to both GitHub and ssh-agent

---

**Congratulations!** 🎉 You now have SSH set up for GitHub and Cursor IDE!

