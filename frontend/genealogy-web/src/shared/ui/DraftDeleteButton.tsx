import { Button, Modal, message } from 'antd';
import type { ButtonProps } from 'antd';
import { useState } from 'react';
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
  const [deleting, setDeleting] = useState(false);

  if (!canDirectDeleteDraft(object)) return null;

  function confirmDelete() {
    Modal.confirm({
      title: draftDeleteConfirmTitle(objectName, objectType),
      content: draftDeleteConfirmDescription(objectType),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (deleting) return;
        setDeleting(true);
        try {
          await onDelete();
          message.success(`${objectType}已删除`);
          await onDeleted?.();
        } catch (error) {
          onError?.(error);
          message.error(errorText(error, `删除${objectType}失败`));
          throw error;
        } finally {
          setDeleting(false);
        }
      }
    });
  }

  return <Button {...buttonProps} danger loading={deleting} onClick={confirmDelete}>{label}</Button>;
}
