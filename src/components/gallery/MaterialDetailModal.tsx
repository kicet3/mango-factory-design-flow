import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Download, Share2, MessageCircle, Send, Edit2, Trash2, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { formatKoreanTime } from "@/lib/utils";

interface MaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: number | null;
}

interface MaterialData {
  raw_generation_format_id: number;
  generation_format_name: string;
  generation_format_desc: string;
  gallery_desc: string;
  file_path: string;
  generation_format_path: string;
  likes_count: number;
  can_share: boolean;
  created_at: string;
  uploaded_user_id: string;
  course_types?: Array<{ course_type_name: string }>;
  tags?: Array<{ tag_name: string }>;
  downloads_count?: number;
  is_liked?: boolean;
}

interface Comment {
  comment_id: number;
  content: string;
  created_at: string;
  teacher_info: {
    nickname: string;
    personal_photo_path: string | null;
    user_id: string;
  };
  is_deleted: boolean;
  parent_comment_id: number | null;
}

export const MaterialDetailModal = ({ isOpen, onClose, materialId }: MaterialDetailModalProps) => {
  const { user } = useAuth();
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (isOpen && materialId) {
      // Reset previous data when opening modal
      setMaterial(null);
      setComments([]);
      setPreviewUrl(null);
      fetchMaterialData();
      fetchComments();
    }
  }, [isOpen, materialId]);

  useEffect(() => {
    if (material?.file_path || material?.generation_format_path) {
      generatePreviewUrl();
    }
  }, [material]);

  const fetchMaterialData = async () => {
    if (!materialId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching material data for ID:', materialId);
      
      const { data, error } = await supabase
        .from('raw_generation_formats')
        .select(`
          *,
          raw_generation_format_course_type_map(
            course_types(course_type_name)
          ),
          raw_generation_format_tag_map(
            tags(tag_name)
          )
        `)
        .eq('raw_generation_format_id', materialId)
        .maybeSingle();

      console.log('🔍 Material query result:', { data, error });

      if (error) throw error;
      if (!data) {
        console.log('🔍 No material found with ID:', materialId);
        // Set material with minimal data to show private message
        setMaterial({
          raw_generation_format_id: materialId,
          generation_format_name: '비공개 자료',
          generation_format_desc: '',
          gallery_desc: '',
          file_path: '',
          generation_format_path: '',
          likes_count: 0,
          can_share: false,
          created_at: new Date().toISOString(),
          uploaded_user_id: '',
        });
        return;
      }

      // Get downloads count from user_material_interactions where interaction_type_id = 2
      const { count: downloadsCount } = await supabase
        .from('user_material_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('raw_generation_format_id', materialId)
        .eq('interaction_type_id', 2);

      console.log('🔍 Download count:', downloadsCount);

      // Get likes count from raw_generation_format_likes
      const { count: likesCount } = await supabase
        .from('raw_generation_format_likes')
        .select('*', { count: 'exact', head: true })
        .eq('raw_generation_format_id', materialId);

      console.log('🔍 Likes count:', likesCount);

      // Check if user liked this material
      let isLiked = false;
      if (user) {
        const { data: likeData } = await supabase
          .from('raw_generation_format_likes')
          .select('user_id')
          .eq('raw_generation_format_id', materialId)
          .eq('user_id', user.id)
          .maybeSingle();
        isLiked = !!likeData;
      }

      console.log('🔍 Is liked:', isLiked);

      // Format the data with course types and tags
      const courseTypes = data.raw_generation_format_course_type_map?.map((item: any) => ({
        course_type_name: item.course_types?.course_type_name
      })).filter((ct: any) => ct.course_type_name) || [];

      const tags = data.raw_generation_format_tag_map?.map((item: any) => ({
        tag_name: item.tags?.tag_name
      })).filter((t: any) => t.tag_name) || [];

      setMaterial({
        ...data,
        course_types: courseTypes,
        tags: tags,
        downloads_count: downloadsCount || 0,
        likes_count: likesCount || 0,
        is_liked: isLiked,
      });

      console.log('🔍 Material loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching material:', error);
      toast.error('수업자료를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!materialId) return;

    try {
      const { data, error } = await supabase
        .from('raw_generation_format_comments')
        .select(`
          *,
          teacher_info(
            nickname,
            personal_photo_path,
            user_id
          )
        `)
        .eq('raw_generation_format_id', materialId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const generatePreviewUrl = async () => {
    if (!material) return;

    const filePath = material.file_path || material.generation_format_path;
    if (!filePath) return;

    try {
      const { data, error } = await supabase.functions.invoke('secure-download', {
        body: {
          filePath: filePath,
          fileType: 'generation-format'
        }
      });

      if (error) throw error;
      if (data?.downloadUrl) {
        // Wrap with Google Docs Viewer for better preview
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(data.downloadUrl)}&embedded=true`;
        setPreviewUrl(googleDocsUrl);
      }
    } catch (error) {
      console.error('Error generating preview URL:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !material) return;

    try {
      if (material.is_liked) {
        await supabase
          .from('raw_generation_format_likes')
          .delete()
          .eq('raw_generation_format_id', material.raw_generation_format_id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('raw_generation_format_likes')
          .insert({
            raw_generation_format_id: material.raw_generation_format_id,
            user_id: user.id
          });
      }

      setMaterial(prev => prev ? {
        ...prev,
        is_liked: !prev.is_liked,
        likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1
      } : null);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('좋아요 처리에 실패했습니다.');
    }
  };

  const handleDownload = async () => {
    if (!material) return;

    try {
      // Record download event
      await supabase
        .from('raw_generation_format_download_events')
        .insert({
          raw_generation_format_id: material.raw_generation_format_id,
          actor_user_id: user?.id || null
        });

      // Open download URL
      if (previewUrl) {
        window.open(previewUrl, '_blank');
      }

      setMaterial(prev => prev ? {
        ...prev,
        downloads_count: (prev.downloads_count || 0) + 1
      } : null);

      toast.success('다운로드가 시작되었습니다.');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('다운로드에 실패했습니다.');
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !material || !newComment.trim()) return;

    setLoadingComment(true);
    try {
      // Get user's teacher_info_id
      const { data: teacherInfo } = await supabase
        .from('teacher_info')
        .select('teacher_info_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teacherInfo) {
        toast.error('댓글을 작성하려면 프로필을 완성해주세요.');
        return;
      }

      const { error } = await supabase
        .from('raw_generation_format_comments')
        .insert({
          raw_generation_format_id: material.raw_generation_format_id,
          teacher_info_id: teacherInfo.teacher_info_id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      toast.success('댓글이 등록되었습니다.');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('댓글 등록에 실패했습니다.');
    } finally {
      setLoadingComment(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('raw_generation_format_comments')
        .update({ content: editContent.trim() })
        .eq('comment_id', commentId);

      if (error) throw error;

      setEditingCommentId(null);
      setEditContent("");
      await fetchComments();
      toast.success('댓글이 수정되었습니다.');
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('댓글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from('raw_generation_format_comments')
        .update({ is_deleted: true })
        .eq('comment_id', commentId);

      if (error) throw error;

      await fetchComments();
      toast.success('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.comment_id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const isCommentOwner = (comment: Comment) => {
    if (!user) return false;
    return comment.teacher_info.user_id === user.id;
  };

  if (!material) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show private content message if can_share is false
  if (!material.can_share) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {material.generation_format_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Lock className="w-16 h-16 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              세부 내용 비공개인 자료입니다 😔
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {material.generation_format_name}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${material.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{material.likes_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>{material.downloads_count || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length}</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="description" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">설명</TabsTrigger>
            <TabsTrigger value="preview">수업 자료</TabsTrigger>
            <TabsTrigger value="reviews">후기</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="description" className="space-y-4">
              <div className="space-y-4">
                {material.course_types && (
                  <div className="flex flex-wrap gap-2">
                    {material.course_types.map((ct, idx) => (
                      <Badge key={idx} variant="secondary">
                        {ct.course_type_name}
                      </Badge>
                    ))}
                  </div>
                )}

                {material.tags && (
                  <div className="flex flex-wrap gap-2">
                    {material.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag.tag_name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="prose max-w-none">
                  <ReactMarkdown>
                    {material.gallery_desc || material.generation_format_desc || "설명이 없습니다."}
                  </ReactMarkdown>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant={material.is_liked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    className="gap-2"
                  >
                    <Heart className={`w-4 h-4 ${material.is_liked ? 'fill-current' : ''}`} />
                    좋아요
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    다운로드
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    공유
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="w-full h-96">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border rounded-lg"
                    title="Material Preview"
                  />
                ) : (
                  <div className="w-full h-full border rounded-lg flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">미리보기를 불러오는 중...</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">후기 작성</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="이 수업자료에 대한 후기를 남겨주세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || loadingComment}
                      size="sm"
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {loadingComment ? '등록 중...' : '후기 등록'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <Card key={comment.comment_id}>
                      <CardContent className="pt-4">
                        {editingCommentId === comment.comment_id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="w-full"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.comment_id)}
                                disabled={!editContent.trim()}
                              >
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                <X className="w-4 h-4 mr-1" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={comment.teacher_info.personal_photo_path || ""} />
                              <AvatarFallback>
                                {comment.teacher_info.nickname?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {comment.teacher_info.nickname || '익명'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatKoreanTime(comment.created_at)}
                                  </span>
                                </div>
                                {isCommentOwner(comment) && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditComment(comment)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteComment(comment.comment_id)}
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    아직 후기가 없습니다. 첫 번째 후기를 남겨보세요!
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};