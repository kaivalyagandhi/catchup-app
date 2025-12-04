/**
 * Phone Number Management API Routes
 *
 * Handles phone number linking, verification, and unlinking
 * for SMS/MMS enrichment feature.
 *
 * Requirements: 1.1, 1.2, 1.5
 */

import { Router, Response } from 'express';
import { phoneNumberService } from '../../sms/phone-number-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, requestTimeout } from '../middleware/error-handler';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply request timeout (30 seconds)
router.use(requestTimeout(30000));

/**
 * POST /api/user/phone-number
 * Link a phone number to the authenticated user's account
 * Sends verification code via SMS
 *
 * Requirement 1.1: Send verification code via SMS
 *
 * Request body:
 * {
 *   "phoneNumber": "+15555551234"
 * }
 *
 * Response:
 * 201 Created
 * {
 *   "message": "Verification code sent to phone number",
 *   "phoneNumber": "+15555551234"
 * }
 *
 * Error responses:
 * 400 Bad Request - Invalid phone number or missing field
 * 409 Conflict - Phone number already linked to another account
 * 500 Internal Server Error - Failed to send verification code
 */
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { phoneNumber } = req.body;

    // Validate request body
    if (!phoneNumber) {
      res.status(400).json({
        error: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER',
      });
      return;
    }

    // Validate phone number format (basic validation)
    // Remove formatting characters but keep + and digits
    const cleanedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if it contains only valid characters (+ and digits)
    if (!/^[\+\d]+$/.test(cleanedNumber)) {
      res.status(400).json({
        error: 'Invalid phone number format. Use E.164 format (e.g., +15555551234)',
        code: 'INVALID_PHONE_NUMBER',
      });
      return;
    }

    // Check if it matches E.164 format (+ followed by 1-15 digits)
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(cleanedNumber)) {
      res.status(400).json({
        error: 'Invalid phone number format. Use E.164 format (e.g., +15555551234)',
        code: 'INVALID_PHONE_NUMBER',
      });
      return;
    }

    try {
      // Link phone number and send verification code
      await phoneNumberService.linkPhoneNumber(userId, phoneNumber);

      res.status(201).json({
        message: 'Verification code sent to phone number',
        phoneNumber: phoneNumber,
      });
    } catch (error: any) {
      if (error.message.includes('already linked to another account')) {
        res.status(409).json({
          error: error.message,
          code: 'PHONE_NUMBER_ALREADY_LINKED',
        });
        return;
      }

      if (error.message.includes('already has a different phone number')) {
        res.status(409).json({
          error: error.message,
          code: 'USER_HAS_DIFFERENT_PHONE',
        });
        return;
      }

      throw error;
    }
  })
);

/**
 * POST /api/user/phone-number/verify
 * Verify a phone number with the verification code
 *
 * Requirement 1.2: Accept valid verification codes
 * Requirement 1.3: Reject invalid verification codes
 * Requirement 1.4: Enforce code expiration
 *
 * Request body:
 * {
 *   "phoneNumber": "+15555551234",
 *   "code": "123456"
 * }
 *
 * Response:
 * 200 OK
 * {
 *   "message": "Phone number verified successfully",
 *   "verified": true
 * }
 *
 * Error responses:
 * 400 Bad Request - Missing fields or invalid code
 * 404 Not Found - Phone number not found
 */
router.post(
  '/verify',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { phoneNumber, code } = req.body;

    // Validate request body
    if (!phoneNumber || !code) {
      res.status(400).json({
        error: 'Phone number and verification code are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({
        error: 'Verification code must be 6 digits',
        code: 'INVALID_CODE_FORMAT',
      });
      return;
    }

    // Verify the code
    const verified = await phoneNumberService.verifyCode(phoneNumber, code);

    if (!verified) {
      res.status(400).json({
        error: 'Invalid or expired verification code',
        code: 'VERIFICATION_FAILED',
      });
      return;
    }

    res.status(200).json({
      message: 'Phone number verified successfully',
      verified: true,
    });
  })
);

/**
 * GET /api/user/phone-number
 * Get the authenticated user's linked phone number
 *
 * Response:
 * 200 OK
 * {
 *   "phoneNumber": "+15555551234",
 *   "verified": true
 * }
 *
 * 404 Not Found - No phone number linked
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    // Get phone number from repository
    const { phoneNumberRepository } = await import('../../sms/phone-number-repository');
    const phoneRecord = await phoneNumberRepository.findByUserId(userId);

    if (!phoneRecord) {
      res.status(404).json({
        error: 'No phone number linked to this account',
        code: 'PHONE_NUMBER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      phoneNumber: phoneRecord.phoneNumber,
      verified: phoneRecord.verified,
    });
  })
);

/**
 * DELETE /api/user/phone-number
 * Unlink the authenticated user's phone number
 *
 * Requirement 1.5: Remove phone number association
 *
 * Response:
 * 204 No Content
 *
 * Error responses:
 * 404 Not Found - No phone number linked
 */
router.delete(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    // Check if phone number exists
    const { phoneNumberRepository } = await import('../../sms/phone-number-repository');
    const phoneRecord = await phoneNumberRepository.findByUserId(userId);

    if (!phoneRecord) {
      res.status(404).json({
        error: 'No phone number linked to this account',
        code: 'PHONE_NUMBER_NOT_FOUND',
      });
      return;
    }

    // Unlink phone number
    await phoneNumberService.unlinkPhoneNumber(userId);

    res.status(204).send();
  })
);

export default router;
