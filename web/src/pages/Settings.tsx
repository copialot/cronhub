import { useState } from 'react';
import { Card, Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertApi, taskApi } from '../api/client';
import { message } from 'antd';
import { useLocale } from '../hooks/useLocale';
import type { AlertConfig, CreateAlertRequest } from '../types';

const { Title } = Typography;

export default function Settings() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const { t } = useLocale();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertApi.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list(),
  });

  const createAlert = useMutation({
    mutationFn: (data: CreateAlertRequest) => alertApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      message.success(t('settings.msg.created'));
      setModalOpen(false);
    },
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) => alertApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      message.success(t('settings.msg.deleted'));
    },
  });

  const testAlert = useMutation({
    mutationFn: (data: { type: string; endpoint: string }) => alertApi.test(data),
    onSuccess: () => message.success(t('settings.msg.testSuccess')),
    onError: () => message.error(t('settings.msg.testFailed')),
  });

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: t('settings.col.linkedTask'),
      dataIndex: 'task',
      key: 'task',
      render: (task: AlertConfig['task']) => task ? task.name : <span style={{ color: 'var(--accent-info)' }}>{t('settings.global')}</span>,
    },
    { title: t('settings.col.type'), dataIndex: 'type', key: 'type' },
    {
      title: t('settings.col.endpoint'),
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span>,
    },
    {
      title: t('settings.col.conditions'),
      key: 'conditions',
      render: (_: unknown, record: AlertConfig) => (
        <Space size="small">
          {record.on_failure && <span style={{ color: 'var(--accent-danger)', fontSize: 12 }}>{t('settings.onFailure')}</span>}
          {record.on_timeout && <span style={{ color: 'var(--accent-success)', fontSize: 12 }}>{t('settings.onTimeout')}</span>}
          {record.on_success && <span style={{ color: 'var(--accent-primary)', fontSize: 12 }}>{t('settings.onSuccess')}</span>}
        </Space>
      ),
    },
    {
      title: t('col.actions'),
      key: 'actions',
      render: (_: unknown, record: AlertConfig) => (
        <Space size="small">
          <Button type="link" size="small"
            onClick={() => testAlert.mutate({ type: record.type, endpoint: record.endpoint })}>
            {t('settings.test')}
          </Button>
          <Popconfirm title={t('settings.confirmDelete')} onConfirm={() => deleteAlert.mutate(record.id)}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: 'var(--accent-danger)' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onFinish = (values: CreateAlertRequest) => {
    createAlert.mutate(values);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
          {t('settings.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          {t('settings.addAlert')}
        </Button>
      </div>

      <Card title={<span style={{ fontFamily: 'var(--font-mono)' }}>{t('settings.alertConfig')}</span>}>
        <Table
          dataSource={alerts || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
        />
      </Card>

      <Modal
        title={t('settings.addAlertTitle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ on_failure: true, on_timeout: true, on_success: false, enabled: true }}>
          <Form.Item name="task_id" label={t('settings.linkedTaskLabel')}>
            <Select
              allowClear
              placeholder={t('settings.globalAlert')}
              options={tasks?.map(t => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          <Form.Item name="type" label={t('settings.alertType')} rules={[{ required: true }]}>
            <Select options={[
              { label: 'Webhook', value: 'webhook' },
              { label: 'Email', value: 'email' },
            ]} />
          </Form.Item>
          <Form.Item name="endpoint" label={t('settings.endpointLabel')} rules={[{ required: true }]}>
            <Input placeholder={t('settings.endpointPlaceholder')} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="on_failure" label={t('settings.onFailureLabel')} valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="on_timeout" label={t('settings.onTimeoutLabel')} valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="on_success" label={t('settings.onSuccessLabel')} valuePropName="checked"><Switch /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
