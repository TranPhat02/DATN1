/**
 * Auth API — TN Education Platform
 */
import axiosClient from './axiosClient';
import type { LoginResponse } from '../shared/types';

/**
 * Login using OAuth2 form data format (matches FastAPI's OAuth2PasswordRequestForm)
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const { data } = await axiosClient.post<LoginResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

/**
 * Change password (requires auth)
 */
export async function changePassword(oldPassword: string, newPassword: string) {
  const { data } = await axiosClient.put('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
}
