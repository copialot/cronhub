import { Input, Select, Space, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { useLocale } from '../../hooks/useLocale';

const { Text } = Typography;

interface CronEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function CronEditor({ value = '* * * * *', onChange }: CronEditorProps) {
  const { t } = useLocale();
  const [parts, setParts] = useState<string[]>(value.split(/\s+/).slice(0, 5));

  const presets = [
    { label: t('cron.everyMinute'), value: '* * * * *' },
    { label: t('cron.every5Min'), value: '*/5 * * * *' },
    { label: t('cron.everyHour'), value: '0 * * * *' },
    { label: t('cron.daily0'), value: '0 0 * * *' },
    { label: t('cron.daily6'), value: '0 6 * * *' },
    { label: t('cron.weeklyMon9'), value: '0 9 * * 1' },
    { label: t('cron.monthly1st'), value: '0 0 1 * *' },
  ];

  const fieldLabels = [
    t('cron.minute'), t('cron.hour'), t('cron.day'), t('cron.month'), t('cron.weekday'),
  ];

  useEffect(() => {
    const newParts = value.split(/\s+/).slice(0, 5);
    if (newParts.length === 5) setParts(newParts);
  }, [value]);

  const updatePart = (index: number, val: string) => {
    const newParts = [...parts];
    newParts[index] = val || '*';
    setParts(newParts);
    onChange?.(newParts.join(' '));
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          placeholder={t('cron.selectPreset')}
          options={presets}
          onChange={(v) => onChange?.(v)}
          style={{ width: '100%' }}
          allowClear
        />

        <div style={{ display: 'flex', gap: 8 }}>
          {parts.map((part, i) => (
            <div key={i} style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {fieldLabels[i]}
              </Text>
              <Input
                value={part}
                onChange={(e) => updatePart(i, e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                size="small"
              />
            </div>
          ))}
        </div>

        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--accent-primary)',
          textAlign: 'center',
          border: '1px solid var(--border-color)',
        }}>
          {parts.join(' ')}
        </div>
      </Space>
    </div>
  );
}
