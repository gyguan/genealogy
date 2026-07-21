import type { ReactNode } from 'react';
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

type BackButtonProps = {
  label: string;
  onBack: () => void;
  disabled?: boolean;
};

export function EntityPageBackButton({ label, onBack, disabled = false }: BackButtonProps) {
  return (
    <Button
      type="link"
      className="entity-page-back-button"
      icon={<ArrowLeftOutlined />}
      disabled={disabled}
      onClick={onBack}
    >
      {label}
    </Button>
  );
}

type HeaderProps = {
  backLabel: string;
  onBack: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  backDisabled?: boolean;
  className?: string;
};

export function EntityPageHeader({
  backLabel,
  onBack,
  title,
  subtitle,
  status,
  actions,
  backDisabled = false,
  className = ''
}: HeaderProps) {
  return (
    <header className={`entity-page-header ${className}`.trim()}>
      <div className="entity-page-header__back">
        <EntityPageBackButton label={backLabel} onBack={onBack} disabled={backDisabled} />
      </div>
      <div className="entity-page-header__main">
        <div className="entity-page-header__copy">
          <Space align="center" wrap size={8} className="entity-page-header__title-row">
            <Title level={3}>{title}</Title>
            {status}
          </Space>
          {subtitle ? <Text type="secondary" className="entity-page-header__subtitle">{subtitle}</Text> : null}
        </div>
        {actions ? <Space wrap className="entity-page-header__actions">{actions}</Space> : null}
      </div>
    </header>
  );
}
