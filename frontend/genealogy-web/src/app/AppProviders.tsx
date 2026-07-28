import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';

export const APPLICATION_FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  '"Noto Sans"',
  '"PingFang SC"',
  '"Microsoft YaHei"',
  'sans-serif',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
  '"Noto Color Emoji"'
].join(', ');

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorBgLayout: '#f5f5f5',
          colorBgContainer: '#ffffff',
          colorBorder: '#d9d9d9',
          colorText: 'rgba(0, 0, 0, 0.88)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
          colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
          colorTextDisabled: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 8,
          borderRadiusLG: 12,
          controlHeight: 32,
          controlHeightLG: 40,
          fontSize: 14,
          fontSizeSM: 12,
          fontSizeLG: 16,
          lineHeight: 22 / 14,
          lineHeightSM: 20 / 12,
          lineHeightLG: 24 / 16,
          fontFamily: APPLICATION_FONT_FAMILY,
          boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)'
        },
        components: {
          Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' },
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelColor: 'rgba(0, 0, 0, 0.65)', labelFontSize: 14 }
        }
      }}
    >
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </ConfigProvider>
  );
}
