import { useState, useEffect } from 'react';
import { Button, Input, Select, Space, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ScriptEditor from '../components/script/ScriptEditor';
import { useScript, useCreateScript, useUpdateScript } from '../hooks/useScripts';
import { useLocale } from '../hooks/useLocale';

const langOptions = [
  { label: 'Shell', value: 'shell' },
  { label: 'Python', value: 'python' },
  { label: 'Node.js', value: 'node' },
];

export default function ScriptEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const scriptId = isNew ? 0 : Number(id);
  const navigate = useNavigate();
  const { t } = useLocale();

  const { data: script } = useScript(scriptId);
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();

  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'shell' | 'python' | 'node'>('shell');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (script && !loaded) {
      setName(script.name);
      setLanguage(script.language);
      setDescription(script.description || '');
      setContent(script.content || '');
      setLoaded(true);
    }
  }, [script, loaded]);

  const handleSave = () => {
    if (!name.trim()) {
      message.warning(t('scriptEdit.nameRequired'));
      return;
    }

    const data = { name: name.trim(), language, description: description.trim(), content };

    if (isNew) {
      createScript.mutate(data, {
        onSuccess: () => {
          message.success(t('scriptEdit.createSuccess'));
          navigate('/scripts');
        },
      });
    } else {
      updateScript.mutate(
        { id: scriptId, data },
        {
          onSuccess: () => {
            message.success(t('scriptEdit.saveSuccess'));
            navigate('/scripts');
          },
        },
      );
    }
  };

  const saving = createScript.isPending || updateScript.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/scripts')}
          style={{ color: 'var(--text-secondary)' }}
        />
        <Input
          placeholder={t('scriptEdit.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: 200, fontFamily: 'var(--font-mono)' }}
        />
        <Select
          value={language}
          onChange={setLanguage}
          options={langOptions}
          style={{ width: 120 }}
        />
        <Input
          placeholder={t('scriptEdit.descriptionPlaceholder')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            {isNew ? t('scriptEdit.create') : t('scriptEdit.save')}
          </Button>
        </Space>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ScriptEditor
          value={content}
          onChange={setContent}
          language={language}
        />
      </div>
    </div>
  );
}
