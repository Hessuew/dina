#!/usr/bin/env bash
# Shared command-backed agent status line for tools that provide status JSON on stdin.
set -euo pipefail

input=$(cat)

GRAY='\033[0;90m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
ORANGE='\033[38;5;208m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

abbr() {
  local n="$1"
  if [ "$n" -ge 1000000 ]; then
    awk -v n="$n" 'BEGIN { printf "%gM", n / 1000000 }'
  elif [ "$n" -ge 1000 ]; then
    awk -v n="$n" 'BEGIN { printf "%gk", n / 1000 }'
  else
    printf '%s' "$n"
  fi
}

color_for_tokens() {
  local tokens="$1"
  if [ "$tokens" -ge 150000 ]; then
    printf '%s' "$RED"
  elif [ "$tokens" -ge 120000 ]; then
    printf '%s' "$ORANGE"
  elif [ "$tokens" -ge 80000 ]; then
    printf '%s' "$YELLOW"
  else
    printf '%s' "$GREEN"
  fi
}

model_name=$(printf '%s' "$input" | jq -r '.model.display_name // "Unknown"')
effort=$(printf '%s' "$input" | jq -r '.effort.level // empty')

model_seg="$model_name"
if [ -n "$effort" ]; then
  effort_upper=$(printf '%s' "$effort" | tr '[:lower:]' '[:upper:]')
  case "$effort" in
    low) effort_color="$GRAY" ;;
    medium) effort_color="$BLUE" ;;
    high) effort_color="$GREEN" ;;
    xhigh) effort_color="$YELLOW" ;;
    max) effort_color="$RED" ;;
    *) effort_color="$RESET" ;;
  esac
  model_seg="${model_name} · ${effort_color}${effort_upper}${RESET}"
fi

pct=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
[ -z "$pct" ] && pct=0
used_tok=$(printf '%s' "$input" | jq -r '.context_window.total_input_tokens // 0')
max_tok=$(printf '%s' "$input" | jq -r '.context_window.context_window_size // 200000')

bar_color=$(color_for_tokens "$used_tok")
filled=$((pct / 10))
[ "$filled" -gt 10 ] && filled=10
empty=$((10 - filled))
bar=""
[ "$filled" -gt 0 ] && printf -v fill "%${filled}s" && bar="${fill// /▓}"
[ "$empty" -gt 0 ] && printf -v pad "%${empty}s" && bar="${bar}${pad// /░}"

ctx_seg="${bar_color}${bar}${RESET} $(abbr "$used_tok")/$(abbr "$max_tok") ${pct}%"

five=$(printf '%s' "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week=$(printf '%s' "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
limit_seg=""
[ -n "$five" ] && limit_seg="5h $(printf '%.0f' "$five")%"
[ -n "$week" ] && limit_seg="${limit_seg:+$limit_seg   }wk $(printf '%.0f' "$week")%"

line="${CYAN}${model_seg}${RESET}   ${ctx_seg}"
[ -n "$limit_seg" ] && line="${line}   ${limit_seg}"
printf '%b' "$line"
