import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function setDayjsLocale(locale: string) {
  const map: Record<string, string> = {
    'zh-CN': 'zh-cn',
    'zh-TW': 'zh-tw',
    'en': 'en',
  };
  dayjs.locale(map[locale] || 'en');
}

export function formatTime(t: string | null): string {
  if (!t) return '-';
  return dayjs(t).format('MM-DD HH:mm:ss');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export function timeAgo(t: string | null): string {
  if (!t) return '-';
  return dayjs(t).fromNow();
}

export function statusColor(status: string): string {
  switch (status) {
    case 'success': case 'idle': return 'var(--accent-success)';
    case 'running': return 'var(--accent-primary)';
    case 'failed': case 'timeout': return 'var(--accent-danger)';
    default: return 'var(--text-secondary)';
  }
}

export function statusText(status: string, t: (key: string) => string): string {
  const key = `status.${status}`;
  const result = t(key);
  return result === key ? status : result;
}

export function triggerText(trigger: string, t: (key: string) => string): string {
  return trigger === 'manual' ? t('trigger.manual') : t('trigger.schedule');
}
