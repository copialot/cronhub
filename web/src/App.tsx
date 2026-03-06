import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import antdZhCN from 'antd/locale/zh_CN';
import antdZhTW from 'antd/locale/zh_TW';
import antdEnUS from 'antd/locale/en_US';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import ExecutionHistory from './pages/ExecutionHistory';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ThemeContext, type ThemeMode } from './hooks/useTheme';
import { LocaleContext, createT } from './hooks/useLocale';
import { detectLocale, type Locale } from './i18n';
import { authApi } from './api/client';
import { setDayjsLocale } from './lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const darkTokens = {
  colorPrimary: '#00d4aa',
  colorBgContainer: '#161e28',
  colorBgElevated: '#1c2634',
  colorBgLayout: '#0a0f14',
  colorBorder: '#1e2a3a',
  colorText: '#e2e8f0',
  colorTextSecondary: '#64748b',
  borderRadius: 8,
  fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const lightTokens = {
  colorPrimary: '#059669',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#f5f7fa',
  colorBorder: '#e2e8f0',
  colorText: '#1e293b',
  colorTextSecondary: '#64748b',
  borderRadius: 8,
  fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const darkComponents = {
  Menu: {
    itemBg: 'transparent',
    itemSelectedBg: '#1c2634',
    itemSelectedColor: '#00d4aa',
    itemHoverBg: '#1c2634',
  },
  Table: { headerBg: '#111820', rowHoverBg: '#1c2634' },
  Card: { headerBg: 'transparent' },
};

const lightComponents = {
  Menu: {
    itemBg: 'transparent',
    itemSelectedBg: '#e6f7f2',
    itemSelectedColor: '#059669',
    itemHoverBg: '#f0f2f5',
  },
  Table: { headerBg: '#fafafa', rowHoverBg: '#f0f2f5' },
  Card: { headerBg: 'transparent' },
};

const antdLocales = {
  'en': antdEnUS,
  'zh-CN': antdZhCN,
  'zh-TW': antdZhTW,
};

function App() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('cronhub-theme') as ThemeMode) || 'dark';
  });
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [authState, setAuthState] = useState<'loading' | 'none' | 'required' | 'ok'>('loading');

  const toggle = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cronhub-theme', next);
      return next;
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('cronhub-locale', l);
    setLocaleState(l);
  }, []);

  const t = useMemo(() => createT(locale), [locale]);

  const localeCtx = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    setDayjsLocale(locale);
  }, [locale]);

  useEffect(() => {
    authApi.check()
      .then(res => {
        if (!res.auth_required) {
          setAuthState('none');
        } else if (res.authenticated) {
          setAuthState('ok');
        } else {
          setAuthState('required');
        }
      })
      .catch(() => setAuthState('none'));
  }, []);

  const isDark = mode === 'dark';

  const needLogin = authState === 'required';
  const ready = authState !== 'loading';

  return (
    <LocaleContext.Provider value={localeCtx}>
      <ThemeContext.Provider value={{ mode, toggle }}>
        <ConfigProvider
          locale={antdLocales[locale]}
          theme={{
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: isDark ? darkTokens : lightTokens,
            components: isDark ? darkComponents : lightComponents,
          }}
        >
          <QueryClientProvider client={queryClient}>
            {!ready ? (
              <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
              }}>
                <Spin size="large" />
              </div>
            ) : (
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={
                    needLogin ? <Login /> : <Navigate to="/" replace />
                  } />
                  <Route element={
                    needLogin ? <Navigate to="/login" replace /> : <AppLayout />
                  }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tasks" element={<TaskList />} />
                    <Route path="/tasks/:id" element={<TaskDetail />} />
                    <Route path="/history" element={<ExecutionHistory />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            )}
          </QueryClientProvider>
        </ConfigProvider>
      </ThemeContext.Provider>
    </LocaleContext.Provider>
  );
}

export default App;
