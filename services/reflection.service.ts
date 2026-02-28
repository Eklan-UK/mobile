import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

export interface DailyReflection {
  _id: string;
  content: string;  // Second input: "You can write a sentence... or just a few words"
  answer: string;   // First input: Answer to the prompt
  mood: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionListResponse {
  reflections: DailyReflection[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Daily Reflection service for managing reflections
 */
export const reflectionService = {
  /**
   * Get a single reflection by ID
   */
  async getReflectionById(id: string): Promise<DailyReflection> {
    try {
      logger.log('📤 Fetching reflection:', id);

      const response = await apiClient.get(`/api/v1/daily-reflections/${id}`);

      // API returns { reflection } directly
      const reflection = response.data?.reflection;
      if (!reflection) {
        throw new Error(response.data?.message || 'Reflection not found');
      }

      logger.log('✅ Reflection fetched successfully');
      
      return reflection;
    } catch (error: any) {
      logger.error('❌ Error fetching reflection:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch reflection');
    }
  },

  /**
   * Get all reflections for the current user
   */
  async getReflections(params?: {
    limit?: number;
    offset?: number;
    tag?: string;
  }): Promise<ReflectionListResponse> {
    try {
      logger.log('📤 Fetching reflections:', params);

      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.tag) queryParams.append('tag', params.tag);

      const response = await apiClient.get(
        `/api/v1/daily-reflections${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      );

      logger.log('✅ Reflections fetched successfully');
      
      // API returns { reflections, pagination } directly
      return {
        reflections: response.data?.reflections || [],
        pagination: response.data?.pagination || {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      };
    } catch (error: any) {
      logger.error('❌ Error fetching reflections:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch reflections');
    }
  },

  /**
   * Create a new reflection
   */
  async createReflection(data: {
    content: string;  // Second input: sentence/few words
    answer: string;   // First input: answer to prompt
    mood: string;
    prompt: string;
  }): Promise<DailyReflection> {
    try {
      logger.log('📤 Creating reflection:', data);

      const response = await apiClient.post('/api/v1/daily-reflections', data);

      // API returns { reflection } directly
      const reflection = response.data?.reflection;
      if (!reflection) {
        throw new Error(response.data?.message || 'Failed to create reflection');
      }

      logger.log('✅ Reflection created successfully');
      
      return reflection;
    } catch (error: any) {
      logger.error('❌ Error creating reflection:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create reflection');
    }
  },

  /**
   * Update a reflection
   */
  async updateReflection(
    id: string,
    data: {
      content?: string;  // Second input: sentence/few words
      answer?: string;   // First input: answer to prompt
      mood?: string;
      prompt?: string;
    }
  ): Promise<DailyReflection> {
    try {
      logger.log('📤 Updating reflection:', id, data);

      const response = await apiClient.put(`/api/v1/daily-reflections/${id}`, data);

      // API returns { reflection } directly
      const reflection = response.data?.reflection;
      if (!reflection) {
        throw new Error(response.data?.message || 'Failed to update reflection');
      }

      logger.log('✅ Reflection updated successfully');
      
      return reflection;
    } catch (error: any) {
      logger.error('❌ Error updating reflection:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update reflection');
    }
  },

  /**
   * Delete a reflection
   */
  async deleteReflection(id: string): Promise<void> {
    try {
      logger.log('📤 Deleting reflection:', id);

      await apiClient.delete(`/api/v1/daily-reflections/${id}`);

      logger.log('✅ Reflection deleted successfully');
    } catch (error: any) {
      logger.error('❌ Error deleting reflection:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete reflection');
    }
  },
};

