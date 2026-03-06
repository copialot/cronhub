import { Tag } from 'antd';
import { statusColor, statusText } from '../../lib/utils';
import { useLocale } from '../../hooks/useLocale';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLocale();
  const color = statusColor(status);
  return (
    <Tag
      style={{
        background: 'transparent',
        border: `1px solid ${color}`,
        color,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}
    >
      <span
        className={`status-dot ${status}`}
        style={{ backgroundColor: color }}
      />
      {statusText(status, t)}
    </Tag>
  );
}
