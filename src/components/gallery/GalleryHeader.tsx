import { Search, Filter, SortDesc, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface GalleryHeaderProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  selectedCourseTypes: string[];
  onCourseTypesChange: (values: string[]) => void;
  selectedTags?: string[];
  onTagsChange?: (values: string[]) => void;
  showTagFilter?: boolean;
  showOnlyLiked?: boolean;
  onShowOnlyLikedChange?: (value: boolean) => void;
  courseTypes: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
}

export function GalleryHeader({
  searchKeyword,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCourseTypes,
  onCourseTypesChange,
  selectedTags = [],
  onTagsChange,
  showTagFilter = false,
  showOnlyLiked = false,
  onShowOnlyLikedChange,
  courseTypes,
  tags = [],
}: GalleryHeaderProps) {
  const handleCourseTypeToggle = (courseTypeId: string, checked: boolean) => {
    if (checked) {
      onCourseTypesChange([...selectedCourseTypes, courseTypeId]);
    } else {
      onCourseTypesChange(selectedCourseTypes.filter(id => id !== courseTypeId));
    }
  };

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (!onTagsChange) return;
    if (checked) {
      onTagsChange([...selectedTags, tagId]);
    } else {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    }
  };

  return (
    <div className="space-y-4 p-6 bg-card border-b">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="키워드로 검색..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        {/* 정렬 */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <SortDesc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="likes">좋아요순</SelectItem>
            <SelectItem value="downloads">다운로드순</SelectItem>
          </SelectContent>
        </Select>

        {/* 과목 필터 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              과목
              {selectedCourseTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedCourseTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">과목 선택</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {courseTypes.map((courseType) => (
                  <div key={courseType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={courseType.id}
                      checked={selectedCourseTypes.includes(courseType.id)}
                      onCheckedChange={(checked) => 
                        handleCourseTypeToggle(courseType.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={courseType.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {courseType.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 태그 필터 (수업 자료 탭에만 표시) */}
        {showTagFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                태그
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium">태그 선택</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={(checked) => 
                          handleTagToggle(tag.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={tag.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 좋아요한 자료만 보기 */}
        {showTagFilter && onShowOnlyLikedChange && (
          <div className="flex items-center space-x-2 ml-auto">
            <Checkbox
              id="show-only-liked"
              checked={showOnlyLiked}
              onCheckedChange={(checked) => onShowOnlyLikedChange(checked as boolean)}
            />
            <label
              htmlFor="show-only-liked"
              className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1"
            >
              <Heart className={`h-4 w-4 ${showOnlyLiked ? 'fill-primary text-primary' : ''}`} />
              좋아요한 자료만 보기
            </label>
          </div>
        )}
      </div>

      {/* 선택된 필터 표시 */}
      {(selectedCourseTypes.length > 0 || selectedTags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedCourseTypes.map((courseTypeId) => {
            const courseType = courseTypes.find(ct => ct.id === courseTypeId);
            return courseType ? (
              <Badge key={courseTypeId} variant="secondary" className="gap-1">
                {courseType.name}
                <button
                  onClick={() => handleCourseTypeToggle(courseTypeId, false)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                >
                  ×
                </button>
              </Badge>
            ) : null;
          })}
          {selectedTags.map((tagId) => {
            const tag = tags.find(t => t.id === tagId);
            return tag ? (
              <Badge key={tagId} variant="outline" className="gap-1">
                #{tag.name}
                <button
                  onClick={() => handleTagToggle(tagId, false)}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  ×
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}