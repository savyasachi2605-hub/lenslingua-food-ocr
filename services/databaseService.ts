import { HistoryItem, ExtractedItem } from "../types";

const HISTORY_KEY = 'lenslingua_user_history';
const USERS_KEY = 'lenslingua_users';

interface UserRecord {
  email: string;
  password: string;
}

// Fallback for ID generation if crypto.randomUUID is not available
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const databaseService = {
  /**
   * User Management
   */
  registerUser: (email: string, password: string): void => {
    const users = databaseService.getRawUsers();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (users.find(u => u.email === normalizedEmail)) {
      throw new Error("An account with this email already exists.");
    }
    
    users.push({ email: normalizedEmail, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  verifyUser: (email: string, password: string): boolean => {
    const users = databaseService.getRawUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email === normalizedEmail);
    return user ? user.password === password : false;
  },

  getRawUsers: (): UserRecord[] => {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Saves a translation event for a specific user and returns the new ID.
   */
  saveHistory: (email: string, type: 'scan' | 'audio', targetLanguage: string, items: ExtractedItem[]): string => {
    if (!email) return '';
    const history = databaseService.getRawHistory();
    const normalizedEmail = email.trim().toLowerCase();
    const newId = generateId();
    
    const newEntry: HistoryItem = {
      id: newId,
      email: normalizedEmail,
      type,
      timestamp: new Date().toISOString(),
      targetLanguage,
      items
    };
    
    history.push(newEntry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.debug(`LensLingua: Record saved with ID ${newId}`);
    return newId;
  },

  /**
   * Retrieves history exclusively for the logged-in user.
   */
  getUserHistory: (email: string): HistoryItem[] => {
    if (!email) return [];
    const history = databaseService.getRawHistory();
    const normalizedEmail = email.trim().toLowerCase();
    
    return history
      .filter(item => (item.email || '').trim().toLowerCase() === normalizedEmail)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Clears history only for a specific user.
   */
  clearUserHistory: (email: string): void => {
    if (!email) return;
    const history = databaseService.getRawHistory();
    const normalizedEmail = email.trim().toLowerCase();
    
    const filtered = history.filter(item => {
      const itemEmail = (item.email || '').trim().toLowerCase();
      return itemEmail !== normalizedEmail;
    });
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  },

  /**
   * Deletes a single item from history.
   */
  deleteHistoryItem: (email: string, itemId: string): void => {
    if (!email || !itemId) return;
    const history = databaseService.getRawHistory();
    const normalizedEmail = email.trim().toLowerCase();
    
    // Explicit search for precise deletion
    const index = history.findIndex(item => {
      const isOwner = (item.email || '').trim().toLowerCase() === normalizedEmail;
      return item.id === itemId && isOwner;
    });
    
    if (index !== -1) {
      history.splice(index, 1);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      console.debug(`LensLingua: Record ${itemId} deleted from local database.`);
    } else {
      console.warn(`LensLingua: Failed to find record ${itemId} for deletion.`);
    }
  },

  /**
   * Internal helper to get all records from local storage.
   */
  getRawHistory: (): HistoryItem[] => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse history database:", e);
      return [];
    }
  }
};