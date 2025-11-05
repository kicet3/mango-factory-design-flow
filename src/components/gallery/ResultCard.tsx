import { Heart, Download, Share2, Crown, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatKoreanTime } from "@/lib/utils";

interface ResultCardProps {
  id: string;
  title: string;
  author: {
    nickname: string;
    avatar?: string;
    isOwner: boolean;
  };
  courseType: string;
  canShare: boolean;
  likesCount: number;
  downloadsCount: number;
  createdAt: string;
  status: string;
  isLiked: boolean;
  onLikeToggle: (id: string) => void;
  onCardClick: (id: string) => void;
  onDownload: (id: string) => void;
}

export function ResultCard({
  id,
  title,
  author,
  courseType,
  canShare,
  likesCount,
  downloadsCount,
  createdAt,
  status,
  isLiked,
  onLikeToggle,
  onCardClick,
  onDownload,
}: ResultCardProps) {
  const formatDate = (dateString: string) => {
    return formatKoreanTime(dateString, 'yyyy년 MM월 dd일');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case '완료':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'processing':
      case '진행중':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'failed':
      case '실패':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onCardClick(id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {canShare && (
              <Badge variant="secondary">
                <Share2 className="w-3 h-3 mr-1" />
                공유중
              </Badge>
            )}
            <Badge className={getStatusColor(status)}>
              <Clock className="w-3 h-3 mr-1" />
              {status}
            </Badge>
          </div>
        </div>

        {/* 작성자 정보 */}
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={author.avatar} alt={author.nickname} />
            <AvatarFallback className="text-xs">
              {author.nickname.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {author.nickname} 선생님
          </span>
          {author.isOwner && (
            <Crown className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 과목 태그 */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            {courseType}
          </Badge>
        </div>

        {/* 통계 및 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {likesCount}
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              {downloadsCount}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(createdAt)}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onLikeToggle(id);
              }}
              className={isLiked ? "text-red-500 hover:text-red-600" : ""}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(id);
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}