import { useQuery } from '@tanstack/react-query';
import { statsApi, executionApi } from '../api/client';

export function useStatsOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.overview(),
    refetchInterval: 10000,
  });
}

export function useTaskStats(taskId: number) {
  return useQuery({
    queryKey: ['stats', 'task', taskId],
    queryFn: () => statsApi.taskStats(taskId),
    enabled: !!taskId,
  });
}

export function useChartData(range: string = '7d') {
  return useQuery({
    queryKey: ['stats', 'chart', range],
    queryFn: () => statsApi.chart(range),
  });
}

export function useRecentExecutions(limit: number = 20) {
  return useQuery({
    queryKey: ['executions', 'recent', limit],
    queryFn: () => executionApi.recent(limit),
    refetchInterval: 10000,
  });
}

export function useTaskExecutions(taskId: number, limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['executions', 'task', taskId, limit, offset],
    queryFn: () => executionApi.listByTask(taskId, { limit, offset }),
    enabled: !!taskId,
  });
}
