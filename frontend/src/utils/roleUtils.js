/**
 * Role management utilities for user authentication and authorization
 */

/**
 * Available user roles in the system
 */
export const USER_ROLES = {
  ORGANIZER: 'organizer',
  ATTENDEE: 'attendee'
};

/**
 * Default role for new users
 * @returns {string} Default role
 */
export const getDefaultRole = () => {
  return USER_ROLES.ATTENDEE;
};

/**
 * Set user role in session storage with user-specific key
 * @param {string} role - The role to store
 * @param {string} userId - The user ID (optional, will use current user if not provided)
 */
export const setRoleInStorage = (role, userId = null) => {
  try {
    // If no userId provided, try to get from current user context
    if (!userId) {
      // This would typically come from auth context
      // For now, we'll use a generic key
      const currentUserId = getCurrentUserId();
      if (currentUserId) {
        userId = currentUserId;
      }
    }

    if (userId) {
      // Store role per user to avoid cross-tab bleed
      sessionStorage.setItem(`role:${userId}`, role);
      console.log(`✅ Role stored for user ${userId}: ${role}`);
    } else {
      // Fallback to generic storage
      sessionStorage.setItem('userRole', role);
      console.log(`✅ Role stored (generic): ${role}`);
    }
  } catch (error) {
    console.error('Error storing role in session storage:', error);
  }
};

/**
 * Get user role from session storage
 * @param {string} userId - The user ID (optional)
 * @returns {string|null} The stored role or null if not found
 */
export const getRoleFromStorage = (userId = null) => {
  try {
    if (!userId) {
      userId = getCurrentUserId();
    }

    if (userId) {
      return sessionStorage.getItem(`role:${userId}`);
    } else {
      return sessionStorage.getItem('userRole');
    }
  } catch (error) {
    console.error('Error getting role from session storage:', error);
    return null;
  }
};

/**
 * Clear user role from session storage
 * @param {string} userId - The user ID (optional)
 */
export const clearRoleFromStorage = (userId = null) => {
  try {
    if (!userId) {
      userId = getCurrentUserId();
    }

    if (userId) {
      sessionStorage.removeItem(`role:${userId}`);
    } else {
      sessionStorage.removeItem('userRole');
    }
    
    console.log(`🗑️ Role cleared for user ${userId || 'generic'}`);
  } catch (error) {
    console.error('Error clearing role from session storage:', error);
  }
};

/**
 * Validate if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Get role display name
 * @param {string} role - The role
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [USER_ROLES.ORGANIZER]: 'Event Organizer',
    [USER_ROLES.ATTENDEE]: 'Event Attendee'
  };
  
  return displayNames[role] || 'Unknown Role';
};

/**
 * Get role icon (for UI display)
 * @param {string} role - The role
 * @returns {string} Icon name or class
 */
export const getRoleIcon = (role) => {
  const icons = {
    [USER_ROLES.ORGANIZER]: 'FaCrown',
    [USER_ROLES.ATTENDEE]: 'FaUsers'
  };
  
  return icons[role] || 'FaUser';
};

/**
 * Check if user has organizer permissions
 * @param {string} role - The user's role
 * @returns {boolean} True if user is an organizer
 */
export const isOrganizer = (role) => {
  return role === USER_ROLES.ORGANIZER;
};

/**
 * Check if user has attendee permissions
 * @param {string} role - The user's role
 * @returns {boolean} True if user is an attendee
 */
export const isAttendee = (role) => {
  return role === USER_ROLES.ATTENDEE;
};

/**
 * Log role information for debugging
 * @param {string} context - Context where role is being used
 * @param {string} role - The role
 * @param {string} email - User email (optional)
 */
export const logRoleInfo = (context, role, email = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context}: Role=${role}${email ? `, Email=${email}` : ''}`;
  
  console.log(`👤 Role Info: ${logMessage}`);
  
  // Store in session storage for debugging
  try {
    const existingLogs = JSON.parse(sessionStorage.getItem('roleLogs') || '[]');
    existingLogs.push({
      timestamp,
      context,
      role,
      email,
      message: logMessage
    });
    
    // Keep only last 50 logs
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50);
    }
    
    sessionStorage.setItem('roleLogs', JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Error storing role log:', error);
  }
};

/**
 * Get role logs for debugging
 * @returns {Array} Array of role log entries
 */
export const getRoleLogs = () => {
  try {
    return JSON.parse(sessionStorage.getItem('roleLogs') || '[]');
  } catch (error) {
    console.error('Error getting role logs:', error);
    return [];
  }
};

/**
 * Clear role logs
 */
export const clearRoleLogs = () => {
  try {
    sessionStorage.removeItem('roleLogs');
    console.log('🗑️ Role logs cleared');
  } catch (error) {
    console.error('Error clearing role logs:', error);
  }
};

/**
 * Get current user ID from various sources
 * @returns {string|null} Current user ID or null
 */
const getCurrentUserId = () => {
  try {
    // Try to get from Firebase auth context
    // This would typically be passed from the auth context
    // For now, we'll return null and let the calling code handle it
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Role-based access control helper
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The required role for access
 * @returns {boolean} True if user has required access
 */
export const hasRoleAccess = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) {
    return false;
  }

  // Organizers have access to everything
  if (userRole === USER_ROLES.ORGANIZER) {
    return true;
  }

  // Attendees only have access to attendee-level features
  if (userRole === USER_ROLES.ATTENDEE && requiredRole === USER_ROLES.ATTENDEE) {
    return true;
  }

  return false;
};

/**
 * Get role permissions
 * @param {string} role - The role
 * @returns {object} Object containing permission flags
 */
export const getRolePermissions = (role) => {
  const permissions = {
    canCreateEvents: false,
    canDeleteEvents: false,
    canUploadPhotos: false,
    canViewPhotos: false,
    canMatchFaces: false,
    canManageUsers: false,
    canViewAnalytics: false
  };

  switch (role) {
    case USER_ROLES.ORGANIZER:
      permissions.canCreateEvents = true;
      permissions.canDeleteEvents = true;
      permissions.canUploadPhotos = true;
      permissions.canViewPhotos = true;
      permissions.canMatchFaces = true;
      permissions.canManageUsers = true;
      permissions.canViewAnalytics = true;
      break;
      
    case USER_ROLES.ATTENDEE:
      permissions.canUploadPhotos = true;
      permissions.canViewPhotos = true;
      permissions.canMatchFaces = true;
      break;
      
    default:
      // No permissions for unknown roles
      break;
  }

  return permissions;
};

