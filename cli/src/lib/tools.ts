export interface Tool {
  id: string;
  name: string;
  check: string; // command to check if installed
  category:
    | "core"
    | "shell"
    | "languages"
    | "dev-tools"
    | "apps"
    | "infrastructure"
    | "fun";
  critical: boolean;
}

export const tools: Tool[] = [
  // Core
  { id: "git", name: "Git", check: "git", category: "core", critical: true },
  { id: "zsh", name: "Zsh", check: "zsh", category: "core", critical: true },
  { id: "tmux", name: "tmux", check: "tmux", category: "core", critical: true },
  {
    id: "stow",
    name: "GNU Stow",
    check: "stow",
    category: "core",
    critical: true,
  },
  { id: "curl", name: "curl", check: "curl", category: "core", critical: true },
  { id: "jq", name: "jq", check: "jq", category: "core", critical: true },

  // Shell
  {
    id: "starship",
    name: "Starship",
    check: "starship",
    category: "shell",
    critical: false,
  },
  { id: "eza", name: "eza", check: "eza", category: "shell", critical: false },
  { id: "bat", name: "bat", check: "bat", category: "shell", critical: false },
  { id: "fd", name: "fd", check: "fd", category: "shell", critical: false },
  {
    id: "rg",
    name: "ripgrep",
    check: "rg",
    category: "shell",
    critical: false,
  },
  { id: "fzf", name: "fzf", check: "fzf", category: "shell", critical: false },
  {
    id: "zoxide",
    name: "zoxide",
    check: "zoxide",
    category: "shell",
    critical: false,
  },
  {
    id: "direnv",
    name: "direnv",
    check: "direnv",
    category: "shell",
    critical: false,
  },
  { id: "gum", name: "gum", check: "gum", category: "shell", critical: false },
  {
    id: "atuin",
    name: "Atuin",
    check: "atuin",
    category: "shell",
    critical: false,
  },
  {
    id: "delta",
    name: "git-delta",
    check: "delta",
    category: "shell",
    critical: false,
  },
  {
    id: "tldr",
    name: "tldr",
    check: "tldr",
    category: "shell",
    critical: false,
  },
  { id: "yq", name: "yq", check: "yq", category: "shell", critical: false },

  // Languages
  {
    id: "bun",
    name: "Bun",
    check: "bun",
    category: "languages",
    critical: true,
  },
  {
    id: "fnm",
    name: "fnm",
    check: "fnm",
    category: "languages",
    critical: false,
  },
  { id: "go", name: "Go", check: "go", category: "languages", critical: false },
  {
    id: "rustup",
    name: "Rust",
    check: "rustup",
    category: "languages",
    critical: false,
  },
  {
    id: "uv",
    name: "uv (Python)",
    check: "uv",
    category: "languages",
    critical: false,
  },

  // Dev tools
  {
    id: "gh",
    name: "GitHub CLI",
    check: "gh",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "claude",
    name: "Claude Code",
    check: "claude",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "agent-browser",
    name: "agent-browser",
    check: "agent-browser",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "prek",
    name: "prek",
    check: "prek",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "op",
    name: "1Password CLI",
    check: "op",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "just",
    name: "just",
    check: "just",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "inngest",
    name: "Inngest",
    check: "inngest",
    category: "dev-tools",
    critical: false,
  },
  {
    id: "varlock",
    name: "varlock",
    check: "varlock",
    category: "dev-tools",
    critical: false,
  },

  // Apps (GUI)
  {
    id: "ghostty",
    name: "Ghostty",
    check: "ghostty",
    category: "apps",
    critical: false,
  },
  {
    id: "orb",
    name: "OrbStack",
    check: "orb",
    category: "apps",
    critical: false,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    check: "obsidian",
    category: "apps",
    critical: false,
  },

  // Infrastructure
  {
    id: "tailscale",
    name: "Tailscale",
    check: "tailscale",
    category: "infrastructure",
    critical: false,
  },
  {
    id: "cloudflared",
    name: "cloudflared",
    check: "cloudflared",
    category: "infrastructure",
    critical: false,
  },
  {
    id: "syncthing",
    name: "Syncthing",
    check: "syncthing",
    category: "infrastructure",
    critical: false,
  },

  // Fun
  {
    id: "figlet",
    name: "figlet",
    check: "figlet",
    category: "fun",
    critical: false,
  },
  {
    id: "lolcat",
    name: "lolcat",
    check: "lolcat",
    category: "fun",
    critical: false,
  },
  {
    id: "toilet",
    name: "toilet",
    check: "toilet",
    category: "fun",
    critical: false,
  },
];

export const categories = [
  "core",
  "shell",
  "languages",
  "dev-tools",
  "apps",
  "infrastructure",
  "fun",
] as const;

export function toolsByCategory(cat: string): Tool[] {
  return tools.filter((t) => t.category === cat);
}
