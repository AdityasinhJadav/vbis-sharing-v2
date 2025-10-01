// Event utility functions for better event management

export const generateUniquePasscode = () => {
  // Generate a 6-character alphanumeric passcode
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validatePasscode = (passcode) => {
  // Validate passcode format: 4-10 uppercase alphanumeric characters
  return /^[A-Z0-9]{4,10}$/.test(passcode);
};

export const checkPasscodeAvailability = async (passcode, db) => {
  // Check if passcode is already in use
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const eventQuery = query(collection(db, 'events'), where('passcode', '==', passcode));
    const snapshot = await getDocs(eventQuery);
    return snapshot.empty; // true if available, false if taken
  } catch (error) {
    console.error('Error checking passcode availability:', error);
    return false; // Assume not available on error
  }
};

export const getEventById = async (eventId, db) => {
  // Get event by ID instead of passcode for better uniqueness
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (eventDoc.exists()) {
      return { id: eventDoc.id, ...eventDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return null;
  }
};

export const getEventByPasscode = async (passcode, db) => {
  // Get event by passcode (for backward compatibility)
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const eventQuery = query(collection(db, 'events'), where('passcode', '==', passcode.toUpperCase()));
    const snapshot = await getDocs(eventQuery);
    if (!snapshot.empty) {
      const eventDoc = snapshot.docs[0];
      return { id: eventDoc.id, ...eventDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching event by passcode:', error);
    return null;
  }
};

export const logEventInfo = (context, event) => {
  console.log(`[${context}] Event Info:`, {
    id: event?.id,
    name: event?.eventName,
    passcode: event?.passcode,
    organizerId: event?.organizerId
  });
};

