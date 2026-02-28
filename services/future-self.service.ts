import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

export interface FutureSelfVideo {
  _id: string;
  videoUrl: string;
  publicId: string;
  duration?: number;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Future Self service for managing future self videos
 */
export const futureSelfService = {
  /**
   * Get the current user's future self video (only one per user)
   */
  async getMyFutureSelf(): Promise<FutureSelfVideo | null> {
    try {
      logger.log('📤 Fetching future self video');

      const response = await apiClient.get('/api/v1/future-self');

      const videos = response.data?.videos || [];
      
      // Return the first video (should only be one due to unique constraint)
      const video = videos.length > 0 ? videos[0] : null;

      logger.log('✅ Future self video fetched:', video ? 'exists' : 'not found');
      
      return video;
    } catch (error: any) {
      logger.error('❌ Error fetching future self video:', error);
      // Return null if not found (404) or other errors
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch future self video');
    }
  },
};

