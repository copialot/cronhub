import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, groupApi } from '../api/client';
import type { CreateTaskRequest, CreateGroupRequest } from '../types';
import { message } from 'antd';

export function useTasks(groupId?: number) {
  return useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => taskApi.list(groupId ? { group_id: groupId } : undefined),
  });
}

export function useTask(id: number, refetchInterval?: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.get(id),
    enabled: !!id,
    refetchInterval,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success('任务创建成功');
    },
    onError: () => message.error('创建失败'),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTaskRequest }) => taskApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
      message.success('任务更新成功');
    },
    onError: () => message.error('更新失败'),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => taskApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success('任务已删除');
    },
    onError: () => message.error('删除失败'),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => taskApi.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function useRunTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => taskApi.run(id) as Promise<{ message: string; execution_id: number }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
      qc.invalidateQueries({ queryKey: ['executions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      message.success('任务已触发执行');
    },
    onError: () => message.error('触发失败'),
  });
}

// 分组
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.list(),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      message.success('分组创建成功');
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => groupApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success('分组已删除');
    },
  });
}
