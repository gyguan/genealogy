import { Button, Popconfirm, message } from 'antd';
import type { ButtonProps } from 'antd';
import { useRef, useState } from 'react';
import { DraftDeleteExecutionLock } from '../domain/draftDeleteExecution';
import {
  canDirectDeleteDraft,
  draftDeleteConfirmDescription,
  draftDeleteConfirmTitle,
  type DraftDeleteObject
} from '../domain/draftDeleteModel';

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
      message.success(`${objectType}已删除`);
    } catch (error) {
      onError?.(error);
      message.error(errorText(error, `删除${objectType}失败`));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Popconfirm
      title={draftDeleteConfirmTitle(objectName, objectType)}
      description={draftDeleteConfirmDescription(objectType)}
      open={open}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ danger: true, loading: deleting }}
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
    </Popconfirm>
  );
}
