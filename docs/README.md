# CatchUp Documentation

This directory contains comprehensive documentation for the CatchUp application.

## Documentation Files

### [API.md](./API.md)
Complete API reference documentation including:
- All REST endpoints with request/response examples
- Authentication and authorization details
- Rate limits and error codes
- Security best practices
- Webhook configuration
- SDK examples

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Comprehensive deployment guide covering:
- Environment variables and configuration
- Database setup and migrations
- External service integration (Google, Twilio, SendGrid, OpenAI)
- Multiple deployment options (Docker, AWS, Heroku, DigitalOcean)
- Scaling considerations
- Monitoring and logging setup
- Backup and recovery procedures
- Security checklist

## Quick Start

1. **For Developers**: Start with [API.md](./API.md) to understand the API endpoints
2. **For DevOps**: Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
3. **For Security**: Review the security checklist in [DEPLOYMENT.md](./DEPLOYMENT.md)

## Additional Resources

- Main README: `../README.md`
- Security Policy: `../SECURITY.md`
- Database Documentation: `../scripts/migrations/README.md`

## Data Export (GDPR Compliance)

The application includes complete user data export functionality:

**Endpoint:** `GET /api/account/export?format=json`

**Supported Formats:**
- JSON (default) - Complete structured export
- CSV - Simplified tabular format

**Exported Data Includes:**
- User account information
- All contacts with metadata
- Groups
- Suggestions
- Interaction logs
- Voice notes
- Preferences (availability and notifications)

See [API.md](./API.md) for detailed usage examples.

## Support

For questions or issues:
- API Documentation: See [API.md](./API.md)
- Deployment Help: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- Security Concerns: See `../SECURITY.md`
