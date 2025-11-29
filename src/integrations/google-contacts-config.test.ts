/**
 * Google Contacts Config Tests
 * 
 * Tests for OAuth scope configuration and read-only verification.
 * Requirements: 15.2
 */

import { describe, it, expect } from 'vitest';
import { GOOGLE_CONTACTS_SCOPES } from './google-contacts-config';

describe('Google Contacts OAuth Configuration', () => {
  describe('OAuth Scopes - Read-Only Verification', () => {
    it('should only include read-only scopes', () => {
      const writeScopes = [
        'https://www.googleapis.com/auth/contacts', // Read/write access (NOT ALLOWED)
      ];

      for (const scope of GOOGLE_CONTACTS_SCOPES) {
        expect(writeScopes).not.toContain(scope);
      }
    });

    it('should include contacts.readonly scope', () => {
      expect(GOOGLE_CONTACTS_SCOPES).toContain(
        'https://www.googleapis.com/auth/contacts.readonly'
      );
    });

    it('should include contacts.other.readonly scope', () => {
      expect(GOOGLE_CONTACTS_SCOPES).toContain(
        'https://www.googleapis.com/auth/contacts.other.readonly'
      );
    });

    it('should include userinfo.email scope', () => {
      expect(GOOGLE_CONTACTS_SCOPES).toContain(
        'https://www.googleapis.com/auth/userinfo.email'
      );
    });

    it('should include userinfo.profile scope', () => {
      expect(GOOGLE_CONTACTS_SCOPES).toContain(
        'https://www.googleapis.com/auth/userinfo.profile'
      );
    });

    it('should have exactly 4 scopes', () => {
      expect(GOOGLE_CONTACTS_SCOPES).toHaveLength(4);
    });

    it('should not include any write scopes', () => {
      const allScopes = GOOGLE_CONTACTS_SCOPES.join(' ');
      
      // Verify no write-related keywords in scopes (except in "readonly")
      expect(allScopes).not.toMatch(/\bwrite\b/i);
      expect(allScopes).not.toMatch(/\bedit\b/i);
      expect(allScopes).not.toMatch(/\bmodify\b/i);
      expect(allScopes).not.toMatch(/\bupdate\b/i);
      expect(allScopes).not.toMatch(/\bdelete\b/i);
      expect(allScopes).not.toMatch(/\bcreate\b/i);
    });

    it('should have all scopes ending with readonly or userinfo', () => {
      for (const scope of GOOGLE_CONTACTS_SCOPES) {
        const isReadOnly = scope.includes('readonly');
        const isUserInfo = scope.includes('userinfo');
        expect(isReadOnly || isUserInfo).toBe(true);
      }
    });
  });
});
