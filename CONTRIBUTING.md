# Contributing to PixiMoe.rs 🌸

Thank you for your interest in contributing to PixiMoe.rs! This document provides guidelines and information for contributors. 🎀

PixiMoe.rs is a kawaii AI-powered anime gallery manager built with Rust and Tauri. We welcome all forms of contributions, from bug fixes to new features! ✨

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+ for frontend development
- **Rust** 1.70+ for backend development
- **sqlx-cli** for database operations
- Git for version control

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/piximoe.rs.git
   cd piximoe.rs
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   pnpm install

   # Install sqlx-cli if needed
   cargo install sqlx-cli --no-default-features --features sqlite
   ```

3. **Set up database**
   ```bash
   sqlx database create
   sqlx migrate run
   ```

4. **Start development**
   ```bash
   pnpm tauri dev
   ```

## 🐛 Bug Reports

### Before Creating a Bug Report

- Check existing issues to avoid duplicates
- Verify the bug still exists in the latest version
- Ensure your environment meets the prerequisites

### Bug Report Template

```markdown
**Bug Description**
A clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Windows 11, macOS 14.2, Ubuntu 22.04]
- Rust version: [e.g., 1.75.0]
- Node.js version: [e.g., 20.10.0]
- App version: [e.g., 0.1.0]

**Additional Context**
Add any other context about the problem here.

**Screenshots**
If applicable, add screenshots to help explain your problem.
```

## 💡 Feature Requests

### Before Requesting a Feature

- Check existing issues and proposals
- Consider if the feature fits the project's vision
- Think about the complexity and impact

### Feature Request Template

```markdown
**Feature Description**
A clear and concise description of the feature you'd like to see added.

**Problem Statement**
What problem does this feature solve? What limitation does it address?

**Proposed Solution**
How do you envision this feature working?

**Alternatives Considered**
What alternative solutions or approaches have you considered?

**Additional Context**
Add any other context, mockups, or examples about the feature request.
```

## 🔧 Code Contributions

### Code Style Guidelines

#### Rust Code
- Follow the official [Rust style guide](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Prefer explicit error handling with `Result<T, E>`
- Document public APIs with `///` comments

#### TypeScript/React Code
- Follow [TypeScript best practices](https://typescript-eslint.io/rules/)
- Use Biome for formatting and linting
- Prefer explicit type annotations
- Use functional components with hooks
- Follow React best practices

#### Commit Messages
Use [conventional commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no functional changes)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Build process or dependency changes

Examples:
```
feat(ai): add face detection with SCRFD model
fix(ui): resolve image grid layout issues
docs(readme): update installation instructions
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Include tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   # Frontend checks
   pnpm type-check
   pnpm lint
   pnpm format

   # Rust checks
   cd src-tauri
   cargo check
   cargo clippy
   cargo test
   ```

4. **Run the full check suite**
   ```bash
   pnpm check
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Pull Request Process

### Before Submitting

- Ensure your code passes all quality checks
- Test your changes thoroughly
- Update relevant documentation
- Add tests for new functionality

### PR Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have tested this change locally
- [ ] I have added/updated tests as needed
- [ ] All existing tests pass

## Quality Checks
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] TypeScript types are correct
- [ ] Rust code compiles without warnings

## Additional Notes
Any additional context or notes for reviewers.
```

### Review Process

1. **Automated checks** - CI/CD pipeline runs tests and quality checks
2. **Code review** - Maintainers review the code for:
   - Functionality and correctness
   - Code quality and style
   - Performance implications
   - Security considerations
3. **Approval** - At least one maintainer approval required
4. **Merge** - PR is merged into the main branch

## 🧪 Testing

### Running Tests

```bash
# Rust tests
cd src-tauri
cargo test

# Frontend tests (when available)
pnpm test

# Integration tests
pnpm test:integration
```

### Writing Tests

- **Unit tests**: Test individual functions and components
- **Integration tests**: Test module interactions
- **E2E tests**: Test complete user workflows

## 📚 Documentation

### Types of Documentation

- **Code comments**: Document complex logic, algorithms, and public APIs
- **README.md**: Project overview, setup, and usage instructions
- **API docs**: Generated from code comments
- **User guides**: Step-by-step tutorials for common tasks

### Documentation Standards

- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include code examples where helpful
- Cross-reference related documentation

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive, collaborative environment

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and discussions
- **Documentation**: Check existing docs first

## 🏷️ Release Process

Releases follow [semantic versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes
- **Minor (X.Y.0)**: New features (backward compatible)
- **Patch (X.Y.Z)**: Bug fixes (backward compatible)

Release notes will include:
- New features
- Bug fixes
- Breaking changes
- Migration guides (if needed)

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/piximoe.rs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/piximoe.rs/discussions)
- **Email**: [your-email@example.com]

---

Thank you for contributing to PixiMoe.rs! Your contributions help make this kawaii anime gallery manager better for everyone. 🎌✨

**Made with 💖 and 🦀 for the anime community!**