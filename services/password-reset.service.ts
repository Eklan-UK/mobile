import apiClient from '@/lib/api';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface SendOTPResponse {
  code: string;
  message: string;
}

export interface VerifyOTPResponse {
  code: string;
  message: string;
  data?: {
    verified: boolean;
  };
}

export interface ResetPasswordResponse {
  code: string;
  message: string;
}

/**
 * Password Reset Service for Mobile App
 * Handles OTP-based password reset flow
 */
export const passwordResetService = {
  /**
   * Send OTP to email for password reset
   */
  sendOTP: async (email: string): Promise<SendOTPResponse> => {
    try {
      logger.log('📧 Sending password reset OTP...', { email });
      const response = await apiClient.post('/api/v1/auth/password/send-otp', {
        email,
      });
      
      logger.log('✅ OTP sent successfully');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to send OTP:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP';
      throw new Error(errorMessage);
    }
  },

  /**
   * Verify OTP code
   */
  verifyOTP: async (email: string, otp: string): Promise<VerifyOTPResponse> => {
    try {
      logger.log('🔐 Verifying OTP...', { email, otpLength: otp.length });
      const response = await apiClient.post('/api/v1/auth/password/verify-otp', {
        email,
        otp,
      });
      
      logger.log('✅ OTP verified successfully');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to verify OTP:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify OTP';
      throw new Error(errorMessage);
    }
  },

  /**
   * Reset password with verified OTP
   */
  resetPassword: async (email: string, otp: string, newPassword: string): Promise<ResetPasswordResponse> => {
    try {
      logger.log('🔑 Resetting password...', { email });
      const response = await apiClient.post('/api/v1/auth/password/reset-with-otp', {
        email,
        otp,
        newPassword,
      });
      
      logger.log('✅ Password reset successfully');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to reset password:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      throw new Error(errorMessage);
    }
  },
};




