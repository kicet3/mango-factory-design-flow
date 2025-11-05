import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKoreanTime } from "@/lib/utils";

interface Version {
  generation_response_id: number;
  version_no: number;
  created_at: string;
  generation_name: string;
  generation_status_type_id: number;
  output_path?: string;
  is_final: boolean;
}

interface StatusType {
  generation_status_type_id: number;
  generation_status_type_name: string | null;
}

interface VersionTabsProps {
  versions: Version[];
  rootResponseId: number;
  currentVersionId: number;
  onVersionChange: (versionId: number) => void;
  onRegenerate?: () => void;
  statusTypes: StatusType[];
}

export function VersionTabs({ 
  versions, 
  rootResponseId, 
  currentVersionId, 
  onVersionChange,
  onRegenerate,
  statusTypes 
}: VersionTabsProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const maxVersion = Math.max(...versions.map(v => v.version_no));
  const remainingRetries = Math.max(0, 4 - maxVersion);
  const canRegenerate = maxVersion < 4;
  
  const handleRegenerate = async () => {
    if (!canRegenerate) {
      toast.error("재생성 한도(3회)를 초과했습니다");
      return;
    }

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-generation', {
        body: { response_id: currentVersionId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`V${data.data.version_no} 생성이 시작되었습니다. 남은 재생성: ${data.data.remaining_retries}/3`);
        // 새로 생성된 버전으로 이동
        const newResponseId = data.data.new_response_id;
        if (newResponseId) {
          onVersionChange(newResponseId);
        } else if (onRegenerate) {
          onRegenerate();
        }
      } else {
        throw new Error(data.error || "재생성 실패");
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(error.message || "재생성 중 오류가 발생했습니다");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleVersionChange = (versionId: string) => {
    const selectedVersion = versions.find(v => v.generation_response_id.toString() === versionId);
    
    // 생성 중인 버전을 선택한 경우 탭만 변경하고 실제 페이지 이동은 하지 않음
    if (selectedVersion) {
      const statusType = statusTypes.find(st => st.generation_status_type_id === selectedVersion.generation_status_type_id);
      const statusName = statusType?.generation_status_type_name || '';
      
      // 생성중, processing 등의 상태인 경우 탭만 변경
      if ((statusName.toLowerCase().includes('생성') && !statusName.toLowerCase().includes('완료')) || statusName.toLowerCase().includes('processing') || statusName.toLowerCase().includes('진행')) {
        return;
      }
    }
    
    // 완료된 버전인 경우에만 실제 버전 변경
    onVersionChange(parseInt(versionId));
  };

  const formatDate = (dateStr: string) => {
    return formatKoreanTime(dateStr, 'MM. dd HH:mm');
  };

  const getStatusBadge = (statusId: number) => {
    const statusType = statusTypes.find(st => st.generation_status_type_id === statusId);
    const statusName = statusType?.generation_status_type_name || '알 수 없음';
    
    // Determine variant based on status name
    const variant = 
      statusName.toLowerCase().includes('완료') || statusName.toLowerCase().includes('completed') ? 'default' :
      statusName.toLowerCase().includes('실패') || statusName.toLowerCase().includes('failed') || statusName.toLowerCase().includes('error') ? 'destructive' :
      'secondary';
    
    return <Badge variant={variant}>{statusName}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">버전 관리</h3>
          <Badge variant="outline">#{rootResponseId}</Badge>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={!canRegenerate || isRegenerating}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
          재생성 {canRegenerate ? `(${remainingRetries}/3)` : '(0/3)'}
        </Button>
      </div>

      <Tabs 
        value={currentVersionId.toString()} 
        onValueChange={handleVersionChange}
        className="w-full"
      >
        <TabsList className="w-full h-auto">
          {versions
            .sort((a, b) => a.version_no - b.version_no)
            .map((version) => (
              <TabsTrigger 
                key={version.generation_response_id}
                value={version.generation_response_id.toString()}
                className="flex flex-col gap-2 p-4 h-auto flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                title={`생성 시각: ${formatDate(version.created_at)}`}
              >
                <span className="font-semibold text-lg">V{version.version_no}</span>
                <div className="flex flex-col items-center gap-1">
                  {getStatusBadge(version.generation_status_type_id)}
                  {version.is_final && (
                    <Badge variant="secondary" className="text-xs">최종</Badge>
                  )}
                </div>
                <span className="text-xs opacity-70">
                  {formatDate(version.created_at)}
                </span>
              </TabsTrigger>
            ))}
        </TabsList>

        {versions.map((version) => (
          <TabsContent 
            key={version.generation_response_id}
            value={version.generation_response_id.toString()}
            className="mt-4"
          >
            <div className="rounded-lg border p-4">
              {(() => {
                const statusType = statusTypes.find(st => st.generation_status_type_id === version.generation_status_type_id);
                const statusName = statusType?.generation_status_type_name || '';
                const isProcessing = (statusName.toLowerCase().includes('생성') && !statusName.toLowerCase().includes('완료')) || statusName.toLowerCase().includes('processing') || statusName.toLowerCase().includes('진행');
                
                return isProcessing ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <div>
                        <h4 className="font-medium text-lg">생성 중입니다</h4>
                        <p className="text-muted-foreground">
                          잠시만 기다려주세요. 생성이 완료되면 자동으로 업데이트됩니다.
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(version.created_at)}에 시작됨
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{version.generation_name}</h4>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      버전 {version.version_no} • 생성 ID: {version.generation_response_id}
                    </div>
                  </>
                );
              })()}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}