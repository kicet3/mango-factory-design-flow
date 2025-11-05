import { Heart, Share2, Crown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatKoreanTime } from "@/lib/utils";

interface MaterialCardProps {
  id: string;
  title: string;
  author: {
    nickname: string;
    avatar?: string;
    isOwner: boolean;
  };
  courseTypes: string[];
  tags: string[];
  canShare: boolean;
  likesCount: number;
  createdAt: string;
  isLiked: boolean;
  onLikeToggle: (id: string) => void;
  onCardClick: (id: string) => void;
  onShare: (id: string) => void;
}

export function MaterialCard({
  id,
  title,
  author,
  courseTypes,
  tags,
  canShare,
  likesCount,
  createdAt,
  isLiked,
  onLikeToggle,
  onCardClick,
  onShare,
}: MaterialCardProps) {
  const formatDate = (dateString: string) => {
    return formatKoreanTime(dateString, 'yyyy년 MM월 dd일');
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
          {canShare && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              <Share2 className="w-3 h-3 mr-1" />
              공유중
            </Badge>
          )}
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
        <div className="flex flex-wrap gap-1 mb-3">
          {courseTypes.map((courseType, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {courseType}
            </Badge>
          ))}
        </div>

        {/* 태그 미리보기 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 통계 및 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {likesCount}
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
                onShare(id);
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}