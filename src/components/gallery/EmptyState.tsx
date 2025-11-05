import { FileText, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "materials" | "results" | "search";
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case "materials":
        return {
          icon: <FileText className="w-12 h-12 text-muted-foreground/50" />,
          title: "수업 자료가 없습니다",
          description: "아직 공유된 수업 자료가 없습니다. 첫 번째 자료를 등록해보세요!",
          showAction: true,
        };
      case "results":
        return {
          icon: <FileText className="w-12 h-12 text-muted-foreground/50" />,
          title: "생성 결과가 없습니다",
          description: "아직 공유된 생성 결과가 없습니다. 자료를 생성하고 공유해보세요!",
          showAction: false,
        };
      case "search":
        return {
          icon: <Search className="w-12 h-12 text-muted-foreground/50" />,
          title: "검색 결과가 없습니다",
          description: "다른 키워드나 필터로 다시 검색해보세요.",
          showAction: false,
        };
      default:
        return {
          icon: <FileText className="w-12 h-12 text-muted-foreground/50" />,
          title: "내용이 없습니다",
          description: "",
          showAction: false,
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {content.icon}
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {content.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {content.description}
      </p>
      {content.showAction && onAction && (
        <Button 
          onClick={onAction} 
          className="mt-6 gap-2"
        >
          <Plus className="w-4 h-4" />
          {actionLabel || "자료 등록하기"}
        </Button>
      )}
    </div>
  );
}