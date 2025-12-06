# SSH Setup Quick Start Checklist

Use this as a quick reference while following the full guide.

## 🚀 Quick Steps

### 1. Create SSH Key
```powershell
ssh-keygen -t ed25519 -C "mikaeltalberg@icloud.com"
# Press Enter for default location
# Enter a passphrase (remember it!)
# Confirm passphrase
```

### 2. Copy Public Key
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

### 3. Add to GitHub
- Go to: https://github.com/settings/keys
- Click "New SSH key"
- Paste key, add title, save

### 4. Test Connection
```powershell
ssh -T git@github.com
# Should see: "Hi mikaeltalberg! You've successfully authenticated..."
```

### 5. Add to ssh-agent
```powershell
ssh-add $env:USERPROFILE\.ssh\id_ed25519
# Enter passphrase when asked
```

### 6. Connect Repository
```powershell
git remote add origin git@github.com:mikaeltalberg/EB-Okonomi.git
git push -u origin dev
```

## ✅ Done!

See `COMPLETE_SSH_SETUP.md` for detailed explanations and troubleshooting.

