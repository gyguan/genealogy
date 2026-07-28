import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff', colorInfo: '#1677ff', colorSuccess: '#52c41a', colorWarning: '#faad14', colorError: '#ff4d4f',
          colorBgLayout: '#f5f5f5', colorBgContainer: '#ffffff', colorBorder: '#d9d9d9', colorText: 'rgba(0, 0, 0, 0.88)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)', borderRadius: 8, borderRadiusLG: 12, controlHeight: 32, controlHeightLG: 40,
          fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)'
        },
        components: {
          Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' },
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelColor: 'rgba(0,0,0,.65)' }
        }
      }}
    >
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </ConfigProvider>
  );
}
