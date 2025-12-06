# Fresh Git Setup - Step by Step

## What Happened

The error `fatal: not a git repository` means there's no `.git` folder. This is because we deleted it earlier when cleaning out git.

## Solution: Start Fresh

We'll initialize a brand new git repository and set it up properly.

---

## Step-by-Step Commands

### Step 1: Verify Git is Removed (Clean Slate)
```powershell
git status
```
**Expected:** `fatal: not a git repository` ✅ (This is good - means it's clean)

### Step 2: Initialize New Git Repository
```powershell
git init
```
**Expected:** `Initialized empty Git repository in C:/Users/mikae/OneDrive/Dokumenter/randon.1/.git/`

### Step 3: Check What Files We Have
```powershell
git status
```
**Expected:** Shows all your files as "untracked"

### Step 4: Add All Files
```powershell
git add .
```
**Expected:** No output (silent success)

### Step 5: Create Initial Commit
```powershell
git commit -m "Initial commit: EB Okonomi app with Supabase OAuth"
```
**Expected:** Shows files being committed

### Step 6: Create Dev Branch
```powershell
git checkout -b dev
```
**Expected:** `Switched to a new branch 'dev'`

### Step 7: Add GitHub Remote
```powershell
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git
```

### Step 8: Verify Remote
```powershell
git remote -v
```
**Expected:** Shows your GitHub repository URL

### Step 9: Push to GitHub (Force Push Since It's Fresh)
```powershell
git push -u origin dev --force
```
**Expected:** Uploads your code to GitHub

---

## Complete Command Sequence

Copy and paste these one at a time:

```powershell
# 1. Initialize
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit: EB Okonomi app with Supabase OAuth"

# 4. Create dev branch
git checkout -b dev

# 5. Add remote
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git

# 6. Verify remote
git remote -v

# 7. Push to GitHub
git push -u origin dev --force
```

---

## What Each Command Does

- `git init` - Creates a new git repository
- `git add .` - Stages all your files for commit
- `git commit` - Saves a snapshot of your code
- `git checkout -b dev` - Creates and switches to dev branch
- `git remote add` - Connects to GitHub
- `git push --force` - Uploads (force because we're overwriting GitHub's version)

---

## After Setup: Normal Workflow

Once set up, your normal workflow will be:

```powershell
# 1. Make changes to files

# 2. Check status
git status

# 3. Add changes
git add .

# 4. Commit
git commit -m "Description of changes"

# 5. Push
git push origin dev
```

---

## Troubleshooting

**If you get "remote already exists":**
```powershell
git remote remove origin
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git
```

**If push asks for passphrase:**
- Enter your SSH key passphrase
- Or make sure key is in ssh-agent: `ssh-add $env:USERPROFILE\.ssh\id_ed25519`

