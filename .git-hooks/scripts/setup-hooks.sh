#!/bin/bash

# Git Hooks Setup Script
# This script sets up the git hooks for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[SETUP]${NC} $message"
}

print_success() {
    print_status "$GREEN" "$1"
}

print_error() {
    print_status "$RED" "$1"
}

print_warning() {
    print_status "$YELLOW" "$1"
}

print_info() {
    print_status "$BLUE" "$1"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "This is not a git repository. Please run this script from within a git repository."
        exit 1
    fi
}

# Check if hooks directory exists
check_hooks_directory() {
    local hooks_dir="$PROJECT_ROOT/.git-hooks"

    if [[ ! -d "$hooks_dir" ]]; then
        print_error "Git hooks directory not found at: $hooks_dir"
        print_info "Please ensure the .git-hooks directory exists in the project root."
        exit 1
    fi

    print_success "Git hooks directory found: $hooks_dir"
}

# Make pre-commit hook executable
make_hooks_executable() {
    local pre_commit_hook="$PROJECT_ROOT/.git-hooks/pre-commit"

    if [[ -f "$pre_commit_hook" ]]; then
        chmod +x "$pre_commit_hook"
        print_success "Made pre-commit hook executable"
    else
        print_error "Pre-commit hook not found at: $pre_commit_hook"
        exit 1
    fi
}

# Configure git to use our hooks directory
configure_git_hooks_path() {
    local hooks_dir="$PROJECT_ROOT/.git-hooks"

    # Set the hooks path for the current repository
    git config core.hooksPath "$hooks_dir"

    if [[ $? -eq 0 ]]; then
        print_success "Configured git hooks path to: $hooks_dir"
    else
        print_error "Failed to configure git hooks path"
        exit 1
    fi
}

# Verify the configuration
verify_setup() {
    local configured_hooks_path
    configured_hooks_path=$(git config --get core.hooksPath)

    if [[ "$configured_hooks_path" == "$PROJECT_ROOT/.git-hooks" ]]; then
        print_success "Git hooks setup verified!"
        print_info "Current hooks path: $configured_hooks_path"
    else
        print_error "Git hooks setup verification failed"
        print_error "Expected: $PROJECT_ROOT/.git-hooks"
        print_error "Found: $configured_hooks_path"
        exit 1
    fi
}

# Display usage information
show_usage() {
    echo
    print_info "Git hooks setup completed successfully!"
    echo
    print_info "The following commands are now available:"
    echo "  pnpm lint        - Run TypeScript type checking"
    echo "  pnpm lint:fix    - Fix TypeScript/JavaScript linting issues"
    echo "  pnpm format      - Format code with Prettier"
    echo "  pnpm format:all  - Format all code (TypeScript + Rust)"
    echo "  pnpm check       - Run all linting and type checks"
    echo "  pnpm check:fix   - Fix all linting issues"
    echo
    print_info "The pre-commit hook will automatically:"
    echo "  • Format TypeScript/JavaScript files with Biome"
    echo "  • Format Rust files with rustfmt"
    echo "  • Lint Rust files with clippy"
    echo "  • Format configuration files (JSON, YAML, Markdown)"
    echo "  • Run TypeScript type checking"
    echo "  • Re-stage formatted files before commit"
    echo
    print_warning "To temporarily disable hooks:"
    echo "  git config core.hooksPath \"\""
    echo
    print_warning "To re-enable hooks:"
    echo "  git config core.hooksPath .git-hooks"
    echo
}

# Main setup function
main() {
    print_info "Starting git hooks setup..."
    echo

    # Change to project root
    cd "$PROJECT_ROOT"

    # Run setup steps
    check_git_repo
    check_hooks_directory
    make_hooks_executable
    configure_git_hooks_path
    verify_setup

    # Show usage information
    show_usage

    print_success "Git hooks setup completed! 🚀"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Git Hooks Setup Script"
        echo
        echo "Usage: $0 [OPTION]"
        echo
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --check       Only check if hooks are properly configured"
        echo
        exit 0
        ;;
    --check)
        print_info "Checking git hooks configuration..."
        configured_hooks_path=$(git config --get core.hooksPath)
        expected_hooks_path="$PROJECT_ROOT/.git-hooks"

        if [[ "$configured_hooks_path" == "$expected_hooks_path" ]]; then
            print_success "Git hooks are properly configured!"
        else
            print_warning "Git hooks are not properly configured."
            print_info "Expected: $expected_hooks_path"
            print_info "Found: $configured_hooks_path"
            print_info "Run '$0' to fix the configuration."
            exit 1
        fi
        exit 0
        ;;
esac

# Run main setup
main