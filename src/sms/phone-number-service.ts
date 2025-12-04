/**
 * Phone Number Verification Service
 *
 * Handles phone number linking, verification code generation,
 * and verification code validation for SMS/MMS enrichment feature.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 10.1
 */

import crypto from 'crypto';
import { phoneNumberRepository, CreatePhoneNumberParams } from './phone-number-repository';
import { smsService } from '../notifications/sms-service';

export interface PhoneNumberService {
  linkPhoneNumber(userId: string, phoneNumber: string): Promise<void>;
  sendVerificationCode(phoneNumber: string): Promise<void>;
  verifyCode(phoneNumber: string, code: string): Promise<boolean>;
  unlinkPhoneNumber(userId: string): Promise<void>;
  getUserByPhoneNumber(phoneNumber: string): Promise<string | null>;
  isPhoneNumberVerified(phoneNumber: string): Promise<boolean>;
}

/**
 * Configuration constants
 */
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

/**
 * Phone Number Service Implementation
 */
export class PhoneNumberServiceImpl implements PhoneNumberService {
  /**
   * Link a phone number to a user account and send verification code
   * Requirement 1.1: Send verification code via SMS
   */
  async linkPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Check if phone number is already linked to another user
    const existing = await phoneNumberRepository.findByPhoneNumber(normalizedPhone);
    if (existing && existing.userId !== userId) {
      throw new Error('Phone number is already linked to another account');
    }

    // Check if user already has a phone number
    const userPhone = await phoneNumberRepository.findByUserId(userId);
    if (userPhone && userPhone.phoneNumber !== normalizedPhone) {
      throw new Error('User already has a different phone number linked');
    }

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationExpiresAt = this.getExpirationTime();

    // Create or update phone number record
    if (existing) {
      // Update existing record with new verification code
      await phoneNumberRepository.updateVerificationCode({
        phoneNumber: normalizedPhone,
        verificationCode,
        verificationExpiresAt,
      });
    } else {
      // Create new record
      await phoneNumberRepository.create({
        userId,
        phoneNumber: normalizedPhone,
        verificationCode,
        verificationExpiresAt,
      });
    }

    // Send verification code via SMS
    await this.sendVerificationCode(normalizedPhone);
  }

  /**
   * Send verification code to phone number
   * Requirement 1.1: Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string): Promise<void> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Get phone number record
    const phoneRecord = await phoneNumberRepository.findByPhoneNumber(normalizedPhone);
    if (!phoneRecord) {
      throw new Error('Phone number not found');
    }

    if (!phoneRecord.verificationCode) {
      throw new Error('No verification code available');
    }

    // Send SMS with verification code
    const message = `Your CatchUp verification code is: ${phoneRecord.verificationCode}. This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.`;

    const result = await smsService.sendSMS(normalizedPhone, message);

    if (!result.success) {
      throw new Error(`Failed to send verification code: ${result.error}`);
    }
  }

  /**
   * Verify a code for a phone number
   * Requirement 1.2: Accept valid verification codes
   * Requirement 1.3: Reject invalid verification codes
   * Requirement 1.4: Enforce code expiration
   */
  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Get phone number record
    const phoneRecord = await phoneNumberRepository.findByPhoneNumber(normalizedPhone);
    if (!phoneRecord) {
      return false;
    }

    // Check if already verified
    if (phoneRecord.verified) {
      return true;
    }

    // Check if verification code exists
    if (!phoneRecord.verificationCode || !phoneRecord.verificationExpiresAt) {
      return false;
    }

    // Requirement 1.4: Check if code has expired
    const now = new Date();
    if (now > phoneRecord.verificationExpiresAt) {
      return false;
    }

    // Requirement 1.3: Check if code matches
    if (phoneRecord.verificationCode !== code) {
      return false;
    }

    // Requirement 1.2: Mark as verified
    await phoneNumberRepository.markAsVerified(normalizedPhone);

    // Invalidate cache after verification status changes
    const { invalidatePhoneNumberCache } = await import('./performance-optimizer');
    invalidatePhoneNumberCache(normalizedPhone);

    return true;
  }

  /**
   * Unlink phone number from user account
   * Requirement 1.5: Remove phone number association
   */
  async unlinkPhoneNumber(userId: string): Promise<void> {
    await phoneNumberRepository.deleteByUserId(userId);
  }

  /**
   * Get user ID by phone number (for webhook processing)
   * Uses caching for better performance under load
   */
  async getUserByPhoneNumber(phoneNumber: string): Promise<string | null> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Use cached lookup for better performance
    const { getCachedUserByPhoneNumber } = await import('./performance-optimizer');
    return getCachedUserByPhoneNumber(normalizedPhone);
  }

  /**
   * Check if phone number is verified
   * Uses caching for better performance under load
   */
  async isPhoneNumberVerified(phoneNumber: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Use cached lookup for better performance
    const { getCachedVerificationStatus } = await import('./performance-optimizer');
    return getCachedVerificationStatus(normalizedPhone);
  }

  /**
   * Generate a 6-digit verification code
   * Requirement 1.1: Generate 6-digit code
   */
  private generateVerificationCode(): string {
    // Generate cryptographically secure random 6-digit code
    const min = 100000;
    const max = 999999;
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const code = (randomNumber % (max - min + 1)) + min;
    return code.toString();
  }

  /**
   * Get expiration time for verification code
   * Requirement 1.4: 10-minute expiration
   */
  private getExpirationTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);
  }

  /**
   * Normalize phone number to E.164 format
   * Removes spaces, dashes, parentheses, etc.
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      normalized = '+1' + normalized;
    }

    return normalized;
  }
}

// Export singleton instance
export const phoneNumberService = new PhoneNumberServiceImpl();
