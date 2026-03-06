import { useState } from 'react';
import { Input, Button, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authApi } from '../api/client';
import { useLocale } from '../hooks/useLocale';
import Logo from '../components/common/Logo';

export default function Login() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLocale();

  const handleLogin = async () => {
    if (!token.trim()) {
      message.warning(t('login.msg.empty'));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(token.trim());
      if (res.ok && res.token) {
        localStorage.setItem('cronhub_auth_token', res.token);
        window.location.href = '/';
      }
    } catch {
      message.error(t('login.msg.wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: 360,
        padding: 40,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={48} />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 20,
            color: 'var(--text-primary)',
            marginTop: 12,
          }}>
            CronHub
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {t('login.prompt')}
          </div>
        </div>

        <Input.Password
          prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
          placeholder={t('login.placeholder')}
          size="large"
          value={token}
          onChange={e => setToken(e.target.value)}
          onPressEnter={handleLogin}
          style={{ marginBottom: 16 }}
        />

        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleLogin}
        >
          {t('login.submit')}
        </Button>
      </div>
    </div>
  );
}
