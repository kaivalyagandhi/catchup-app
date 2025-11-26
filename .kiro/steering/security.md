# CatchUp Security Standards

## Credential Safety

### Never Commit Secrets
- **API keys, tokens, passwords**: NEVER commit to version control
- Use environment variables for all sensitive credentials
- Add `.env` files to `.gitignore` immediately

### Environment Variables
- Store credentials in `.env` files (local development)
- Use secure secret management in production (AWS Secrets Manager, Vault, etc.)
- Required env vars: Document in `.env.example` with placeholder values

### Third-Party Integrations
- **Google Calendar OAuth**: Store client secrets securely, never in code
- **Twilio/SMS**: API keys in environment variables only
- **AI APIs (Google Cloud Speech-to-Text, Google Gemini)**: Keys and service account credentials must be server-side only, never exposed to client
- **SendGrid/Email**: API keys in secure storage

### Code Review Checklist
- Scan for hardcoded credentials before committing
- Use tools like `git-secrets` or `trufflehog` to detect leaked secrets
- Rotate any accidentally committed credentials immediately

### Access Control
- Principle of least privilege: Grant minimum necessary permissions
- OAuth scopes: Request only required permissions (e.g., read-only calendar access)
- User data: Encrypt sensitive information at rest and in transit

## Data Privacy

- User contacts, voice notes, and interaction logs are sensitive
- Implement proper authentication and authorization
- Follow GDPR/privacy best practices for user data handling
