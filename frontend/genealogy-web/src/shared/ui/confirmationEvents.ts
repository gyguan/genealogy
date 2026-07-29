export type ConfirmationRequest = {
  title: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

export type ConfirmationEventDetail = ConfirmationRequest & {
  resolve: (confirmed: boolean) => void;
};

export const CONFIRMATION_EVENT = 'genealogy:confirm-action';

export function requestConfirmation(options: ConfirmationRequest): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise<boolean>(resolve => {
    window.dispatchEvent(new CustomEvent<ConfirmationEventDetail>(CONFIRMATION_EVENT, {
      detail: { ...options, resolve }
    }));
  });
}
