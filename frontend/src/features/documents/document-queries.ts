import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi, uploadToS3, type DocumentSearch } from '@/lib/api/documents.api';
import { openLink } from '@/lib/open-link';

export const documentKeys = {
  all: ['documents'] as const,
  list: (search: DocumentSearch) => [...documentKeys.all, 'list', search] as const,
};

export function useDocuments(search: DocumentSearch) {
  return useQuery({
    queryKey: documentKeys.list(search),
    queryFn: ({ signal }) => documentsApi.list(search, signal),
    placeholderData: keepPreviousData,
  });
}

/** Ask for an upload link, send the file to S3, then register it so it appears in the list. */
export function useUploadDocument(appointmentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const ticket = await documentsApi.uploadTicket(file);
      await uploadToS3(ticket, file);
      return documentsApi.register({ fileKey: ticket.fileKey, fileName: file.name, appointmentId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export function useOpenDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const link = await documentsApi.downloadLink(id);
      openLink(link.url);
    },
  });
}
