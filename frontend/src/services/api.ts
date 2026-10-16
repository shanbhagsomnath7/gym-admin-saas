import axios from 'axios';

// Live Render API URL
export const API_BASE_URL = 'https://gym-admin-api.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export type AttendanceOut = {
  id: string;
  gym_id: string;
  member_id: string;
  check_in_date: string;
  check_in_time: string;
};