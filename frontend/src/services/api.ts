import axios from 'axios';

export const API_BASE_URL = 'https://gym-admin-api.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gym_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Plan = {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
};

export type Member = {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email?: string;
  plan_id?: string;
  join_date?: string;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
};

export type MemberCreatePayload = {
  full_name: string;
  phone: string;
  email?: string;
  plan_id?: string;
  join_date?: string;
  expiry_date: string;
  is_active?: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  gym_id: string;
  gym_name: string;
  owner_name: string;
};