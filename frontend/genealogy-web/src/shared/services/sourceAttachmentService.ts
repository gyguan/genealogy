import { apiClient } from '../api/client';

export const sourceAttachmentService = {
  listBySource(sourceId: string | number) {
    return apiClient.get(`/source-attachments/sources/${sourceId}`);
  },

  uploadToSource(sourceId: string | number, formData: FormData) {
    return apiClient.upload(`/sources/${sourceId}/attachments`, formData);
  },

  downloadContent(attachmentId: string | number) {
    return apiClient.download(`/source-attachments/${attachmentId}/content`);
  },

  remove(attachmentId: string | number) {
    return apiClient.delete(`/source-attachments/${attachmentId}`);
  }
};
