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

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [minute, hour, dom, month, dow] = parts;

  // 每分钟
  if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return '每分钟';
  }

  // 每N分钟
  if (minute.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `每${minute.slice(2)}分钟`;
  }

  // 每小时整点
  if (minute === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return '每小时整点';
  }

  // 每小时的第N分钟
  if (/^\d+$/.test(minute) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `每小时第${minute}分`;
  }

  // 每N小时
  if (minute === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    return `每${hour.slice(2)}小时`;
  }

  const pad = (s: string) => s.padStart(2, '0');

  // 每天 HH:MM
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow === '*') {
    return `每天 ${pad(hour)}:${pad(minute)}`;
  }

  // 每周X HH:MM
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dom === '*' && month === '*' && /^\d+$/.test(dow)) {
    const d = parseInt(dow);
    return `每周${weekdays[d] || dow} ${pad(hour)}:${pad(minute)}`;
  }

  // 每月X日 HH:MM
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(dom) && month === '*' && dow === '*') {
    return `每月${dom}日 ${pad(hour)}:${pad(minute)}`;
  }

  // 其他：分段描述
  const desc: string[] = [];
  if (minute !== '*') desc.push(`分:${minute}`);
  if (hour !== '*') desc.push(`时:${hour}`);
  if (dom !== '*') desc.push(`日:${dom}`);
  if (month !== '*') desc.push(`月:${month}`);
  if (dow !== '*') desc.push(`周:${dow}`);
  return desc.join(' ');
}
