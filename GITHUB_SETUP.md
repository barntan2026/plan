# GitHub Repository Setup

Your Lesson Planning Tool is now ready to be pushed to GitHub!

## Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository with these settings:
   - **Repository name**: `lesson-planning-tool` (or any name you prefer)
   - **Description**: "A web-based lesson planning tool with Google Sign-In and Firebase integration"
   - **Public/Private**: Choose based on your preference
   - **Initialize with**: Leave unchecked (we already have files)
3. Click **Create repository**

## Step 2: Add Remote and Push

Copy the commands from your new GitHub repo (they look like this):

```bash
cd /Users/tansk/Downloads/plan
git remote add origin https://github.com/YOUR_USERNAME/lesson-planning-tool.git
git branch -M main
git push -u origin main
```

Replace:
- `YOUR_USERNAME` with your GitHub username (e.g., `barntan2026`)
- `lesson-planning-tool` with your repository name

## Step 3: Connecting Locally (One Time)

If you get asked for a password:
1. Use a **Personal Access Token** instead of your password:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a new token with `repo` scope
   - Copy and paste it as the password

Or use SSH keys (recommended):
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "barntan2012@gmail.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
```

## What's Version Controlled

✅ **Tracked Files**:
- All HTML, CSS, and JavaScript files
- Documentation (README.md, FIREBASE_SETUP.md, QUICKSTART.md)
- ICS parser logic
- UI components

❌ **NOT Tracked** (Protected by .gitignore):
- `js/firebase-config.js` - Your Firebase credentials stay private
- `node_modules/` - Dependencies
- `.env` files - Environment variables

## Future Updates

After making changes, commit them:

```bash
cd /Users/tansk/Downloads/plan

# See what changed
git status

# Add changes
git add .

# Commit with a message
git commit -m "Describe your changes here"

# Push to GitHub
git push
```

## Quick Workflow

```bash
# Make changes to files...

# Commit and push in one go
git add . && git commit -m "Feature: Add X" && git push
```

## Verify It Worked

Visit your GitHub repo URL: `https://github.com/YOUR_USERNAME/lesson-planning-tool`

You should see:
- ✅ All your files
- ✅ Green checkmark commits
- ✅ Proper file structure
- ❌ No `firebase-config.js` (protected by .gitignore ✓)

---

**Your code is now version-controlled and safely backed up on GitHub!** 🚀
