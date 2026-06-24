import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { StoreProvider, useStore } from "./store.tsx";
import { ConfirmProvider } from "./ConfirmModal.tsx";
import { Layout } from "./Layout.tsx";
import { Chat } from "./views/Chat.tsx";
import { Members } from "./views/Members.tsx";
import { Tasks, Computers, Search, Settings, Inbox, Saved } from "./views/misc.tsx";
import { AuthPage, JoinPage } from "./views/Auth.tsx";
import { Landing } from "./views/Landing.tsx";
import "./i18n";
import "./styles.css";

// Capture ?as=<devuser> as early as possible: must run before React/Router mounts, otherwise the wildcard route's Navigate replace clears the query string before dev-login can read it.
const _as = new URLSearchParams(window.location.search).get("as");
if (_as) localStorage.setItem("open-tag.devuser", _as);

// Root / unmatched path → wait for bootstrap, then redirect to the current user's own workspace.
function RootRedirect() {
  const { slug, ready } = useStore();
  if (!ready) return null; // wait for bootstrap to set slug before redirecting
  return <Navigate to={`/s/${slug}/channel`} replace />;
}

// Canonicalize stale or invalid workspace slugs while preserving the current nested route.
function WorkspaceRoute() {
  const { slug, ready } = useStore();
  const { server } = useParams();
  const loc = useLocation();
  if (!ready) return null;
  if (server !== slug) {
    const pathname = loc.pathname.replace(/^\/s\/[^/]+/, `/s/${slug}`);
    return <Navigate to={`${pathname}${loc.search}${loc.hash}`} replace />;
  }
  return <Layout />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/s/:server" element={<WorkspaceRoute />}>
            <Route index element={<Navigate to="channel" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="saved" element={<Saved />} />
            <Route path="channel" element={<Chat />} />
            <Route path="channel/:channelId" element={<Chat />} />
            <Route path="agent" element={<Members />} />
            <Route path="agent/:agentId" element={<Members />} />
            <Route path="human/:userId" element={<Members />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:channelId" element={<Tasks />} />
            <Route path="computer" element={<Computers />} />
            <Route path="computer/:machineId" element={<Computers />} />
            <Route path="search" element={<Search />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
      </ConfirmProvider>
    </StoreProvider>
  </React.StrictMode>,
);
