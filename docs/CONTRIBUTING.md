# Contributing to EKHY AR Corp HR Management System

Terima kasih sudah tertarik untuk berkontribusi! Panduan ini akan membantu Anda memahami workflow dan standar kami.

## 🎯 Code of Conduct

- Tunjukkan rasa hormat kepada semua kontributor
- Beri feedback yang konstruktif
- Fokus pada hal terbaik untuk komunitas
- Laporkan perilaku yang tidak pantas kepada maintainers

## 🚀 Getting Started

### 1. Fork Repository
```bash
git clone https://github.com/emanagementrecruitment-ekhy/ekhy-arcorp-ar-corp-hr.git
cd ekhy-arcorp-ar-corp-hr
```

### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Create Your Changes
- Follow the code style guidelines
- Write meaningful commit messages
- Add or update tests as needed
- Update documentation if applicable

### 5. Testing
```bash
npm run lint      # Check code style
npm test          # Run tests
npm run build     # Build the project
```

## 📋 Branch Naming Convention

- `feature/DESCRIPTION` - New features
- `bugfix/DESCRIPTION` - Bug fixes
- `hotfix/DESCRIPTION` - Critical fixes
- `release/VERSION` - Release branches
- `docs/DESCRIPTION` - Documentation
- `refactor/DESCRIPTION` - Code refactoring
- `test/DESCRIPTION` - Test additions

## 📝 Commit Message Guidelines

Format: `<type>: <subject>`

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, semicolons, etc)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `build:` - Build system or dependencies
- `ci:` - CI/CD configuration
- `chore:` - Other changes that don't affect code

### Examples
```
feat: add user authentication module
fix: resolve login form validation bug
docs: update README with setup instructions
test: add unit tests for payment processing
```

## 🔄 Pull Request Process

### 1. Before Creating PR
- [ ] Branch dibuat dari `main` atau `develop`
- [ ] Latest changes dari main sudah di-pull
- [ ] Local tests semua pass
- [ ] Code linting selesai tanpa errors
- [ ] Changes sudah didokumentasikan

### 2. Create PR
- [ ] Gunakan PR template
- [ ] Deskripsi yang jelas tentang changes
- [ ] Link ke related issues
- [ ] Sertakan screenshot jika GUI changes
- [ ] Pastikan automated checks pass

### 3. Code Review
- [ ] Minimal 1 approval dari maintainer
- [ ] All conversations resolved
- [ ] CI/CD checks passing
- [ ] No conflicts dengan main branch

### 4. Merge
- [ ] Squash dan merge ke main
- [ ] Delete branch setelah merge
- [ ] Update related issues

## 🧪 Testing Guidelines

### Unit Tests
```javascript
describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Running Tests
```bash
npm test                  # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage report
```

## 📚 Documentation Standards

- Update README jika ada user-facing changes
- Add JSDoc comments untuk functions
- Include examples dalam documentation
- Keep documentation DRY (Don't Repeat Yourself)

### JSDoc Example
```javascript
/**
 * Calculate the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum of a and b
 * @throws {TypeError} If inputs are not numbers
 */
function add(a, b) {
  // Implementation
}
```

## 🐛 Reporting Bugs

### Before Reporting
- Check existing issues untuk duplicates
- Update ke latest version
- Gather system information

### Bug Report Should Include
- Clear title dan description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots jika applicable
- Environment details (OS, Node version, dll)

## 💡 Feature Requests

### Good Feature Request Includes
- Clear problem statement
- Proposed solution
- Alternatives considered
- Use cases dan benefits
- Any potential drawbacks

## 🔍 Code Style Guidelines

### Formatting
- Use 2-space indentation
- Max line length: 100 characters
- Always use semicolons
- Use single quotes untuk strings

### Naming Conventions
- Variables & functions: `camelCase`
- Classes & Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private members: prefix dengan `_`

### Example
```javascript
const MAX_RETRIES = 3;
const apiEndpoint = 'https://api.example.com';

class UserManager {
  private _users = [];
  
  addUser(name) {
    // Implementation
  }
}
```

## 📖 Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [JavaScript Style Guide](https://google.github.io/styleguide/javascriptguide.xml)

## ❓ Questions?

- Buka discussion di GitHub
- Email: support@arcorp-hr.com
- Chat di project board

---

**Happy Contributing! 🎉**