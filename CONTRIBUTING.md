# Contributing to EcoTrack

We love your input! We want to make contributing to EcoTrack as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ecotrack.git
   cd ecotrack
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

4. **Database Setup**
   ```bash
   # Using Docker
   docker-compose up -d mongodb
   
   # Seed with sample data
   cd backend
   npm run seed
   ```

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows our style guidelines:

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

### Testing

Please write tests for any new functionality:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat: add waste type prediction API
fix: resolve authentication token expiry issue
docs: update API documentation for reports endpoint
```

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/ecotrack/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please provide:

- **Use case**: Describe the problem you're trying to solve
- **Proposed solution**: How you envision the feature working
- **Alternatives considered**: Other solutions you've thought about
- **Additional context**: Screenshots, mockups, or examples

## Security Issues

Please do not report security vulnerabilities through public GitHub issues. Instead, send an email to security@ecotrack.com.

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out to the maintainers:

- Create an issue for general questions
- Email: contribute@ecotrack.com
- Discord: [EcoTrack Community](https://discord.gg/ecotrack)

Thank you for contributing to EcoTrack! 🌱
