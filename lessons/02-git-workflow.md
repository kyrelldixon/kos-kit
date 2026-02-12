# Lesson 2: Git Workflow

Git tracks changes to your code. Here's the workflow you'll use daily.

## The Basics

```bash
gs                     # Check what's changed (git status)
ga file.txt            # Stage a file for commit
gaa                    # Stage everything
gcm "feat: add login"  # Commit with a message
gpush                  # Push to GitHub
gp                     # Pull latest from GitHub
```

## Branching

```bash
gswc feature/login     # Create and switch to a new branch
gsw main               # Switch back to main
gmm                    # Merge main into your current branch
gb                     # List branches
gbd old-branch         # Delete a branch
```

## Commit Message Format

Use conventional commits:

```
feat: add user login
fix: resolve crash on empty input
docs: update README
chore: bump dependencies
refactor: extract auth logic
```

## Viewing Changes

```bash
gd                     # See unstaged changes
glog                   # One-line commit history
```

## GitHub CLI

```bash
ghprc                  # Create a pull request
ghprv                  # Open PR in browser
ghprs                  # Check PR status
ghprm                  # Merge a PR
```
