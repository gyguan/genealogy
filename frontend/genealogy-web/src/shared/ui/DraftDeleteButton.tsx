import { Button, Popconfirm, message } from 'antd';
import type { ButtonProps } from 'antd';
import { useRef, useState } from 'react';
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
  const deletingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!canDirectDeleteDraft(object)) return null;

  async function confirmDelete() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
      message.success(`${objectType}已删除`);
      await onDeleted?.();
    } catch (error) {
      onError?.(error);
      message.error(errorText(error, `删除${objectType}失败`));
    } finally {
      deletingRef.current = false;
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
        if (!deletingRef.current) setOpen(nextOpen);
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
          if (!deletingRef.current) setOpen(true);
        }}
      >
        {label}
      </Button>
    </Popconfirm>
  );
}
