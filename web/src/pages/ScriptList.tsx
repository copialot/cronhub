import { Table, Button, Space, Popconfirm, Card, Tag, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useScripts, useDeleteScript } from '../hooks/useScripts';
import { useLocale } from '../hooks/useLocale';
import { formatTime } from '../lib/utils';
import type { Script } from '../types';

const { Title } = Typography;

const langColors: Record<string, string> = {
  shell: '#00d4aa',
  python: '#3572A5',
  node: '#f0b429',
};

export default function ScriptList() {
  const { data: scripts, isLoading } = useScripts();
  const deleteScript = useDeleteScript();
  const navigate = useNavigate();
  const { t } = useLocale();

  const columns = [
    {
      title: t('scriptList.col.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Script) => (
        <a
          onClick={() => navigate(`/scripts/${record.id}`)}
          style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
        >
          {name}
        </a>
      ),
    },
    {
      title: t('scriptList.col.language'),
      dataIndex: 'language',
      key: 'language',
      render: (lang: string) => (
        <Tag style={{ background: 'transparent', border: `1px solid ${langColors[lang] || '#64748b'}`, color: langColors[lang] || '#64748b' }}>
          {lang}
        </Tag>
      ),
    },
    {
      title: t('scriptList.col.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <span style={{ color: 'var(--text-secondary)' }}>{desc || '-'}</span>
      ),
    },
    {
      title: t('scriptList.col.updatedAt'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatTime(v)}</span>,
    },
    {
      title: t('col.actions'),
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Script) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            style={{ color: 'var(--accent-info)' }}
            onClick={() => navigate(`/scripts/${record.id}`)}
          />
          <Popconfirm title={t('scriptList.deleteConfirm')} onConfirm={() => deleteScript.mutate(record.id)}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: 'var(--accent-danger)' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
          {t('scriptList.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/scripts/new')}>
          {t('scriptList.create')}
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={scripts}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="small"
        />
      </Card>
    </div>
  );
}
