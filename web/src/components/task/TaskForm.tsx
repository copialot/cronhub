import { Drawer, Form, Input, Select, InputNumber, Switch, Button, Space } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import CronEditor from './CronEditor';
import { useGroups, useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useScripts } from '../../hooks/useScripts';
import { useLocale } from '../../hooks/useLocale';
import type { Task, CreateTaskRequest } from '../../types';
import { useEffect, useState } from 'react';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
}

export default function TaskForm({ open, onClose, task }: TaskFormProps) {
  const [form] = Form.useForm();
  const { data: groups } = useGroups();
  const { data: scripts } = useScripts();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { t } = useLocale();
  const [scriptSelectOpen, setScriptSelectOpen] = useState(false);

  useEffect(() => {
    if (open && task) {
      form.setFieldsValue({
        ...task,
        env_vars_text: task.env_vars ? Object.entries(task.env_vars).map(([k, v]) => `${k}=${v}`).join('\n') : '',
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, task, form]);

  const onFinish = (values: Record<string, unknown>) => {
    const envVars: Record<string, string> = {};
    if (values.env_vars_text) {
      (values.env_vars_text as string).split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0) {
          envVars[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
      });
    }

    const data: CreateTaskRequest = {
      name: values.name as string,
      group_id: values.group_id as number | undefined,
      cron_expr: values.cron_expr as string,
      command: values.command as string,
      working_dir: values.working_dir as string,
      timeout: values.timeout as number,
      retry_count: values.retry_count as number,
      enabled: values.enabled as boolean,
      env_vars: envVars,
    };

    if (task) {
      updateTask.mutate({ id: task.id, data }, { onSuccess: onClose });
    } else {
      createTask.mutate(data, { onSuccess: onClose });
    }
  };

  return (
    <Drawer
      title={task ? t('taskForm.editTitle') : t('taskForm.createTitle')}
      open={open}
      onClose={onClose}
      width={520}
      extra={
        <Space>
          <Button onClick={onClose}>{t('taskForm.cancel')}</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {task ? t('taskForm.save') : t('taskForm.create')}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ enabled: true, timeout: 3600, retry_count: 0 }}
      >
        <Form.Item name="name" label={t('taskForm.name')} rules={[{ required: true, message: t('taskForm.nameRequired') }]}>
          <Input placeholder={t('taskForm.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="group_id" label={t('taskForm.group')}>
          <Select
            placeholder={t('taskForm.groupPlaceholder')}
            allowClear
            options={groups?.map(g => ({ label: g.name, value: g.id }))}
          />
        </Form.Item>

        <Form.Item name="cron_expr" label={t('taskForm.cronExpr')} rules={[{ required: true, message: t('taskForm.cronRequired') }]}>
          <CronEditor />
        </Form.Item>

        <Form.Item
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {t('taskForm.command')}
              {scripts && scripts.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  icon={<CodeOutlined />}
                  onClick={() => setScriptSelectOpen(!scriptSelectOpen)}
                  style={{ padding: 0, height: 'auto', fontSize: 12 }}
                >
                  {t('taskForm.refScript')}
                </Button>
              )}
            </span>
          }
        >
          {scriptSelectOpen && (
            <Select
              placeholder={t('taskForm.selectScript')}
              style={{ marginBottom: 8 }}
              options={scripts?.map(s => ({ label: `${s.name} (${s.language})`, value: s.name }))}
              onChange={(val) => {
                form.setFieldValue('command', `#!script:${val}`);
                setScriptSelectOpen(false);
              }}
            />
          )}
          <Form.Item name="command" noStyle rules={[{ required: true, message: t('taskForm.commandRequired') }]}>
            <Input.TextArea
              rows={3}
              placeholder={t('taskForm.commandPlaceholder')}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </Form.Item>
        </Form.Item>

        <Form.Item name="working_dir" label={t('taskForm.workingDir')}>
          <Input placeholder={t('taskForm.workingDirPlaceholder')} />
        </Form.Item>

        <Form.Item name="env_vars_text" label={t('taskForm.envVars')}>
          <Input.TextArea
            rows={3}
            placeholder={"DB_HOST=localhost\nDB_PORT=5432"}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
        </Form.Item>

        <Space size="large">
          <Form.Item name="timeout" label={t('taskForm.timeout')}>
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="retry_count" label={t('taskForm.retryCount')}>
            <InputNumber min={0} max={10} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="enabled" label={t('taskForm.enabled')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
      </Form>
    </Drawer>
  );
}
