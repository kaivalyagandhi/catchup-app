/**
 * Phone Number Repository
 *
 * Database operations for user phone numbers
 */

import pool from '../db/connection';
import { encrypt, decrypt } from '../utils/encryption';

export interface UserPhoneNumber {
  id: string;
  userId: string;
  phoneNumber: string;
  verified: boolean;
  verificationCode?: string;
  verificationExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePhoneNumberParams {
  userId: string;
  phoneNumber: string;
  verificationCode: string;
  verificationExpiresAt: Date;
}

export interface UpdateVerificationParams {
  phoneNumber: string;
  verificationCode: string;
  verificationExpiresAt: Date;
}

export class PhoneNumberRepository {
  /**
   * Create a new phone number record with verification code
   */
  async create(params: CreatePhoneNumberParams): Promise<UserPhoneNumber> {
    const encryptedPhone = encrypt(params.phoneNumber);

    const result = await pool.query(
      `INSERT INTO user_phone_numbers 
       (user_id, phone_number, encrypted_phone_number, verified, verification_code, verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.userId,
        params.phoneNumber,
        encryptedPhone,
        false,
        params.verificationCode,
        params.verificationExpiresAt,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find phone number by phone number string
   */
  async findByPhoneNumber(phoneNumber: string): Promise<UserPhoneNumber | null> {
    const result = await pool.query(
      'SELECT * FROM user_phone_numbers WHERE phone_number = $1',
      [phoneNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find phone number by user ID
   */
  async findByUserId(userId: string): Promise<UserPhoneNumber | null> {
    const result = await pool.query(
      'SELECT * FROM user_phone_numbers WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update verification code and expiration
   */
  async updateVerificationCode(params: UpdateVerificationParams): Promise<void> {
    await pool.query(
      `UPDATE user_phone_numbers 
       SET verification_code = $1, verification_expires_at = $2, updated_at = NOW()
       WHERE phone_number = $3`,
      [params.verificationCode, params.verificationExpiresAt, params.phoneNumber]
    );
  }

  /**
   * Mark phone number as verified
   */
  async markAsVerified(phoneNumber: string): Promise<void> {
    await pool.query(
      `UPDATE user_phone_numbers 
       SET verified = true, verification_code = NULL, verification_expires_at = NULL, updated_at = NOW()
       WHERE phone_number = $1`,
      [phoneNumber]
    );
  }

  /**
   * Delete phone number by user ID
   */
  async deleteByUserId(userId: string): Promise<void> {
    await pool.query('DELETE FROM user_phone_numbers WHERE user_id = $1', [userId]);
  }

  /**
   * Delete phone number by phone number string
   */
  async deleteByPhoneNumber(phoneNumber: string): Promise<void> {
    await pool.query('DELETE FROM user_phone_numbers WHERE phone_number = $1', [phoneNumber]);
  }

  /**
   * Map database row to UserPhoneNumber interface
   */
  private mapRow(row: any): UserPhoneNumber {
    return {
      id: row.id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      verified: row.verified,
      verificationCode: row.verification_code,
      verificationExpiresAt: row.verification_expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const phoneNumberRepository = new PhoneNumberRepository();
