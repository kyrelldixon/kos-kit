export interface Tool {
	id: string;
	name: string;
	check: string; // command to check if installed
	category: "core" | "terminal" | "shell" | "languages" | "dev-tools" | "infrastructure";
	critical: boolean;
}

export const tools: Tool[] = [
	// Core
	{ id: "git", name: "Git", check: "git", category: "core", critical: true },
	{ id: "zsh", name: "Zsh", check: "zsh", category: "core", critical: true },
	{ id: "tmux", name: "tmux", check: "tmux", category: "core", critical: true },
	{ id: "stow", name: "GNU Stow", check: "stow", category: "core", critical: true },
	{ id: "curl", name: "curl", check: "curl", category: "core", critical: true },
	{ id: "jq", name: "jq", check: "jq", category: "core", critical: true },

	// Terminal
	{ id: "ghostty", name: "Ghostty", check: "ghostty", category: "terminal", critical: false },

	// Shell
	{ id: "starship", name: "Starship", check: "starship", category: "shell", critical: false },
	{ id: "eza", name: "eza", check: "eza", category: "shell", critical: false },
	{ id: "bat", name: "bat", check: "bat", category: "shell", critical: false },
	{ id: "fd", name: "fd", check: "fd", category: "shell", critical: false },
	{ id: "rg", name: "ripgrep", check: "rg", category: "shell", critical: false },
	{ id: "fzf", name: "fzf", check: "fzf", category: "shell", critical: false },
	{ id: "zoxide", name: "zoxide", check: "zoxide", category: "shell", critical: false },
	{ id: "direnv", name: "direnv", check: "direnv", category: "shell", critical: false },
	{ id: "gum", name: "gum", check: "gum", category: "shell", critical: false },
	{ id: "atuin", name: "Atuin", check: "atuin", category: "shell", critical: false },
	{ id: "delta", name: "git-delta", check: "delta", category: "shell", critical: false },
	{ id: "tldr", name: "tldr", check: "tldr", category: "shell", critical: false },
	{ id: "yq", name: "yq", check: "yq", category: "shell", critical: false },

	// Languages
	{ id: "bun", name: "Bun", check: "bun", category: "languages", critical: true },
	{ id: "fnm", name: "fnm", check: "fnm", category: "languages", critical: false },
	{ id: "go", name: "Go", check: "go", category: "languages", critical: false },
	{ id: "rustup", name: "Rust", check: "rustup", category: "languages", critical: false },
	{ id: "uv", name: "uv (Python)", check: "uv", category: "languages", critical: false },

	// Dev tools
	{ id: "gh", name: "GitHub CLI", check: "gh", category: "dev-tools", critical: false },
	{ id: "claude", name: "Claude Code", check: "claude", category: "dev-tools", critical: false },

	// Infrastructure
	{ id: "tailscale", name: "Tailscale", check: "tailscale", category: "infrastructure", critical: false },
	{ id: "cloudflared", name: "cloudflared", check: "cloudflared", category: "infrastructure", critical: false },
	{ id: "syncthing", name: "Syncthing", check: "syncthing", category: "infrastructure", critical: false },
];

export const categories = [
	"core",
	"terminal",
	"shell",
	"languages",
	"dev-tools",
	"infrastructure",
] as const;

export function toolsByCategory(cat: string): Tool[] {
	return tools.filter((t) => t.category === cat);
}
