# OAuth Token Encryption

## Overview

This document describes the implementation of AES-256-GCM encryption for OAuth tokens stored at rest in the CatchUp database. All OAuth tokens (access tokens, refresh tokens) are encrypted before being stored in the database and decrypted when retrieved.

## Security Requirements

**Requirement 4.3**: WHEN storing Google authentication data THEN the CatchUp System SHALL encrypt sensitive tokens at rest in the database

## Implementation

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes)
- **Authentication Tag Size**: 128 bits (16 bytes)

### Why AES-256-GCM?

1. **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity, detecting any tampering with the ciphertext
2. **Industry Standard**: Widely used and recommended by security experts
3. **Performance**: Hardware-accelerated on most modern CPUs
4. **Security**: No known practical attacks against AES-256-GCM when used correctly

## Architecture

### Components

1. **Encryption Utilities** (`src/utils/encryption.ts`)
   - Core encryption/decryption functions
   - Token-specific wrappers
   - Key management

2. **OAuth Repository** (`src/integrations/oauth-repository.ts`)
   - Database operations for OAuth tokens
   - Automatic encryption on storage
   - Automatic decryption on retrieval

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Storage Flow                        │
└─────────────────────────────────────────────────────────────┘

1. Application receives OAuth token from provider
   ↓
2. Token passed to oauth-repository.upsertToken()
   ↓
3. Token encrypted using encryptToken()
   - Generate random IV (16 bytes)
   - Encrypt with AES-256-GCM
   - Append authentication tag
   - Encode as base64
   ↓
4. Encrypted token stored in database
   ↓
5. Application retrieves token using oauth-repository.getToken()
   ↓
6. Encrypted token decrypted using decryptToken()
   - Decode from base64
   - Extract IV and auth tag
   - Verify authentication tag
   - Decrypt with AES-256-GCM
   ↓
7. Plaintext token returned to application
```

## Configuration

### Environment Variables

```bash
# Generate a secure encryption key
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here
```

### Generating an Encryption Key

Use the provided utility function:

```typescript
import { generateEncryptionKey } from './utils/encryption';

const key = generateEncryptionKey();
console.log('ENCRYPTION_KEY=' + key);
```

Or use Node.js directly:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important**: 
- The key must be exactly 64 hexadecimal characters (32 bytes)
- Store the key securely (environment variables, secret manager)
- Never commit the key to version control
- Rotate the key periodically in production

## Usage

### Storing OAuth Tokens

```typescript
import { upsertToken } from './integrations/oauth-repository';

// Tokens are automatically encrypted before storage
await upsertToken(
  userId,
  'google',
  accessToken,      // Plaintext token
  refreshToken,     // Plaintext token
  'Bearer',
  expiresAt,
  'email profile',
  'user@example.com'
);
```

### Retrieving OAuth Tokens

```typescript
import { getToken } from './integrations/oauth-repository';

// Tokens are automatically decrypted after retrieval
const token = await getToken(userId, 'google');

console.log(token.accessToken);  // Plaintext token
console.log(token.refreshToken); // Plaintext token
```

### Direct Encryption/Decryption

```typescript
import { encryptToken, decryptToken } from './utils/encryption';

// Encrypt a token
const encrypted = encryptToken('my_access_token');

// Decrypt a token
const decrypted = decryptToken(encrypted);
```

## Security Properties

### 1. Confidentiality

- Tokens are encrypted using AES-256, which is computationally infeasible to break
- Each encryption uses a unique random IV, preventing pattern analysis
- Even identical tokens produce different ciphertexts

### 2. Authenticity

- GCM mode provides authentication via an authentication tag
- Any tampering with the ciphertext is detected during decryption
- Prevents unauthorized modification of encrypted tokens

### 3. Key Management

- Encryption key stored in environment variables
- Key never exposed in logs or error messages
- Key validation on application startup
- Support for key rotation (decrypt with old key, re-encrypt with new key)

### 4. Defense in Depth

- Encryption at rest protects against database breaches
- Even if database is compromised, tokens remain encrypted
- Complements other security measures (TLS, access controls, etc.)

## Database Schema

### oauth_tokens Table

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,      -- Encrypted
  refresh_token TEXT,               -- Encrypted (optional)
  token_type VARCHAR(50),
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);
```

**Note**: The `access_token` and `refresh_token` columns store encrypted data as base64-encoded strings.

## Testing

### Unit Tests

Comprehensive tests verify:
- Encryption/decryption correctness
- Handling of edge cases (empty strings, long tokens, unicode)
- Error handling (missing key, wrong key, tampered ciphertext)
- Security properties (unique IVs, authentication tags)

Run tests:

```bash
npm test -- src/utils/encryption.test.ts
npm test -- src/integrations/oauth-repository.test.ts
```

### Test Coverage

- ✅ Encryption produces different ciphertexts for same plaintext
- ✅ Decryption correctly recovers original plaintext
- ✅ Tampering with ciphertext is detected
- ✅ Wrong encryption key causes decryption failure
- ✅ Tokens are never stored in plaintext
- ✅ Round-trip encryption/decryption preserves data

## Error Handling

### Configuration Errors

```typescript
// Missing ENCRYPTION_KEY
Error: ENCRYPTION_KEY environment variable is not set

// Invalid ENCRYPTION_KEY length
Error: ENCRYPTION_KEY must be a 64-character hex string
```

### Decryption Errors

```typescript
// Tampered ciphertext
Error: Unsupported state or unable to authenticate data

// Wrong encryption key
Error: Unsupported state or unable to authenticate data
```

**Important**: Decryption errors indicate either:
1. Data corruption
2. Tampering attempt
3. Wrong encryption key (e.g., after key rotation)

## Best Practices

### 1. Key Management

- ✅ Store key in environment variables or secret manager
- ✅ Use different keys for development, staging, and production
- ✅ Rotate keys periodically (e.g., every 90 days)
- ❌ Never commit keys to version control
- ❌ Never log or expose keys in error messages

### 2. Key Rotation

To rotate the encryption key:

1. Generate a new key
2. Decrypt all tokens with old key
3. Re-encrypt all tokens with new key
4. Update ENCRYPTION_KEY environment variable
5. Restart application

Example migration script:

```typescript
import { getToken, upsertToken } from './integrations/oauth-repository';
import { decrypt, encrypt } from './utils/encryption';

async function rotateEncryptionKey(oldKey: string, newKey: string) {
  // Set old key
  process.env.ENCRYPTION_KEY = oldKey;
  
  // Get all tokens
  const tokens = await getAllTokens();
  
  // Set new key
  process.env.ENCRYPTION_KEY = newKey;
  
  // Re-encrypt all tokens
  for (const token of tokens) {
    await upsertToken(
      token.userId,
      token.provider,
      token.accessToken,
      token.refreshToken,
      token.tokenType,
      token.expiresAt,
      token.scope,
      token.email
    );
  }
}
```

### 3. Monitoring

Monitor for:
- Decryption failures (may indicate tampering or key issues)
- Missing ENCRYPTION_KEY on startup
- Unusual patterns in token access

### 4. Compliance

This implementation helps meet compliance requirements:
- **GDPR**: Encryption of personal data at rest
- **PCI DSS**: Encryption of sensitive authentication data
- **SOC 2**: Security controls for data protection

## Troubleshooting

### Problem: Decryption fails after deployment

**Cause**: ENCRYPTION_KEY not set or different from key used to encrypt

**Solution**: 
1. Verify ENCRYPTION_KEY is set in production environment
2. Verify key matches the one used to encrypt existing tokens
3. If key was changed, perform key rotation

### Problem: "ENCRYPTION_KEY must be a 64-character hex string"

**Cause**: Invalid encryption key format

**Solution**: Generate a new key using `generateEncryptionKey()` or:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Problem: Performance issues with encryption

**Cause**: Encryption/decryption overhead

**Solution**: 
- AES-256-GCM is hardware-accelerated on most CPUs
- Consider caching decrypted tokens in memory (with TTL)
- Profile to identify actual bottleneck

## References

- [NIST Special Publication 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) - GCM Mode Specification
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## Related Files

- `src/utils/encryption.ts` - Encryption utilities
- `src/utils/encryption.test.ts` - Encryption tests
- `src/integrations/oauth-repository.ts` - OAuth token storage
- `src/integrations/oauth-repository.test.ts` - OAuth repository tests
- `.env.example` - Environment variable documentation
