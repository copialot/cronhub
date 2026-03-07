import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Tooltip, Dropdown, Badge, Drawer } from 'antd';
import {
  DashboardOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  GlobalOutlined,
  ArrowUpOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { localeLabels, type Locale } from '../../i18n';
import { versionApi } from '../../api/client';
import Logo from '../common/Logo';

const { Sider, Content, Header } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [versionInfo, setVersionInfo] = useState<{ current: string; latest: string; has_new: boolean } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    versionApi.check().then(setVersionInfo).catch(() => {});
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 路由变化时关闭 drawer
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/tasks', icon: <ScheduleOutlined />, label: t('menu.tasks') },
    { key: '/history', icon: <HistoryOutlined />, label: t('menu.history') },
    { key: '/settings', icon: <SettingOutlined />, label: t('menu.settings') },
  ];

  const selectedKey = menuItems
    .filter(item => location.pathname.startsWith(item.key) && item.key !== '/')
    .map(item => item.key)[0] || '/';

  const currentPage = menuItems.find(item => item.key === selectedKey);

  const handleLogout = () => {
    localStorage.removeItem('cronhub_auth_token');
    window.location.href = '/login';
  };

  const hasToken = !!localStorage.getItem('cronhub_auth_token');

  const langMenuItems = (Object.keys(localeLabels) as Locale[]).map(key => ({
    key,
    label: localeLabels[key],
  }));

  const siderContent = (
    <>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Logo size={30} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: 16,
          color: 'var(--text-primary)',
        }}>
          CronHub
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
          }}
        />
      </div>
    </>
  );

  return (
    <Layout style={{ height: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          styles={{ body: { padding: 0, background: 'var(--bg-secondary)' } }}
          closable={false}
        >
          {siderContent}
        </Drawer>
      ) : (
        <Sider
          width={220}
          style={{
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {siderContent}
        </Sider>
      )}
      <Layout>
        <Header style={{
          height: 48,
          lineHeight: '48px',
          padding: '0 24px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <Button
                type="text"
                size="small"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                style={{ color: 'var(--text-secondary)' }}
              />
            )}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}>
              {currentPage?.label || 'Dashboard'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {versionInfo && (
              <Tooltip title={versionInfo.has_new
                ? `${t('version.newAvailable').replace('{version}', versionInfo.latest)} — ${t('version.update')}`
                : t('version.current').replace('{version}', versionInfo.current)
              }>
                {versionInfo.has_new ? (
                  <Badge dot>
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      style={{ color: '#52c41a' }}
                    />
                  </Badge>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                  }}>
                    {versionInfo.current}
                  </span>
                )}
              </Tooltip>
            )}
            <Dropdown
              menu={{
                items: langMenuItems,
                selectedKeys: [locale],
                onClick: ({ key }) => setLocale(key as Locale),
              }}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={<GlobalOutlined />}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Dropdown>
            <Tooltip title={mode === 'dark' ? t('header.theme.light') : t('header.theme.dark')}>
              <Button
                type="text"
                size="small"
                icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
            {hasToken && (
              <Tooltip title={t('header.logout')}>
                <Button
                  type="text"
                  size="small"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  style={{ color: 'var(--text-secondary)' }}
                />
              </Tooltip>
            )}
          </div>
        </Header>
        <Content style={{ overflow: 'auto', padding: isMobile ? 12 : 24 }}>
          <div className="page-enter">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
