import axios from 'axios';

export const API_BASE_URL = 'https://gym-admin-api.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  join_date?: string;
  expiry_date: string;
  is_active?: boolean;
};