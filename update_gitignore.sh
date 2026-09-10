# Check if patterns exist, if not append them
grep -q "^.vscode/" .gitignore || echo ".vscode/" >> .gitignore
grep -q "^.idea/" .gitignore || echo ".idea/" >> .gitignore
grep -q "^*.swp" .gitignore || echo "*.swp" >> .gitignore
grep -q "^*.swo" .gitignore || echo "*.swo" >> .gitignore
grep -q "^npm-debug.log*" .gitignore || echo "npm-debug.log*" >> .gitignore
grep -q "^yarn-error.log*" .gitignore || echo "yarn-error.log*" >> .gitignore
grep -q "^.DS_Store" .gitignore || echo ".DS_Store" >> .gitignore
