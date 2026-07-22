import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useRef, useState } from 'react';
import { DraftDeleteExecutionLock } from '../domain/draftDeleteExecution';
import {
  canDirectDeleteDraft,
  draftDeleteConfirmDescription,
  draftDeleteConfirmTitle,
  type DraftDeleteObject
} from '../domain/draftDeleteModel';
import { ConfirmAction } from './Feedback';
import { feedback } from './OperationFeedback';

type Props = {
  object: DraftDeleteObject | null | undefined;
  objectName: unknown;
  objectType: string;
  onDelete: () => Promise<unknown>;
  onDeleted?: () => void | Promise<void>;
  onError?: (error: unknown) => void;
  label?: string;
  buttonProps?: Omit<ButtonProps, 'danger' | 'loading' | 'onClick' | 'children'>;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function DraftDeleteButton({
  object,
  objectName,
  objectType,
  onDelete,
  onDeleted,
  onError,
  label = '删除',
  buttonProps
}: Props) {
  const executionLock = useRef(new DraftDeleteExecutionLock());
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!canDirectDeleteDraft(object)) return null;

  async function confirmDelete() {
    if (executionLock.current.isRunning()) return;
    setDeleting(true);
    try {
      const executed = await executionLock.current.run(onDelete, onDeleted);
      if (!executed) return;
      setOpen(false);
      feedback.success(`${objectType}已删除`);
    } catch (error) {
      setOpen(false);
      onError?.(error);
      feedback.error(errorText(error, `删除${objectType}失败`));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <span onClick={event => event.stopPropagation()}>
      <ConfirmAction
        title={draftDeleteConfirmTitle(objectName, objectType)}
        description={draftDeleteConfirmDescription(objectType)}
        open={open}
        okText="确认删除"
        cancelText="取消"
        danger
        okButtonProps={{ loading: deleting }}
        cancelButtonProps={{ disabled: deleting }}
        onOpenChange={nextOpen => {
          if (!executionLock.current.isRunning()) setOpen(nextOpen);
        }}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setOpen(false)}
      >
        <Button
          {...buttonProps}
          danger
          loading={deleting}
          onClick={event => {
            event.stopPropagation();
            if (!executionLock.current.isRunning()) setOpen(true);
          }}
        >
          {label}
        </Button>
      </ConfirmAction>
    </span>
  );
}
