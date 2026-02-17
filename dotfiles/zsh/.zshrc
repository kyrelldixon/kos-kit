# kos-kit managed zshrc
# Load order: local_before → PATH → tool init → aliases → local_after

# --- Terminal compatibility ---
# Fall back if TERM isn't recognized (e.g. xterm-ghostty on remote machines)
if ! infocmp "$TERM" &>/dev/null 2>&1; then
  export TERM=xterm-256color
fi

# --- Pre-overrides ---
[[ -f ~/.zshrc_local_before ]] && source ~/.zshrc_local_before

# --- PATH setup ---
typeset -U PATH  # deduplicate

# Homebrew
if [[ -d /opt/homebrew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -d /usr/local/Homebrew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# User paths
export PATH="$HOME/.local/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/go/bin:$PATH"
[[ -d "$HOME/.local/share/fnm" ]] && export PATH="$HOME/.local/share/fnm:$PATH"

# --- Tool init (all guarded) ---
command -v fnm    &>/dev/null && eval "$(fnm env --use-on-cd)"
command -v starship &>/dev/null && eval "$(starship init zsh)"
command -v zoxide &>/dev/null && eval "$(zoxide init zsh)"
command -v direnv &>/dev/null && eval "$(direnv hook zsh)"
command -v atuin  &>/dev/null && eval "$(atuin init zsh)"
command -v fzf    &>/dev/null && source <(fzf --zsh) 2>/dev/null

# Bun completions
[[ -s "$BUN_INSTALL/_bun" ]] && source "$BUN_INSTALL/_bun"

# uv
[[ -f "$HOME/.local/bin/env" ]] && source "$HOME/.local/bin/env"

# --- Git aliases ---
alias gs='git status'
alias ga='git add'
alias gap='git add -p'
alias gaa='git add .'
alias gc='git commit'
alias gcm='git commit -m'
alias gcam='git commit -am'
alias gam='git commit --amend'
alias gd='git diff'
alias gt='git checkout'
alias gsw='git switch'
alias gswc='git switch -c'
alias gb='git branch'
alias gbd='git branch -d'
alias gbD='git branch -D'
alias gmv='git branch -m'
alias gp='git pull'
alias gpl='git pull'
alias gpo='git pull origin'
alias gpull='git pull'
alias gpush='git push -u origin HEAD'
alias gpsh='gpush'
alias gclone='git clone'
alias gm='git merge'
alias gmm='git merge main'
alias gstash='git stash -u'
alias gclean='git stash -u && git stash drop'
alias glog='git log --pretty=oneline'

# --- GitHub CLI aliases ---
alias ghprc='gh pr create'
alias ghprv='gh pr view --web'
alias ghprs='gh pr status'
alias ghprls='gh pr list'
alias ghprm='gh pr merge'
alias ghprcl='gh pr close'
alias ghils='gh issues list'

# --- npm aliases ---
alias ni='npm install'
alias nis='npm install --save'
alias nid='npm install --save-dev'

# --- Bun aliases ---
alias b='bun'
alias bs='bun start'
alias bd='bun dev'
alias bt='bun test'
alias ba='bun add'
alias bad='bun add -D'
alias bl='bun run lint'

# --- Zsh config aliases ---
alias zsho='${EDITOR:-vim} ~/.zshrc'
alias zshr='source ~/.zshrc'

# --- Shell aliases ---
alias mv='mv -iv'
alias cp='cp -riv'
alias mkdir='mkdir -vp'

# ls: eza → lsd → ls fallback
if command -v eza &>/dev/null; then
  alias ls='eza'
  alias ll='eza -lah'
  alias la='eza -a'
  alias tree='eza --tree --git-ignore'
elif command -v lsd &>/dev/null; then
  alias ls='lsd'
  alias ll='lsd -lah'
  alias la='lsd -a'
else
  alias ll='ls -lah'
  alias la='ls -A'
fi

# --- Post-overrides ---
[[ -f ~/.zshrc_local_after ]] && source ~/.zshrc_local_after
[[ -f ~/.shell_private ]]     && source ~/.shell_private
