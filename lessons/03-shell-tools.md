# Lesson 3: Shell Power Tools

kos-kit installs tools that make the terminal dramatically more productive.

## Search & Find

```bash
# Find files by name
fd "login"             # Find files matching "login"
fd -e ts               # Find all TypeScript files

# Search file contents
rg "TODO"              # Search all files for "TODO"
rg "function" -t ts    # Search only TypeScript files

# Fuzzy find anything
fzf                    # Interactive fuzzy file finder
ctrl+r                 # Fuzzy search command history (via fzf/atuin)
```

## Better Defaults

| Tool | Replaces | What's Better |
|------|----------|---------------|
| eza | ls | Colors, git status, tree view |
| bat | cat | Syntax highlighting, line numbers |
| fd | find | Faster, simpler syntax, respects .gitignore |
| ripgrep (rg) | grep | Much faster, respects .gitignore |
| zoxide | cd | Learns from usage, fuzzy matching |
| git-delta | diff | Syntax highlighting, side-by-side |

## Environment Management

```bash
# direnv — auto-load env vars per directory
echo 'export API_KEY=secret' > .envrc
direnv allow            # Activate for this directory
cd ..                   # Vars automatically unloaded
cd -                    # Vars automatically reloaded

# fnm — fast Node.js version manager
fnm install 22          # Install Node 22
fnm use 22              # Switch to Node 22
echo "22" > .node-version  # Auto-switch when entering directory
```

## Command History

Atuin replaces the default shell history with a searchable, synced database:

```bash
ctrl+r                 # Search history with fuzzy matching
atuin stats            # See your command usage stats
```
