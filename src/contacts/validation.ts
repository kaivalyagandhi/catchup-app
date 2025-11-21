/**
 * Contact Validation
 *
 * Input validation for contact data including phone, email, and social media handles.
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  if (email.length > 255) {
    errors.push('Email must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phone number format
 * Accepts various international formats
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone || phone.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()+.]/g, '');

  // Check if it contains only digits after cleaning
  if (!/^\d+$/.test(cleaned)) {
    errors.push(
      'Phone number must contain only digits and formatting characters (+, -, (), spaces)'
    );
  }

  // Check length (international numbers can be 7-15 digits)
  if (cleaned.length < 7 || cleaned.length > 15) {
    errors.push('Phone number must be between 7 and 15 digits');
  }

  if (phone.length > 50) {
    errors.push('Phone number must be 50 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate LinkedIn profile URL or username
 */
export function validateLinkedIn(linkedIn: string): ValidationResult {
  const errors: string[] = [];

  if (!linkedIn || linkedIn.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Accept full URLs or just usernames
  const urlRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;
  const usernameRegex = /^[a-zA-Z0-9-]+$/;

  if (!urlRegex.test(linkedIn) && !usernameRegex.test(linkedIn)) {
    errors.push('Invalid LinkedIn profile format. Use full URL or username');
  }

  if (linkedIn.length > 255) {
    errors.push('LinkedIn profile must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Instagram handle
 */
export function validateInstagram(instagram: string): ValidationResult {
  const errors: string[] = [];

  if (!instagram || instagram.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Remove @ if present
  const handle = instagram.startsWith('@') ? instagram.slice(1) : instagram;

  // Instagram usernames: 1-30 characters, letters, numbers, periods, underscores
  const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;

  if (!instagramRegex.test(handle)) {
    errors.push(
      'Invalid Instagram handle. Must be 1-30 characters (letters, numbers, periods, underscores)'
    );
  }

  if (instagram.length > 255) {
    errors.push('Instagram handle must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate X (Twitter) handle
 */
export function validateXHandle(xHandle: string): ValidationResult {
  const errors: string[] = [];

  if (!xHandle || xHandle.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Remove @ if present
  const handle = xHandle.startsWith('@') ? xHandle.slice(1) : xHandle;

  // X usernames: 1-15 characters, letters, numbers, underscores
  const xRegex = /^[a-zA-Z0-9_]{1,15}$/;

  if (!xRegex.test(handle)) {
    errors.push('Invalid X handle. Must be 1-15 characters (letters, numbers, underscores)');
  }

  if (xHandle.length > 255) {
    errors.push('X handle must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate contact name
 */
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (name && name.length > 255) {
    errors.push('Name must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all contact fields
 */
export function validateContactData(data: {
  name: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  instagram?: string;
  xHandle?: string;
}): ValidationResult {
  const allErrors: string[] = [];

  const nameResult = validateName(data.name);
  allErrors.push(...nameResult.errors);

  if (data.phone) {
    const phoneResult = validatePhone(data.phone);
    allErrors.push(...phoneResult.errors);
  }

  if (data.email) {
    const emailResult = validateEmail(data.email);
    allErrors.push(...emailResult.errors);
  }

  if (data.linkedIn) {
    const linkedInResult = validateLinkedIn(data.linkedIn);
    allErrors.push(...linkedInResult.errors);
  }

  if (data.instagram) {
    const instagramResult = validateInstagram(data.instagram);
    allErrors.push(...instagramResult.errors);
  }

  if (data.xHandle) {
    const xHandleResult = validateXHandle(data.xHandle);
    allErrors.push(...xHandleResult.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
