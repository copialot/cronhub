import { useState } from 'react';
import { Table, Button, Space, Switch, Popconfirm, Card, Tag, Input, Typography, ColorPicker } from 'antd';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined, SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/common/StatusBadge';
import TaskForm from '../components/task/TaskForm';
import { useTasks, useDeleteTask, useToggleTask, useRunTask, useGroups, useCreateGroup, useDeleteGroup } from '../hooks/useTasks';
import { formatTime, timeAgo, describeCron } from '../lib/utils';
import { useLocale } from '../hooks/useLocale';
import type { Task } from '../types';

const { Title } = Typography;

export default function TaskList() {
  const [selectedGroup, setSelectedGroup] = useState<number | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#00d4aa');

  const { data: tasks, isLoading } = useTasks(selectedGroup);
  const { data: groups } = useGroups();
  const deleteTask = useDeleteTask();
  const toggleTask = useToggleTask();
  const runTask = useRunTask();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const navigate = useNavigate();
  const { t } = useLocale();

  const filteredTasks = tasks?.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.command.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(
      { name: newGroupName.trim(), color: newGroupColor },
      {
        onSuccess: () => {
          setAddingGroup(false);
          setNewGroupName('');
          setNewGroupColor('#00d4aa');
        },
      }
    );
  };

  const columns = [
    {
      title: t('taskList.col.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Task) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}
          style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>{name}</a>
      ),
    },
    {
      title: t('taskList.col.group'),
      dataIndex: 'group',
      key: 'group',
      render: (group: Task['group']) => group ? (
        <Tag style={{ background: 'transparent', border: `1px solid ${group.color}`, color: group.color }}>
          {group.name}
        </Tag>
      ) : '-',
    },
    {
      title: 'Cron',
      dataIndex: 'cron_expr',
      key: 'cron',
      render: (v: string) => (
        <span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-info)' }}>{v}</span>
          <span style={{ marginLeft: 6, color: 'var(--text-secondary)', fontSize: 11 }}>{describeCron(v)}</span>
        </span>
      ),
    },
    { title: t('col.status'), dataIndex: 'status', key: 'status', render: (s: string) => <StatusBadge status={s} /> },
    {
      title: t('taskList.col.lastRun'),
      dataIndex: 'last_run_at',
      key: 'last_run',
      render: (v: string | null) => <span title={formatTime(v)}>{timeAgo(v)}</span>,
    },
    {
      title: t('taskList.col.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: Task) => (
        <Switch size="small" checked={enabled} onChange={() => toggleTask.mutate(record.id)} />
      ),
    },
    {
      title: t('col.actions'),
      key: 'actions',
      render: (_: unknown, record: Task) => (
        <Space size="small">
          <Button type="text" size="small" icon={<PlayCircleOutlined />}
            style={{ color: 'var(--accent-primary)' }}
            onClick={() => runTask.mutate(record.id)}
          />
          <Button type="text" size="small" icon={<EditOutlined />}
            style={{ color: 'var(--accent-info)' }}
            onClick={() => { setEditTask(record); setFormOpen(true); }}
          />
          <Popconfirm title={t('taskList.deleteTask')} onConfirm={() => deleteTask.mutate(record.id)}>
            <Button type="text" size="small" icon={<DeleteOutlined />}
              style={{ color: 'var(--accent-danger)' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
          {t('taskList.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTask(null); setFormOpen(true); }}>
          {t('taskList.create')}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ width: 200, flexShrink: 0 }} styles={{ body: { padding: 8 } }}>
          <div
            style={{
              padding: '8px 12px', cursor: 'pointer', borderRadius: 6,
              background: !selectedGroup ? 'var(--bg-hover)' : 'transparent',
              color: !selectedGroup ? 'var(--accent-primary)' : 'var(--text-primary)',
              marginBottom: 2,
            }}
            onClick={() => setSelectedGroup(undefined)}
          >
            {t('taskList.allTasks')}
          </div>
          {groups?.map(g => (
            <div
              key={g.id}
              style={{
                padding: '8px 12px', cursor: 'pointer', borderRadius: 6,
                background: selectedGroup === g.id ? 'var(--bg-hover)' : 'transparent',
                color: selectedGroup === g.id ? g.color : 'var(--text-primary)',
                marginBottom: 2,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onClick={() => setSelectedGroup(g.id)}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.name}
              </span>
              <Popconfirm
                title={t('taskList.deleteGroup')}
                description={t('taskList.deleteGroupDesc')}
                onConfirm={(e) => { e?.stopPropagation(); deleteGroup.mutate(g.id); }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <CloseOutlined
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5, flexShrink: 0 }}
                />
              </Popconfirm>
            </div>
          ))}

          {addingGroup ? (
            <div style={{ padding: '6px 8px' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <ColorPicker
                  size="small"
                  value={newGroupColor}
                  onChange={(_, hex) => setNewGroupColor(hex)}
                  presets={[{
                    label: t('taskList.presetColors'),
                    colors: ['#00d4aa', '#38bdf8', '#f0b429', '#ef4444', '#a855f7', '#f97316', '#ec4899'],
                  }]}
                />
                <Input
                  size="small"
                  placeholder={t('taskList.groupName')}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onPressEnter={handleCreateGroup}
                  autoFocus
                  style={{ flex: 1 }}
                />
              </div>
              <Space size={4}>
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={handleCreateGroup}
                  loading={createGroup.isPending} />
                <Button size="small" icon={<CloseOutlined />} onClick={() => { setAddingGroup(false); setNewGroupName(''); }} />
              </Space>
            </div>
          ) : (
            <div
              style={{
                padding: '8px 12px', cursor: 'pointer', borderRadius: 6,
                color: 'var(--text-secondary)', marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13,
              }}
              onClick={() => setAddingGroup(true)}
            >
              <PlusOutlined style={{ fontSize: 11 }} />
              {t('taskList.newGroup')}
            </div>
          )}
        </Card>

        <Card style={{ flex: 1 }} styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder={t('taskList.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
              style={{ maxWidth: 300 }}
            />
          </div>
          <Table
            dataSource={filteredTasks}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="small"
          />
        </Card>
      </div>

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editTask} />
    </div>
  );
}
