/**
 * Generate a random 6-character room code
 */
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generate a unique user ID
 */
export const generateUserId = () => {
  return 'user-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

/**
 * Validate room code format
 */
export const isValidRoomCode = (code) => {
  return /^[A-Z0-9]{6}$/.test(code);
};
