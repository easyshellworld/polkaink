import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { Skeleton } from './components/ui/Skeleton';

const HomePage = lazy(() => import('./pages/Home'));
const LibraryPage = lazy(() => import('./pages/Library'));
const DocumentPage = lazy(() => import('./pages/Document'));
const CreatePage = lazy(() => import('./pages/Create'));
const ProposePage = lazy(() => import('./pages/Propose'));
const GovernancePage = lazy(() => import('./pages/Governance'));
const ProposalDetailPage = lazy(() => import('./pages/Governance/ProposalDetail'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 mt-4" />
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/document/:id" element={<DocumentPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/propose/:docId" element={<ProposePage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/governance/:id" element={<ProposalDetailPage />} />
          </Routes>
        </Suspense>
      </main>
      <MobileNav />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
