import type { ReactNode } from 'react';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { StandardPageHeader } from './StandardPagePatterns';

export type EntityPageBackButtonProps = {
  label: string;
  onBack: () => void;
  disabled?: boolean;
};

export function EntityPageBackButton({ label, onBack, disabled = false }: EntityPageBackButtonProps) {
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

export type EntityPageHeaderProps = {
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
}: EntityPageHeaderProps) {
  return <StandardPageHeader
    className={`entity-page-header ${className}`.trim()}
    back={<EntityPageBackButton label={backLabel} onBack={onBack} disabled={backDisabled} />}
    title={<Space align="center" wrap size={8}>{title}{status}</Space>}
    description={subtitle}
    extra={actions}
  />;
}
