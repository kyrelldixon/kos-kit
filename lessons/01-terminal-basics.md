# Lesson 1: Terminal Basics

Your terminal is the command center for everything. Here's what you need to know.

## Your Shell: Zsh

kos-kit sets up Zsh with a curated config. Key features:

- **Starship prompt** — shows directory + git branch, minimal and fast
- **eza** — modern `ls` replacement with colors and git awareness
- **fzf** — fuzzy finder for searching files, history, and more
- **zoxide** — smarter `cd` that learns your habits

## Essential Commands

```bash
# Navigation
cd ~/projects          # Go to a directory
z projects             # Smarter cd (zoxide — learns from usage)
ll                     # List files with details
tree                   # Show directory tree

# Files
cat file.txt           # Print file contents
bat file.txt           # Same but with syntax highlighting
mkdir my-project       # Create a directory
mv old.txt new.txt     # Rename/move a file
cp file.txt backup/    # Copy a file
```

## Getting Help

```bash
tldr git               # Quick examples for any command
man git                # Full manual (press q to quit)
```

## Next Steps

Run `kos cheatsheet` to see all available aliases and shortcuts.
