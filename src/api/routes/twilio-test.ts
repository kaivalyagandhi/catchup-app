/**
 * Twilio Testing API Routes
 *
 * Provides endpoints for testing Twilio integration from the web UI
 */

import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/**
 * GET /api/twilio/test/config
 * Test Twilio configuration
 */
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Check if credentials are configured
    if (!accountSid || accountSid === 'your_twilio_account_sid') {
      res.json({
        success: false,
        error: 'TWILIO_ACCOUNT_SID not configured in environment variables',
      });
      return;
    }

    if (!authToken || authToken === 'your_twilio_auth_token') {
      res.json({
        success: false,
        error: 'TWILIO_AUTH_TOKEN not configured in environment variables',
      });
      return;
    }

    if (!phoneNumber || phoneNumber === '+15555556789') {
      res.json({
        success: false,
        error: 'TWILIO_PHONE_NUMBER not configured in environment variables',
      });
      return;
    }

    // Validate Account SID format
    if (!accountSid.startsWith('AC')) {
      res.json({
        success: false,
        error: 'TWILIO_ACCOUNT_SID should start with "AC"',
      });
      return;
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      res.json({
        success: false,
        error: 'TWILIO_PHONE_NUMBER should start with "+" (E.164 format)',
      });
      return;
    }

    // Try to initialize Twilio client and verify credentials
    try {
      const client = twilio(accountSid, authToken);

      // Verify credentials by fetching account info
      const account = await client.api.accounts(accountSid).fetch();

      res.json({
        success: true,
        accountSid: accountSid,
        phoneNumber: phoneNumber,
        accountName: account.friendlyName,
        accountStatus: account.status,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: `Failed to verify Twilio credentials: ${error.message}`,
        errorCode: error.code,
      });
    }
  })
);

/**
 * GET /api/twilio/test/phone
 * Verify phone number and capabilities
 */
router.get(
  '/phone',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      res.json({
        success: false,
        error: 'Twilio credentials not configured',
      });
      return;
    }

    try {
      const client = twilio(accountSid, authToken);

      // Fetch phone number details
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
      });

      if (phoneNumbers.length === 0) {
        res.json({
          success: false,
          error: `Phone number ${phoneNumber} not found in your Twilio account`,
        });
        return;
      }

      const phone = phoneNumbers[0];

      res.json({
        success: true,
        phoneNumber: phone.phoneNumber,
        friendlyName: phone.friendlyName,
        capabilities: {
          sms: phone.capabilities.sms,
          mms: phone.capabilities.mms,
          voice: phone.capabilities.voice,
        },
        webhookUrl: phone.smsUrl || null,
        method: phone.smsMethod || null,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: `Failed to verify phone number: ${error.message}`,
        errorCode: error.code,
      });
    }
  })
);

/**
 * POST /api/twilio/test/send-sms
 * Send a test SMS message
 */
router.post(
  '/send-sms',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { to } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        error: 'Recipient phone number (to) is required',
      });
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      res.json({
        success: false,
        error: 'Twilio credentials not configured',
      });
      return;
    }

    try {
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        body: 'Test message from CatchUp! Your Twilio integration is working correctly. 🎉',
        from: fromNumber,
        to: to,
      });

      res.json({
        success: true,
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: error.message,
        errorCode: error.code,
        moreInfo: error.moreInfo,
      });
    }
  })
);

/**
 * GET /api/twilio/test/webhook
 * Check webhook configuration
 */
router.get(
  '/webhook',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      res.json({
        success: false,
        error: 'Twilio credentials not configured',
      });
      return;
    }

    try {
      const client = twilio(accountSid, authToken);

      // Fetch phone number details
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber,
      });

      if (phoneNumbers.length === 0) {
        res.json({
          success: false,
          error: `Phone number ${phoneNumber} not found`,
        });
        return;
      }

      const phone = phoneNumbers[0];
      const webhookConfigured = !!phone.smsUrl;

      res.json({
        success: true,
        configured: webhookConfigured,
        webhookUrl: phone.smsUrl || null,
        method: phone.smsMethod || null,
        statusCallback: phone.statusCallback || null,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: `Failed to check webhook: ${error.message}`,
        errorCode: error.code,
      });
    }
  })
);

export default router;
