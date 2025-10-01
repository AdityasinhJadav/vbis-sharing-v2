// Role utility functions for debugging and management

export const ROLE_TYPES = {
  ORGANIZER: 'organizer',
  ATTENDEE: 'attendee'
};

export const getRoleFromStorage = () => {
  return localStorage.getItem('role');
};

export const setRoleInStorage = (role) => {
  localStorage.setItem('role', role);
  console.log('Role set in localStorage:', role);
};

export const clearRoleFromStorage = () => {
  localStorage.removeItem('role');
  console.log('Role cleared from localStorage');
};

export const validateRole = (role) => {
  return Object.values(ROLE_TYPES).includes(role);
};

export const getDefaultRole = () => {
  return ROLE_TYPES.ATTENDEE;
};

export const logRoleInfo = (context, role, userEmail = '') => {
  console.log(`[${context}] Role for ${userEmail}: ${role}`);
  console.log(`[${context}] Role is valid: ${validateRole(role)}`);
  console.log(`[${context}] localStorage role: ${getRoleFromStorage()}`);
};
