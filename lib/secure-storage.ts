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
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  // Onboarding flag
  async setOnboardingComplete(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(completed));
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value ? JSON.parse(value) : false;
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
