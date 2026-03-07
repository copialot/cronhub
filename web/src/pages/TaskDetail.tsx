import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Space, Typography, Row, Col } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import StatusBadge from '../components/common/StatusBadge';
import LogViewer from '../components/execution/LogViewer';
import TaskForm from '../components/task/TaskForm';
import { useTask, useRunTask } from '../hooks/useTasks';
import { useTaskExecutions, useTaskStats } from '../hooks/useStats';
import { formatTime, formatDuration, triggerText, describeCron } from '../lib/utils';
import { useLocale } from '../hooks/useLocale';
import type { ExecutionLog } from '../types';

const { Title } = Typography;

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const navigate = useNavigate();
  const { data: task } = useTask(taskId);
  const { data: execData } = useTaskExecutions(taskId);
  const { data: stats } = useTaskStats(taskId);
  const runTask = useRunTask();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);
  const { t } = useLocale();

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
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
          {t('taskDetail.view')}
        </Button>
      ),
    },
  ];

  if (!task) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tasks')} />
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            {task.name}
          </Title>
          <StatusBadge status={task.status} />
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>{t('taskDetail.edit')}</Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => runTask.mutate(taskId)}>
            {t('taskDetail.runManually')}
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('taskDetail.taskInfo')}</span>}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t('taskDetail.cronExpr')}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-info)' }}>{task.cron_expr}</span>
                <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 12 }}>{describeCron(task.cron_expr)}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.workingDir')}>{task.working_dir || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.timeout')}>{task.timeout}{t('taskDetail.seconds')}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.retry')}>{task.retry_count}{t('taskDetail.times')}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.lastRun')}>{formatTime(task.last_run_at)}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.nextRun')}>{formatTime(task.next_run_at)}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.command')} span={2}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  background: 'var(--bg-secondary)', padding: '8px 12px',
                  borderRadius: 6, border: '1px solid var(--border-color)',
                }}>
                  {task.command}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('taskDetail.stats')}</span>}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('taskDetail.totalExecs')}>{stats?.total_executions ?? 0}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.successRate')}>
                <span style={{ color: 'var(--accent-success)' }}>{stats?.success_rate?.toFixed(1) ?? 0}%</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.avgDuration')}>{formatDuration(stats?.avg_duration ?? 0)}</Descriptions.Item>
              <Descriptions.Item label={t('taskDetail.maxDuration')}>{formatDuration(stats?.max_duration ?? 0)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('taskDetail.execHistory')}</span>} style={{ marginTop: 16 }}>
        <Table
          dataSource={execData?.data || []}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, total: execData?.total }}
          size="small"
        />
      </Card>

      {selectedExec && (
        <Card
          title={
            <Space>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{t('taskDetail.execLog')} #{selectedExec.id}</span>
              <StatusBadge status={selectedExec.status} />
            </Space>
          }
          style={{ marginTop: 16 }}
          extra={<Button type="text" onClick={() => setSelectedExec(null)}>{t('taskDetail.close')}</Button>}
        >
          <LogViewer
            executionId={selectedExec.status === 'running' ? selectedExec.id : null}
            staticOutput={selectedExec.output}
            staticError={selectedExec.error_output}
          />
        </Card>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={task} />
    </div>
  );
}
