import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system/legacy';
import { secureStorage } from '@/lib/secure-storage';

/**
 * Profile service for managing user profile
 */
export const profileService = {
  /**
   * Upload avatar image
   * Uses XMLHttpRequest for better FormData handling in React Native
   */
  async uploadAvatar(imageUri: string): Promise<string> {
    try {
      logger.log('📤 Uploading avatar:', imageUri);

      // Get file info to determine MIME type
      const fileName = imageUri.split('/').pop() || 'avatar.jpg';
      const mimeType = fileName.endsWith('.png') 
        ? 'image/png' 
        : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/jpeg'; // Default to JPEG

      // Get auth token and API URL
      const token = await secureStorage.getToken();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      // Create FormData
      const formData = new FormData();
      
      // React Native FormData format
      // @ts-ignore - React Native FormData accepts this format
      formData.append('avatar', {
        uri: imageUri,
        type: mimeType,
        name: `avatar_${Date.now()}.${mimeType.split('/')[1]}`,
      } as any);

      // Upload using XMLHttpRequest (better for file uploads in React Native)
      const response = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed - network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${API_BASE_URL}/api/v1/users/avatar`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        // Don't set Content-Type - let the browser/React Native set it with boundary

        xhr.send(formData as any);
      });

      if (response?.code !== 'Success') {
        throw new Error(response?.message || 'Failed to upload avatar');
      }

      const avatarUrl = response?.data?.avatarUrl;
      logger.log('✅ Avatar uploaded successfully:', avatarUrl);
      
      return avatarUrl;
    } catch (error: any) {
      logger.error('❌ Error uploading avatar:', error);
      throw new Error(error.message || 'Failed to upload avatar');
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
  }): Promise<any> {
    try {
      logger.log('📤 Updating profile:', data);

      const response = await apiClient.patch('/api/v1/users/profile', data);

      if (response.data?.code !== 'Success') {
        throw new Error(response.data?.message || 'Failed to update profile');
      }

      const user = response.data?.data?.user;
      logger.log('✅ Profile updated successfully');
      
      return user;
    } catch (error: any) {
      logger.error('❌ Error updating profile:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  },
};

