#!/bin/bash
# Script to push Production folder to GitHub

set -e

echo "🚀 Pushing to GitHub..."

# Navigate to Production folder
cd "$(dirname "$0")/.."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Add remote if not already added
if ! git remote | grep -q 'origin'; then
    echo "🔗 Adding remote repository..."
    git remote add origin https://github.com/CodyCarmichaelMPH/DIP.git
fi

# Add all files
echo "📝 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Update DIP application"
fi
git commit -m "$commit_msg" || echo "No changes to commit"

# Push
echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo "✅ Done! Visit https://github.com/CodyCarmichaelMPH/DIP to see your repository"
echo "📊 GitHub Actions will automatically deploy to https://codycarmic haelmph.github.io/DIP/"

