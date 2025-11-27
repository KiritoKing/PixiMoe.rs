#!/bin/bash

# Source colors
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/colors.sh"

# Get root directory of the project
get_project_root() {
    git rev-parse --show-toplevel
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get staged files by extension
get_staged_files() {
    local pattern="$1"
    git diff --cached --name-only --diff-filter=ACM | grep -E "$pattern" || true
}

# Check if any files of a given type are staged
has_staged_files() {
    local pattern="$1"
    local files=$(get_staged_files "$pattern")
    [[ -n "$files" ]]
}

# Run command with error handling
run_command() {
    local cmd="$1"
    local description="$2"

    log_step "$description"
    if eval "$cmd"; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Re-stage formatted files
restage_formatted_files() {
    local formatted_files=$(git diff --name-only)
    if [[ -n "$formatted_files" ]]; then
        log_info "Re-staging formatted files..."
        git add $formatted_files
    fi
}