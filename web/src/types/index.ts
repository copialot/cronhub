export interface TaskGroup {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

export type TaskStatus = 'idle' | 'running' | 'failed';

export interface Task {
  id: number;
  name: string;
  group_id: number | null;
  group?: TaskGroup;
  cron_expr: string;
  command: string;
  working_dir: string;
  timeout: number;
  retry_count: number;
  enabled: boolean;
  status: TaskStatus;
  env_vars: Record<string, string>;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ExecStatus = 'running' | 'success' | 'failed' | 'timeout';
export type TriggerType = 'schedule' | 'manual';

export interface ExecutionLog {
  id: number;
  task_id: number;
  task?: Task;
  status: ExecStatus;
  exit_code: number | null;
  output: string;
  error_output: string;
  duration_ms: number;
  trigger_type: TriggerType;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

export interface AlertConfig {
  id: number;
  task_id: number | null;
  task?: Task;
  type: 'email' | 'webhook' | 'slack' | 'dingtalk' | 'feishu' | 'telegram';
  endpoint: string;
  on_failure: boolean;
  on_timeout: boolean;
  on_success: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatsOverview {
  total_tasks: number;
  running_tasks: number;
  today_success: number;
  today_failed: number;
  today_total: number;
  total_executions: number;
}

export interface DailyStats {
  date: string;
  total: number;
  success: number;
  failed: number;
  success_rate: number;
  avg_duration: number;
}

export interface TaskStats {
  total_executions: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  avg_duration: number;
  max_duration: number;
  min_duration: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface CreateTaskRequest {
  name: string;
  group_id?: number | null;
  cron_expr: string;
  command: string;
  working_dir?: string;
  timeout?: number;
  retry_count?: number;
  enabled?: boolean;
  env_vars?: Record<string, string>;
}

export interface CreateGroupRequest {
  name: string;
  color?: string;
  sort_order?: number;
}

export interface Script {
  id: number;
  name: string;
  language: 'shell' | 'python' | 'node';
  description: string;
  filename: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScriptRequest {
  name: string;
  language: string;
  description?: string;
  content?: string;
}

export interface CreateAlertRequest {
  task_id?: number | null;
  type: 'email' | 'webhook' | 'slack' | 'dingtalk' | 'feishu' | 'telegram';
  endpoint: string;
  on_failure?: boolean;
  on_timeout?: boolean;
  on_success?: boolean;
  enabled?: boolean;
}
