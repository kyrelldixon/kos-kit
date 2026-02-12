# Lesson 5: Agentic Workflows

Agentic workflows combine CLI tools, AI, and automation to get more done with less manual effort.

## The Stack

```
Linear (tasks) → Claude Code (AI) → GitHub (code) → Terminal (tools)
```

1. **Linear** tracks what needs to happen
2. **Claude Code** does the building
3. **GitHub** stores and reviews the code
4. **Terminal tools** provide observability and control

## Working with Linear

```bash
linear issue list                    # See your tasks
linear issue show KYR-42 --comments  # Full context on a task
linear issue update KYR-42 --status "In Progress"
linear issue comment KYR-42 "Started working on auth flow"
```

## Working with tmux

tmux lets you run multiple terminal sessions — useful for watching processes while working:

```bash
tmx new-session --name dev           # Create a session
tmx send-keys --target dev "bun dev" # Start dev server
tmx capture-pane --target dev        # See what's happening
tmx list-sessions                    # See all sessions
```

## The Pattern

1. **Check Linear** — What's the task? Read the comments for context.
2. **Start Claude Code** — Give it the task context and let it explore.
3. **Review and iterate** — Check the work, adjust as needed.
4. **Update Linear** — Comment on progress, move status.
5. **Commit and push** — Ship it.

## Key Principle

The tools work together. Linear is the cockpit, Claude is the engine, and the terminal tools give you visibility into what's happening. The more you use them together, the faster you move.
