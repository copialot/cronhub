import { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Space, Typography, Button, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from '../components/common/StatusBadge';
import LogViewer from '../components/execution/LogViewer';
import { executionApi } from '../api/client';
import { formatTime, formatDuration, triggerText } from '../lib/utils';
import { useLocale } from '../hooks/useLocale';
import type { ExecutionLog } from '../types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ExecutionHistory() {
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const pageSize = 20;
  const { t } = useLocale();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['executions', 'all', status, dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD'), debouncedKeyword, page],
    queryFn: () => executionApi.listAll({
      status,
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
      q: debouncedKeyword || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
  });

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: t('col.task'),
      dataIndex: ['task', 'name'],
      key: 'task',
      render: (name: string) => <span style={{ color: 'var(--accent-primary)' }}>{name}</span>,
    },
    { title: t('col.status'), dataIndex: 'status', key: 'status', render: (s: string) => <StatusBadge status={s} /> },
    { title: t('col.trigger'), dataIndex: 'trigger_type', key: 'trigger', render: (v: string) => triggerText(v, t) },
    { title: t('col.duration'), dataIndex: 'duration_ms', key: 'duration', render: formatDuration },
    { title: t('col.exitCode'), dataIndex: 'exit_code', key: 'exit_code', render: (v: number | null) => v ?? '-' },
    { title: t('col.time'), dataIndex: 'started_at', key: 'started_at', render: formatTime },
    {
      title: t('col.log'),
      key: 'log',
      render: (_: unknown, record: ExecutionLog) => (
        <Button type="link" size="small" onClick={() => setSelectedExec(record)}>
          {t('execHistory.view')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ color: 'var(--text-primary)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
        {t('execHistory.title')}
      </Title>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            placeholder={t('execHistory.searchPlaceholder')}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            placeholder={t('execHistory.filterStatus')}
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={v => { setStatus(v); setPage(1); }}
            options={[
              { label: t('status.success'), value: 'success' },
              { label: t('status.failed'), value: 'failed' },
              { label: t('status.timeout'), value: 'timeout' },
              { label: t('status.running'), value: 'running' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(v) => { setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null); setPage(1); }}
          />
        </Space>

        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
          }}
          size="small"
        />
      </Card>

      {selectedExec && (
        <Card
          title={
            <Space>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{t('execHistory.execLog')} #{selectedExec.id}</span>
              <StatusBadge status={selectedExec.status} />
            </Space>
          }
          style={{ marginTop: 16 }}
          extra={<Button type="text" onClick={() => setSelectedExec(null)}>{t('execHistory.close')}</Button>}
        >
          <LogViewer
            executionId={selectedExec.status === 'running' ? selectedExec.id : null}
            staticOutput={selectedExec.output}
            staticError={selectedExec.error_output}
          />
        </Card>
      )}
    </div>
  );
}
