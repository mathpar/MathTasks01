import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AiArchitectView } from './components/AiArchitectView';
import { CodeInspectorView } from './components/CodeInspectorView';
import { MathparGeneratorView } from './components/MathparGeneratorView';
import { TestRunnerView } from './components/TestRunnerView';
import type { CodeDiagnostic, CourseChapter, RepoFileEntry } from './types/mathTasks';

type ActiveTab = 'repo' | 'tests' | 'generator' | 'ai';

interface OverviewResponse {
  repoUrl: string;
  files: RepoFileEntry[];
  diagnostics: CodeDiagnostic[];
  chapters: CourseChapter[];
  patchableFiles: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('repo');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedPath, setSelectedPath] = useState(
    'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java'
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [repoRevision, setRepoRevision] = useState(0);

  const [aiMode, setAiMode] = useState<'audit' | 'generate_module'>('audit');
  const [aiFilePath, setAiFilePath] = useState(
    'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java'
  );
  const [aiSectionId, setAiSectionId] = useState<string | undefined>(undefined);
  const [aiSectionTitle, setAiSectionTitle] = useState<string | undefined>(undefined);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/repo/overview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка завантаження репозиторію');
      setOverview(data as OverviewResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося з’єднатися з сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleApplyAllPatches = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/repo/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_all' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка застосування виправлень');
      setNotice(data.message);
      setRepoRevision((r) => r + 1);
      await fetchOverview();
      setActiveTab('tests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка виправлення');
    } finally {
      setBusy(false);
    }
  };

  const handleApplyFilePatch = async (path: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/repo/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_file', path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка застосування патчу');
      setNotice(data.message);
      setRepoRevision((r) => r + 1);
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка патчу');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/repo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка збереження файлу');
      setNotice(`Зміни збережено в ${path}.`);
      setRepoRevision((r) => r + 1);
      await fetchOverview();
      setSelectedPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження');
    } finally {
      setBusy(false);
    }
  };

  const handleResetRepo = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/repo/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка скидання');
      setNotice(data.message);
      setRepoRevision((r) => r + 1);
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка скидання');
    } finally {
      setBusy(false);
    }
  };

  const totalDiagnostics = overview?.diagnostics.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('repo')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            MathTasks Studio
          </button>

          <nav className="flex items-center gap-6 overflow-x-auto text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('repo')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'repo'
                  ? 'border-sky-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Репозиторій
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'tests'
                  ? 'border-sky-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Тестування
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'generator'
                  ? 'border-sky-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Генератор Mathpar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'ai'
                  ? 'border-sky-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Архітектор AI
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={handleApplyAllPatches}
              className="py-2 px-4 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Виправити та перевірити
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Contextual Workspace Summary Strip */}
        {overview && (
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2 tabular-nums">
              <span className="font-semibold text-slate-900">Репозиторій mathpar/mathTasks</span>
              <span aria-hidden="true">·</span>
              <span>Український підручник, 5 клас (UA-SM-05)</span>
              <span aria-hidden="true">·</span>
              <span>6 глав · 280 завдань по 10 задач</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              {totalDiagnostics === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-emerald-700">
                    Усі файли чисті · 0 діагностичних помилок
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium text-red-700">
                    Виявлено {totalDiagnostics} зауважень у коді
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {loading && (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-sm text-slate-500 text-center">
            Ініціалізація репозиторію mathpar/mathTasks...
          </div>
        )}

        {!loading && overview && activeTab === 'repo' && (
          <CodeInspectorView
            files={overview.files}
            diagnostics={overview.diagnostics}
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            onApplyFilePatch={handleApplyFilePatch}
            onSaveFile={handleSaveFile}
            onResetRepo={handleResetRepo}
            onOpenAiAudit={(path) => {
              setAiMode('audit');
              setAiFilePath(path);
              setAiSectionId(undefined);
              setAiSectionTitle(undefined);
              setActiveTab('ai');
            }}
            busy={busy}
          />
        )}

        {!loading && overview && activeTab === 'tests' && (
          <TestRunnerView
            onApplyAllPatches={handleApplyAllPatches}
            repoRevision={repoRevision}
            busy={busy}
          />
        )}

        {!loading && overview && activeTab === 'generator' && (
          <MathparGeneratorView
            chapters={overview.chapters}
            repoRevision={repoRevision}
            onGenerateMissingWithAi={(secId, secTitle) => {
              setAiMode('generate_module');
              setAiSectionId(secId);
              setAiSectionTitle(secTitle);
              setActiveTab('ai');
            }}
          />
        )}

        {!loading && overview && activeTab === 'ai' && (
          <AiArchitectView
            files={overview.files}
            initialMode={aiMode}
            initialFilePath={aiFilePath}
            initialSectionId={aiSectionId}
            initialSectionTitle={aiSectionTitle}
            onSaveGeneratedFile={handleSaveFile}
          />
        )}
      </main>
    </div>
  );
}
