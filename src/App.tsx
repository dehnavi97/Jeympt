import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import PromptEditor from "@/pages/PromptEditor";
import AllPrompts from "@/pages/AllPrompts";
import Favorites from "@/pages/Favorites";
import AttachmentsPage from "@/pages/AttachmentsPage";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/prompts/:promptId" element={<PromptEditor />} />
        <Route path="/prompts" element={<AllPrompts />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/attachments" element={<AttachmentsPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
