// =============================================================================
// SMS SERVICE - Twilio Integration
// =============================================================================

import twilio from 'twilio';

// =============================================================================
// TYPES
// =============================================================================

interface SMSOptions {
  to: string;
  body: string;
}

// =============================================================================
// CREATE TWILIO CLIENT
// =============================================================================

const createTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  return twilio(accountSid, authToken);
};

// =============================================================================
// SEND SMS
// =============================================================================

export async function sendSMS(options: SMSOptions): Promise<void> {
  const client = createTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error('Twilio phone number not configured');
  }

  try {
    await client.messages.create({
      body: options.body,
      from: fromNumber,
      to: options.to,
    });
    console.log(`SMS sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error('Failed to send SMS');
  }
}

// =============================================================================
// FORMAT PHONE NUMBER
// =============================================================================

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

// =============================================================================
// VALIDATE PHONE NUMBER
// =============================================================================

export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic validation: + followed by 10-15 digits
  return /^\+\d{10,15}$/.test(formatted);
}
