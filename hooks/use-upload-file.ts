import * as React from 'react';

import { toast } from 'sonner';
import { z } from 'zod';

export type UploadedFile<T = unknown> = {
  key?: string;
  appUrl?: string;
  name: string;
  size: number;
  type: string;
  url: string;
} & T;

interface UseUploadFileProps {
  /** Used to upload into a doc-specific Drive folder */
  docId?: string;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  docId,
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      if (!docId) throw new Error('Missing docId for upload.');

      const form = new FormData();
      form.set('docId', docId);
      form.set('file', file);

      const res = await fetch('/api/uploads/editor-file', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const data = (await res.json()) as { url?: string; driveFileId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      const uploaded: UploadedFile = {
        key: data.driveFileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: String(data.url ?? ''),
      };

      setProgress(100);
      setUploadedFile(uploaded);
      onUploadComplete?.(uploaded);
      return uploaded;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      const message =
        errorMessage.length > 0
          ? errorMessage
          : 'Something went wrong, please try again later.';

      toast.error(message);

      onUploadError?.(error);

      // Mock upload for unauthenticated users
      // toast.info('User not logged in. Mocking upload process.');
      const mockUploadedFile = {
        key: 'mock-key-0',
        appUrl: `https://mock-app-url.com/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      } as UploadedFile;

      // Simulate upload progress
      let progress = 0;

      const simulateProgress = async () => {
        while (progress < 100) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          progress += 2;
          setProgress(Math.min(progress, 100));
        }
      };

      await simulateProgress();

      setUploadedFile(mockUploadedFile);

      return mockUploadedFile;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  const unknownError = 'Something went wrong, please try again later.';

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);

    return errors.join('\n');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);

  return toast.error(errorMessage);
}
