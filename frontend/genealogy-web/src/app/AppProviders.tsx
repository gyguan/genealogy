import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { confirmAction } from '../shared/ui/Feedback';
import { CONFIRMATION_EVENT } from '../shared/ui/confirmationEvents';
import type { ConfirmationEventDetail } from '../shared/ui/confirmationEvents';

dayjs.locale('zh-cn');

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

function ApplicationConfirmationBridge() {
  useEffect(() => {
    const handleConfirm = (event: Event) => {
      const detail = (event as CustomEvent<ConfirmationEventDetail>).detail;
      if (!detail?.resolve) return;
      const { resolve, danger, ...options } = detail;
      confirmAction({
        ...options,
        okButtonProps: { danger },
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    };
    window.addEventListener(CONFIRMATION_EVENT, handleConfirm);
    return () => window.removeEventListener(CONFIRMATION_EVENT, handleConfirm);
  }, []);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        cssVar: { key: 'genealogy' },
        token: {
          colorPrimary: '#1677ff',
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
          fontFamily: APPLICATION_FONT_FAMILY
        },
        components: {
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelFontSize: 14 },
          Modal: { borderRadiusLG: 12 }
        }
      }}
    >
      <AntdApp>
        <ApplicationConfirmationBridge />
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
