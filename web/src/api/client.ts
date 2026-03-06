import axios from 'axios';
import type {
  Task, TaskGroup, ExecutionLog, AlertConfig,
  StatsOverview, DailyStats, TaskStats,
  PaginatedResponse, CreateTaskRequest, CreateGroupRequest, CreateAlertRequest,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
});

// 请求拦截器 — 自动附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cronhub_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 — 401 时跳转登录
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('cronhub_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// 鉴权
export const authApi = {
  check: () =>
    api.get<{ auth_required: boolean; authenticated?: boolean }>('/auth/check').then(r => r.data),
  login: (token: string) =>
    api.post<{ ok: boolean; token?: string }>('/auth/login', { token }).then(r => r.data),
};

// 任务
export const taskApi = {
  list: (params?: { group_id?: number; enabled?: boolean }) =>
    api.get<Task[]>('/tasks', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<Task>(`/tasks/${id}`).then(r => r.data),
  create: (data: CreateTaskRequest) =>
    api.post<Task>('/tasks', data).then(r => r.data),
  update: (id: number, data: CreateTaskRequest) =>
    api.put<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/tasks/${id}`),
  toggle: (id: number) =>
    api.patch<Task>(`/tasks/${id}/toggle`).then(r => r.data),
  run: (id: number) =>
    api.post(`/tasks/${id}/run`).then(r => r.data),
};

// 分组
export const groupApi = {
  list: () =>
    api.get<TaskGroup[]>('/groups').then(r => r.data),
  create: (data: CreateGroupRequest) =>
    api.post<TaskGroup>('/groups', data).then(r => r.data),
  update: (id: number, data: CreateGroupRequest) =>
    api.put<TaskGroup>(`/groups/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/groups/${id}`),
};

// 执行记录
export const executionApi = {
  listByTask: (taskId: number, params?: { limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<ExecutionLog>>(`/tasks/${taskId}/executions`, { params }).then(r => r.data),
  get: (id: number) =>
    api.get<ExecutionLog>(`/executions/${id}`).then(r => r.data),
  recent: (limit?: number) =>
    api.get<ExecutionLog[]>('/executions/recent', { params: { limit } }).then(r => r.data),
  listAll: (params?: { status?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<ExecutionLog>>('/executions', { params }).then(r => r.data),
};

// 统计
export const statsApi = {
  overview: () =>
    api.get<StatsOverview>('/stats/overview').then(r => r.data),
  taskStats: (id: number) =>
    api.get<TaskStats>(`/stats/tasks/${id}`).then(r => r.data),
  chart: (range?: string) =>
    api.get<DailyStats[]>('/stats/chart', { params: { range } }).then(r => r.data),
};

// 告警
export const alertApi = {
  list: () =>
    api.get<AlertConfig[]>('/alerts').then(r => r.data),
  create: (data: CreateAlertRequest) =>
    api.post<AlertConfig>('/alerts', data).then(r => r.data),
  update: (id: number, data: CreateAlertRequest) =>
    api.put<AlertConfig>(`/alerts/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/alerts/${id}`),
  test: (data: { type: string; endpoint: string }) =>
    api.post('/alerts/test', data).then(r => r.data),
};
