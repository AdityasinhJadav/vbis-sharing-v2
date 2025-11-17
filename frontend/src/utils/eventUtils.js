/**
 * Event utility functions for passcode generation and validation
 */

import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Generate a unique passcode for events
 * @returns {string} A 6-character uppercase alphanumeric passcode
 */
export const generateUniquePasscode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate passcode format
 * @param {string} passcode - The passcode to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validatePasscode = (passcode) => {
  if (!passcode || typeof passcode !== 'string') {
    return false;
  }
  
  // Must be 4-10 characters, uppercase letters or digits only
  const regex = /^[A-Z0-9]{4,10}$/;
  return regex.test(passcode);
};

/**
 * Check if a passcode is available (not already in use)
 * @param {string} passcode - The passcode to check
 * @param {object} db - Firebase Firestore database instance
 * @returns {Promise<boolean>} True if available, false if already in use
 */
export const checkPasscodeAvailability = async (passcode, db) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('passcode', '==', passcode));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty; // True if no documents found (available)
  } catch (error) {
    console.error('Error checking passcode availability:', error);
    return false; // Assume not available on error
  }
};

/**
 * Generate a unique passcode that's guaranteed to be available
 * @param {object} db - Firebase Firestore database instance
 * @param {number} maxAttempts - Maximum attempts to find unique passcode (default: 10)
 * @returns {Promise<string>} A unique passcode
 */
export const generateAvailablePasscode = async (db, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const passcode = generateUniquePasscode();
    const isAvailable = await checkPasscodeAvailability(passcode, db);
    
    if (isAvailable) {
      return passcode;
    }
  }
  
  // If we can't find a unique passcode, throw an error
  throw new Error('Unable to generate unique passcode after maximum attempts');
};

/**
 * Format passcode for display (adds spaces for readability)
 * @param {string} passcode - The passcode to format
 * @returns {string} Formatted passcode with spaces
 */
export const formatPasscode = (passcode) => {
  if (!passcode || passcode.length < 4) {
    return passcode;
  }
  
  // Add spaces every 2-3 characters for better readability
  if (passcode.length <= 6) {
    return passcode.match(/.{1,3}/g)?.join(' ') || passcode;
  } else {
    return passcode.match(/.{1,2}/g)?.join(' ') || passcode;
  }
};

/**
 * Validate event name
 * @param {string} name - The event name to validate
 * @returns {object} Validation result with isValid and message
 */
export const validateEventName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: 'Event name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { isValid: false, message: 'Event name must be at least 3 characters' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, message: 'Event name must be less than 100 characters' };
  }
  
  return { isValid: true, message: 'Valid event name' };
};

/**
 * Validate event description
 * @param {string} description - The event description to validate
 * @returns {object} Validation result with isValid and message
 */
export const validateEventDescription = (description) => {
  if (!description || typeof description !== 'string') {
    return { isValid: true, message: 'Description is optional' }; // Description is optional
  }
  
  const trimmed = description.trim();
  if (trimmed.length > 500) {
    return { isValid: false, message: 'Description must be less than 500 characters' };
  }
  
  return { isValid: true, message: 'Valid description' };
};
