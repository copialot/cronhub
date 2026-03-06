import { Row, Col, Card, Table, Typography } from 'antd';
import {
  ScheduleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/stats/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { useStatsOverview, useChartData, useRecentExecutions } from '../hooks/useStats';
import { formatTime, formatDuration, triggerText } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';

const { Title } = Typography;

export default function Dashboard() {
  const { data: stats } = useStatsOverview();
  const { data: chartData } = useChartData('7d');
  const { data: recentExecs } = useRecentExecutions(10);
  const navigate = useNavigate();
  const { t } = useLocale();

  const columns = [
    {
      title: t('col.task'),
      dataIndex: ['task', 'name'],
      key: 'task',
      render: (name: string, record: { task_id: number }) => (
        <a onClick={() => navigate(`/tasks/${record.task_id}`)}
          style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>{name}</a>
      ),
    },
    { title: t('col.status'), dataIndex: 'status', key: 'status', render: (s: string) => <StatusBadge status={s} /> },
    { title: t('col.trigger'), dataIndex: 'trigger_type', key: 'trigger', render: (v: string) => triggerText(v, t) },
    { title: t('col.duration'), dataIndex: 'duration_ms', key: 'duration', render: formatDuration },
    { title: t('col.time'), dataIndex: 'started_at', key: 'time', render: formatTime },
  ];

  return (
    <div>
      <Title level={4} style={{ color: 'var(--text-primary)', marginBottom: 24, fontFamily: 'var(--font-mono)' }}>
        {t('dashboard.title')}
      </Title>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatCard title={t('dashboard.totalTasks')} value={stats?.total_tasks ?? 0} color="var(--accent-primary)" icon={<ScheduleOutlined />} />
        </Col>
        <Col span={6}>
          <StatCard title={t('dashboard.running')} value={stats?.running_tasks ?? 0} color="var(--accent-info)" icon={<PlayCircleOutlined />} />
        </Col>
        <Col span={6}>
          <StatCard title={t('dashboard.todaySuccess')} value={stats?.today_success ?? 0} color="var(--accent-success)" icon={<CheckCircleOutlined />} />
        </Col>
        <Col span={6}>
          <StatCard title={t('dashboard.todayFailed')} value={stats?.today_failed ?? 0} color="var(--accent-danger)" icon={<CloseCircleOutlined />} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('dashboard.successRate')}</span>}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Line type="monotone" dataKey="success_rate" stroke="var(--accent-primary)" strokeWidth={2} dot={false} name={t('dashboard.chart.successRate')} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('dashboard.dailyStats')}</span>}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="success" fill="var(--accent-success)" name={t('dashboard.chart.success')} radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" fill="var(--accent-danger)" name={t('dashboard.chart.failed')} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('dashboard.recentExecs')}</span>} style={{ marginTop: 16 }}>
        <Table
          dataSource={recentExecs || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
