# Contributing to FaceMatch

Thank you for your interest in contributing to FaceMatch! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (3.9 recommended)
- Git
- A Cloudinary account (for image storage)
- Firebase account (for authentication and database)

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/vbis-sharing-v2.git
   cd vbis-sharing-v2
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/AdityasinhJadav/vbis-sharing-v2.git
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   
   # Flask backend (optional for face recognition features)
   cd ../flask-backend
   pip install -r requirements-advanced.txt
   ```

5. **Set up environment variables**
   ```bash
   # Copy example files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit .env files with your credentials
   ```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-bulk-download`)
- `fix/` - Bug fixes (e.g., `fix/upload-error`)
- `docs/` - Documentation changes (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/api-endpoints`)
- `test/` - Adding tests (e.g., `test/add-upload-tests`)

### Creating a New Feature

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run linting
   cd frontend && npm run lint
   
   # Test the application
   npm run dev
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Changes to build process or auxiliary tools

Example:
```
feat: add bulk photo download functionality

- Implemented download service for multiple photos
- Added progress indicator
- Updated UI with download button
```

## Coding Standards

### JavaScript/React

- Use functional components with hooks
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components small and focused
- Use async/await instead of promises where possible

### Python (Flask Backend)

- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings for functions and classes
- Keep functions small and focused

### File Organization

- Place components in `frontend/src/components/`
- Place pages in `frontend/src/pages/`
- Place utilities in `frontend/src/utils/`
- Place API routes in `backend/src/routes/`
- Place middleware in `backend/src/middleware/`

### Testing

- Write unit tests for utility functions
- Write integration tests for API endpoints
- Test edge cases and error conditions
- Aim for good test coverage

## Pull Request Process

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue number (if applicable)
     - Screenshots (for UI changes)
     - Testing steps

4. **Code Review**
   - Address reviewer feedback
   - Make requested changes
   - Push updates to your branch

5. **Merge**
   - Once approved, your PR will be merged
   - Delete your feature branch

## Reporting Issues

### Bug Reports

When reporting a bug, include:

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, Node version)
- Error messages or logs

### Feature Requests

When requesting a feature, include:

- Clear description of the feature
- Use case / problem it solves
- Proposed solution (optional)
- Alternative solutions considered (optional)

## Development Tips

### Running Services

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Flask (optional)
cd flask-backend && python run_advanced.py
```

### Debugging

- Use browser DevTools for frontend debugging
- Check browser console for errors
- Use `console.log` statements (remove before committing)
- Check backend logs in `backend/logs/`

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -i :4000
# Kill the process
kill -9 <PID>
```

**Firebase authentication errors:**
- Verify Firebase credentials in `.env`
- Check Firebase Console for project status

**Cloudinary upload errors:**
- Verify Cloudinary credentials
- Check upload size limits
- Verify allowed file types

## Questions?

If you have questions or need help:

- Open an issue with the `question` label
- Check existing issues for similar questions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to FaceMatch! 🎉
