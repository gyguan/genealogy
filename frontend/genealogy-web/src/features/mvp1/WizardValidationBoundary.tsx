import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Form } from 'antd';
import { PageFeedback } from '../../shared/ui/Feedback';
import type { Mvp1StepKey } from './domain/wizardStepState';
import { mapWizardServerFieldErrors, type WizardFieldErrors } from './domain/wizardFormValidation';
import { WizardFormProvider } from './WizardFormContext';

type Props = {
  step: Mvp1StepKey;
  children: ReactNode;
};

export function WizardValidationBoundary({ step, children }: Props) {
  const [form] = Form.useForm();
  const [businessError, setBusinessError] = useState('');

  useEffect(() => {
    form.resetFields();
    setBusinessError('');
  }, [step, form]);

  function applyServerErrors(errors?: WizardFieldErrors, message = '保存失败，请修正当前步骤后重试') {
    const mapped = mapWizardServerFieldErrors(errors);
    const entries = Object.entries(mapped);
    if (entries.length) {
      form.setFields(entries.map(([name, error]) => ({ name, errors: [error] })));
      const firstName = entries[0][0];
      window.setTimeout(() => {
        form.scrollToField(firstName, { behavior: 'smooth', block: 'center' });
        const field = form.getFieldInstance(firstName) as { focus?: () => void } | undefined;
        field?.focus?.();
      }, 0);
    }
    setBusinessError(message);
  }

  const contextValue = useMemo(() => ({
    step,
    form,
    setBusinessError,
    applyServerErrors
  }), [step, form]);

  return (
    <WizardFormProvider value={contextValue}>
      <Form
        form={form}
        component={false}
        preserve
        onValuesChange={() => {
          if (businessError) setBusinessError('');
        }}
      >
        <div className="wizard-validation-boundary">
          {businessError ? (
            <PageFeedback
              className="wizard-step-local-status"
              tone="error"
              title={businessError}
              closable
              onClose={() => setBusinessError('')}
            />
          ) : null}
          {children}
        </div>
      </Form>
    </WizardFormProvider>
  );
}
