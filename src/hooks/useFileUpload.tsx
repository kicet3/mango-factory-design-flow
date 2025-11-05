import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, folder: string = 'uploads'): Promise<UploadResult> => {
    if (!file) {
      return { success: false, error: '파일이 선택되지 않았습니다.' };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' };
    }

    // Validate file type (basic security check)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: '허용되지 않는 파일 형식입니다.' };
    }

    // Validate file extension matches MIME type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'hwpx'];
    
    if (!extension || !validExtensions.includes(extension)) {
      return { success: false, error: '허용되지 않는 파일 확장자입니다.' };
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const { data, error } = await supabase.functions.invoke('upload-to-s3', {
        body: formData,
      });

      if (error) {
        console.error('Upload function error:', error);
        throw new Error('업로드 중 오류가 발생했습니다.');
      }

      if (data.success) {
        toast.success('파일이 성공적으로 업로드되었습니다.')
        return { success: true, url: data.url }
      } else {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
      
      toast.error(errorMessage)
      
      return { success: false, error: errorMessage }
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
  };
};