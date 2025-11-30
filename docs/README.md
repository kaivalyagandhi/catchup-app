# CatchUp Documentation

This directory contains comprehensive documentation for the CatchUp application.

## Documentation Files

### Core Documentation

#### [API.md](./API.md)
Complete API reference documentation including:
- All REST endpoints with request/response examples
- Authentication and authorization details
- Rate limits and error codes
- Security best practices
- Webhook configuration
- SDK examples

#### [DEPLOYMENT.md](./DEPLOYMENT.md)
Comprehensive deployment guide covering:
- Environment variables and configuration
- Database setup and migrations
- External service integration (Google, Twilio, SendGrid, OpenAI)
- Multiple deployment options (Docker, AWS, Heroku, DigitalOcean)
- Scaling considerations
- Monitoring and logging setup
- Backup and recovery procedures
- Security checklist

#### [ACCESSIBILITY.md](./ACCESSIBILITY.md)
Accessibility features and compliance:
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast standards
- Testing procedures

### Feature Documentation

#### Contact Onboarding

- **[Contact Onboarding README](./CONTACT_ONBOARDING_README.md)** - Complete feature overview
  - Architecture and components
  - Database schema
  - API endpoints
  - Testing strategy
  - Deployment guide

- **[Contact Onboarding User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)** - User documentation
  - Understanding Dunbar's number
  - Step-by-step onboarding walkthrough
  - Circle definitions and recommendations
  - AI suggestions and preferences
  - Weekly Catchup feature
  - Tips and best practices

- **[Dunbar's Number Explained](./DUNBARS_NUMBER_EXPLAINED.md)** - The science behind social circles
  - What is Dunbar's number?
  - The five circles explained
  - Brain science and research evidence
  - Cultural variations
  - Practical applications
  - Common misconceptions

- **[Contact Onboarding Troubleshooting](./CONTACT_ONBOARDING_TROUBLESHOOTING.md)** - Problem solving
  - Common issues and solutions
  - Error message reference
  - Performance optimization
  - Mobile-specific issues
  - Getting support

- **[Contact Onboarding Quick Reference](./CONTACT_ONBOARDING_QUICK_REFERENCE.md)** - Printable reference card
  - Five circles at a glance
  - Quick actions and shortcuts
  - Common issues quick fixes
  - Tips and best practices
  - Emergency contacts

- **[Onboarding API Documentation](./ONBOARDING_API.md)** - API reference
  - Onboarding endpoints
  - Circle assignment endpoints
  - AI suggestion endpoints
  - Request/response formats
  - Code examples

#### Google Contacts Integration

- **[Google Contacts User Guide](./GOOGLE_CONTACTS_USER_GUIDE.md)** - User documentation
  - Setup and connection
  - Sync features
  - Group management
  - Troubleshooting

#### Voice Notes

- **[Voice Notes Setup](./VOICE_NOTES_SETUP.md)** - Technical setup
  - Google Cloud configuration
  - API setup
  - Testing procedures

- **[Voice Notes User Guide](./VOICE_NOTES_USER_GUIDE.md)** - User documentation
  - Recording voice notes
  - Transcription features
  - Entity extraction
  - Best practices

## Quick Start

### For Users

1. **Getting Started**: Read the [Contact Onboarding User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)
2. **Need Help?**: Check the [Troubleshooting Guide](./CONTACT_ONBOARDING_TROUBLESHOOTING.md)
3. **Google Contacts**: See [Google Contacts User Guide](./GOOGLE_CONTACTS_USER_GUIDE.md)
4. **Voice Notes**: Read [Voice Notes User Guide](./VOICE_NOTES_USER_GUIDE.md)

### For Developers

1. **API Reference**: Start with [API.md](./API.md) to understand the API endpoints
2. **Onboarding Feature**: Review [Contact Onboarding README](./CONTACT_ONBOARDING_README.md)
3. **Onboarding API**: See [Onboarding API Documentation](./ONBOARDING_API.md)
4. **Testing**: Check test files in respective feature directories

### For DevOps

1. **Deployment**: Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
2. **Security**: Review the security checklist in [DEPLOYMENT.md](./DEPLOYMENT.md)
3. **Database**: See database documentation in `../scripts/migrations/README.md`

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
