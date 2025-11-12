import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Calendar, Play, FileCode, FileSpreadsheet } from "lucide-react";
import { ConversionData } from "@/types/conversion";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ConversionCardProps {
  conversion: ConversionData;
  onPlay?: (id: number) => void;
}

export function ConversionCard({ conversion, onPlay }: ConversionCardProps) {
  // 파일 타입에 따른 아이콘 선택
  const getFileIcon = () => {
    switch (conversion.file_type.toLowerCase()) {
      case "pptx":
      case "ppt":
        return <FileSpreadsheet className="w-12 h-12 text-orange-500" />;
      case "html":
        return <FileCode className="w-12 h-12 text-blue-500" />;
      default:
        return <FileText className="w-12 h-12 text-gray-500" />;
    }
  };

  // 소스 타입 배지 색상
  const getSourceTypeColor = () => {
    switch (conversion.source_type) {
      case "file_upload":
        return "bg-blue-100 text-blue-800";
      case "code_conversion":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 소스 타입 라벨
  const getSourceTypeLabel = () => {
    switch (conversion.source_type) {
      case "file_upload":
        return "파일 업로드";
      case "code_conversion":
        return "코드 변환";
      default:
        return conversion.source_type;
    }
  };

  // 생성 시간 포맷
  const formatGenerationTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}초`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}분`;
    } else {
      return `${Math.round(seconds / 3600)}시간`;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="flex items-start gap-4">
          {/* 파일 아이콘 */}
          <div className="flex-shrink-0 bg-white rounded-lg p-3 shadow-sm">
            {getFileIcon()}
          </div>

          {/* 메타 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-primary transition-colors">
              {conversion.content_name}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-1">
              {conversion.original_filename}
            </p>

            {/* 배지들 */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={getSourceTypeColor()} variant="secondary">
                {getSourceTypeLabel()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {conversion.file_type.toUpperCase()}
              </Badge>
              {conversion.framework && (
                <Badge variant="outline" className="text-xs">
                  {conversion.framework}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* 설명 */}
        {conversion.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {conversion.description}
          </p>
        )}

        {/* 추천과목 */}
        {conversion.recommended_subjects && conversion.recommended_subjects.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              추천과목
            </span>
            <div className="flex flex-wrap gap-2">
              {conversion.recommended_subjects.map((subject, index) => (
                <Badge key={index} variant="outline" className="rounded-md text-xs">
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 수업 스타일 */}
        {conversion.teaching_styles && conversion.teaching_styles.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              수업 스타일
            </span>
            <div className="flex flex-wrap gap-2">
              {conversion.teaching_styles.map((style, index) => (
                <Badge key={index} variant="outline" className="rounded-md text-xs">
                  {style}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 통계 정보 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{conversion.total_components}개 컴포넌트</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{conversion.total_slides}개 슬라이드</span>
          </div>
        </div>

        {/* 시간 정보 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDistanceToNow(new Date(conversion.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>생성 시간: {formatGenerationTime(conversion.generation_time)}</span>
          </div>
        </div>

        {/* 상태 표시 */}
        <div className="mb-4">
          {conversion.status === "completed" && conversion.success ? (
            <Badge className="bg-green-100 text-green-800">완료</Badge>
          ) : conversion.status === "processing" ? (
            <Badge className="bg-yellow-100 text-yellow-800">처리 중</Badge>
          ) : conversion.status === "failed" || !conversion.success ? (
            <Badge className="bg-red-100 text-red-800">실패</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">{conversion.status}</Badge>
          )}
        </div>

        {/* 액션 버튼 */}
        <Button
          className="w-full gap-2"
          variant={conversion.success ? "default" : "outline"}
          disabled={!conversion.success}
          onClick={() => onPlay?.(conversion.id)}
        >
          <Play className="w-4 h-4" />
          {conversion.success ? "콘텐츠 보기" : "사용 불가"}
        </Button>
      </CardContent>
    </Card>
  );
}
