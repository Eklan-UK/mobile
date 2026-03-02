import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storage
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const ONBOARDING_KEY = 'has_completed_onboarding';

/**
 * Secure storage utilities for authentication tokens
 */
export const secureStorage = {
  // Token operations (secure)
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  // User data operations (AsyncStorage for non-sensitive data)
  async setUser(user: any): Promise<void> {
    try {
      // JSON.stringify is synchronous but in async context, won't block UI
      // Add size check to prevent ANR with extremely large objects
      const userJson = JSON.stringify(user);
      if (userJson.length > 1 * 1024 * 1024) { // 1MB limit
        throw new Error('User data too large (>1MB), cannot store');
      }
      await AsyncStorage.setItem(USER_KEY, userJson);
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      if (!userData) return null;
      
      // JSON.parse is synchronous but in async context, won't block UI
      // Add timeout protection for very large data
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Return null on parse error to prevent app crash
      return null;
    }
  },

  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  // Onboarding flag
  async setOnboardingComplete(completed: boolean): Promise<void> {
    try {
      const value = JSON.stringify(completed);
      await AsyncStorage.setItem(ONBOARDING_KEY, value);
    } catch (error) {
      console.error('Error storing onboarding flag:', error);
      throw error;
    }
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!value) return false;
      return JSON.parse(value);
    } catch (error) {
      console.error('Error reading onboarding flag:', error);
      return false;
    }
  },

  async clearOnboarding(): Promise<void> {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  },

  // Generic storage methods for non-sensitive data
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  // Clear all auth data
  async clearAll(): Promise<void> {
    await this.clearTokens();
    await this.clearUser();
    // Note: We don't clear onboarding flag on logout
  },
};
