import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scriptApi } from '../api/client';
import type { CreateScriptRequest } from '../types';
import { message } from 'antd';

export function useScripts() {
  return useQuery({
    queryKey: ['scripts'],
    queryFn: () => scriptApi.list(),
  });
}

export function useScript(id: number) {
  return useQuery({
    queryKey: ['script', id],
    queryFn: () => scriptApi.get(id),
    enabled: !!id,
  });
}

export function useCreateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScriptRequest) => scriptApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scripts'] });
    },
    onError: () => message.error('创建失败'),
  });
}

export function useUpdateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateScriptRequest }) => scriptApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scripts'] });
      qc.invalidateQueries({ queryKey: ['script'] });
    },
    onError: () => message.error('更新失败'),
  });
}

export function useDeleteScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => scriptApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scripts'] });
    },
    onError: () => message.error('删除失败'),
  });
}
