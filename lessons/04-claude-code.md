# Lesson 4: Claude Code

Claude Code is an AI coding assistant that runs in your terminal.

## Getting Started

```bash
claude                 # Start an interactive session
claude "explain this function"  # Ask a one-off question
claude -p "fix the bug in auth.ts"  # Non-interactive (pipe mode)
```

## Key Features

- **Reads your codebase** — understands project structure and conventions
- **Edits files** — makes changes directly, not just suggestions
- **Runs commands** — tests, builds, git operations
- **Multi-file changes** — handles refactors across the project

## Tips

1. **Be specific** — "Add a logout button to the nav bar that calls /api/logout" beats "add logout"
2. **Give context** — Point Claude at files, errors, or docs
3. **Use CLAUDE.md** — Project instructions that Claude reads every session
4. **Iterate** — Start broad, refine as you go

## CLAUDE.md

Every project can have a `CLAUDE.md` file with instructions:

```markdown
# My Project

## Stack
- Next.js + TypeScript
- Prisma for database

## Conventions
- Use kebab-case for files
- Conventional commits
```

Claude follows these instructions automatically.

## Slash Commands

```
/help                  # See available commands
/clear                 # Clear conversation
/compact               # Compress context to free space
```
