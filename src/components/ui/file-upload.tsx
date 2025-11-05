import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadProps {
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  folder?: string;
  maxSize?: number; // in MB
  buttonText?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = "*/*",
  folder = "uploads",
  maxSize = 10,
  buttonText = "파일 업로드",
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, uploading } = useFileUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        onUploadError?.(`파일 크기는 ${maxSize}MB를 초과할 수 없습니다.`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadFile(selectedFile, folder);
    
    if (result.success && result.url) {
      onUploadComplete?.(result.url);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      onUploadError?.(result.error || '업로드에 실패했습니다.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={accept}
        className="hidden"
      />

      {!selectedFile ? (
        <Button
          onClick={handleButtonClick}
          variant="outline"
          className="w-full"
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <Button
              onClick={handleRemoveFile}
              variant="ghost"
              size="sm"
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? '업로드 중...' : '업로드'}
            </Button>
            <Button
              onClick={handleButtonClick}
              variant="outline"
              disabled={uploading}
            >
              다른 파일 선택
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};