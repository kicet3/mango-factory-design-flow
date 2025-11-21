import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Index from "./pages/Index";
import Generate from "./pages/Generate";
import Auth from "./pages/Auth";
import History from "./pages/History";
import GenerationDetail from "./pages/GenerationDetail";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Billing from "./pages/Billing";
import ShareResult from "./pages/ShareResult";
import Gallery from "./pages/Gallery";
import GalleryMaterials from "./pages/GalleryMaterials";
import GalleryResults from "./pages/GalleryResults";
import NotFound from "./pages/NotFound";
import GenerateV2Upload from "./pages/GenerateV2Upload";
import GenerateV2Flow from "./pages/GenerateV2Flow";
import GenerateV2Main from "./pages/GenerateV2Main";
import GenerateV2Materials from "./pages/GenerateV2Materials";
import TeachingPlanEditor from "./pages/TeachingPlanEditor";
import TeachingPlanViewer from "./pages/TeachingPlanViewer";
import TeachingMaterialsExample from "./pages/TeachingMaterialsExample";
import MaterialDetailPage from "./pages/MaterialDetailPage";
import TeachingSession from "./pages/TeachingSession";
import MaterialEditorNew from "./pages/MaterialEditorNew";

const queryClient = new QueryClient();

function GenerateResultRedirect() {
  const { id } = useParams();
  return <Navigate to={`/generation/${id}`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-secondary to-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">로그인 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/generate" element={
              <ProtectedRoute>
                <Generate />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />
            <Route path="/generation/:id" element={
              <ProtectedRoute>
                <GenerationDetail />
              </ProtectedRoute>
            } />
            <Route path="/generate/result/:id" element={<GenerateResultRedirect />} />
            <Route path="/share/result/:id" element={<ShareResult />} />
            <Route path="/gallery" element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            } />
            <Route path="/gallery/generation_formats" element={
              <ProtectedRoute>
                <GalleryMaterials />
              </ProtectedRoute>
            } />
            <Route path="/gallery/results" element={
              <ProtectedRoute>
                <GalleryResults />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={<Settings />} />
            <Route path="/support" element={<Support />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/generate-v2/upload" element={
              <ProtectedRoute>
                <GenerateV2Upload />
              </ProtectedRoute>
            } />
            <Route path="/generate-v2/generate" element={
              <ProtectedRoute>
                <GenerateV2Main />
              </ProtectedRoute>
            } />
            <Route path="/generate-v2/flow" element={
              <ProtectedRoute>
                <GenerateV2Flow />
              </ProtectedRoute>
            } />
            <Route path="/generate-v2/materials" element={
              <ProtectedRoute>
                <GenerateV2Materials />
              </ProtectedRoute>
            } />
            <Route path="/teaching-plan-editor/:id" element={
              <ProtectedRoute>
                <TeachingPlanEditor />
              </ProtectedRoute>
            } />
            <Route path="/teaching-plan-viewer" element={
              <ProtectedRoute>
                <TeachingPlanViewer />
              </ProtectedRoute>
            } />
            <Route path="/teaching-materials-example" element={
              <ProtectedRoute>
                <TeachingMaterialsExample />
              </ProtectedRoute>
            } />
            <Route path="/gallery/material/:id" element={<MaterialDetailPage />} />
            <Route path="/gallery/materials/edit/:id" element={
              <ProtectedRoute>
                <MaterialEditorNew />
              </ProtectedRoute>
            } />
            <Route path="/teaching-session/:conversionId" element={
              <ProtectedRoute>
                <TeachingSession />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
