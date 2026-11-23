import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileCode2,
  GitCompare,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type {
  CodeDiagnostic,
  FileDetailResponse,
  RepoFileEntry,
} from '../types/mathTasks';

interface CodeInspectorViewProps {
  files: RepoFileEntry[];
  diagnostics: CodeDiagnostic[];
  selectedPath: string;
  onSelectPath: (path: string) => void;
  onApplyFilePatch: (path: string) => Promise<void>;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onResetRepo: () => Promise<void>;
  onOpenAiAudit: (path: string) => void;
  busy: boolean;
}

export function CodeInspectorView({
  files,
  diagnostics,
  selectedPath,
  onSelectPath,
  onApplyFilePatch,
  onSaveFile,
  onResetRepo,
  onOpenAiAudit,
  busy,
}: CodeInspectorViewProps) {
  const [detail, setDetail] = useState<FileDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'diff' | 'edit'>('code');
  const [draftCode, setDraftCode] = useState('');
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!selectedPath) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHighlightedLine(null);

    fetch(`/api/repo/file?path=${encodeURIComponent(selectedPath)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Не вдалося завантажити файл');
        return data as FileDetailResponse;
      })
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setDraftCode(data.workingContent);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Помилка завантаження');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPath, files]);

  const groupedFiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? files.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.packageGroup.toLowerCase().includes(query)
        )
      : files;

    const groups = new Map<string, RepoFileEntry[]>();
    for (const f of filtered) {
      const list = groups.get(f.packageGroup) ?? [];
      list.push(f);
      groups.set(f.packageGroup, list);
    }
    return Array.from(groups.entries());
  }, [files, searchTerm]);

  const severityLabel = (sev: CodeDiagnostic['severity']) => {
    if (sev === 'critical') return 'Критична помилка';
    if (sev === 'high') return 'Логічна / математична помилка';
    return 'Зауваження синтаксису';
  };

  const severityTone = (sev: CodeDiagnostic['severity']) => {
    if (sev === 'critical') return 'text-red-700';
    if (sev === 'high') return 'text-amber-700';
    return 'text-slate-700';
  };

  const codeLines = useMemo(() => {
    return (detail?.workingContent ?? '').split(/\r?\n/);
  }, [detail]);

  const totalCritical = diagnostics.filter((d) => d.severity === 'critical').length;
  const totalHigh = diagnostics.filter((d) => d.severity === 'high').length;
  const totalMedium = diagnostics.filter((d) => d.severity === 'medium').length;
  const modifiedCount = files.filter((f) => f.isModified).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: Package & File Explorer */}
      <aside className="w-full lg:w-72 shrink-0 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Файли репозиторію</h2>
            <span className="text-xs text-slate-500 tabular-nums">{files.length} файлів</span>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Фільтр за назвою або пакетом..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
          />
          <div className="text-xs text-slate-600 flex flex-wrap gap-x-2 gap-y-1 tabular-nums">
            <span>Критичних: {totalCritical}</span>
            <span aria-hidden="true">·</span>
            <span>Логічних: {totalHigh}</span>
            <span aria-hidden="true">·</span>
            <span>Синтаксис: {totalMedium}</span>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
          {groupedFiles.map(([group, groupFiles]) => (
            <div key={group} className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-slate-500">{group}</div>
              <ul className="mt-1">
                {groupFiles.map((f) => {
                  const active = f.path === selectedPath;
                  return (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => onSelectPath(f.path)}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                          active
                            ? 'bg-sky-50 text-sky-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <FileCode2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{f.name}</span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1.5 tabular-nums text-[11px]">
                          {f.isModified && (
                            <span className="text-sky-700 font-medium">Змін.</span>
                          )}
                          {f.diagnosticCount > 0 ? (
                            <span
                              className={
                                f.criticalCount > 0
                                  ? 'text-red-700 font-semibold'
                                  : 'text-amber-700 font-medium'
                              }
                            >
                              {f.diagnosticCount}
                            </span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <a
            href="/api/export/repo.zip"
            download="mathTasks-java-patched.zip"
            className="w-full py-2 px-3 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Завантажити Java-проєкт (.zip)</span>
          </a>
          {modifiedCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={onResetRepo}
              className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Скинути до оригіналу GitHub</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Inspector Viewport */}
      <section className="flex-1 min-w-0 w-full space-y-6">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
            Завантаження вихідного коду...
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && detail && (
          <>
            {/* File Header & Actions */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-slate-900 truncate">
                    {detail.path.split('/').pop()}
                  </h1>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2 tabular-nums">
                    <span className="font-mono truncate max-w-md">{detail.path}</span>
                    <span aria-hidden="true">·</span>
                    <span>{codeLines.length} рядків</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {detail.diagnostics.length === 0
                        ? 'Помилок не виявлено'
                        : `${detail.diagnostics.length} діагностичних зауважень`}
                    </span>
                    {detail.isModified && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-700 font-medium">Модифіковано локально</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {detail.hasAvailablePatch && detail.diagnostics.length > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApplyFilePatch(detail.path)}
                      className="py-2 px-4 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Виправити цей файл</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenAiAudit(detail.path)}
                    className="py-2 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                    <span>Аудит з AI</span>
                  </button>
                </div>
              </div>

              {/* Segmented View Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setViewMode('code')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === 'code'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Вихідний код
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('diff')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      viewMode === 'diff'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Порівняння з GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      viewMode === 'edit'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Редактор</span>
                  </button>
                </div>

                {viewMode === 'edit' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSaveFile(detail.path, draftCode)}
                    className="py-1.5 px-4 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Зберегти зміни</span>
                  </button>
                )}
              </div>
            </div>

            {/* Diagnostics Block */}
            {detail.diagnostics.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Виявлені помилки та архітектурні зауваження
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    Натисніть на рядок для переходу
                  </span>
                </div>
                {detail.diagnostics.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setViewMode('code');
                      setHighlightedLine(d.line);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {d.severity === 'critical' ? (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className={`font-semibold ${severityTone(d.severity)}`}>
                        {severityLabel(d.severity)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">Рядок {d.line}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-semibold text-slate-900">{d.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-6">{d.description}</p>
                    <p className="text-xs text-sky-800 pl-6">
                      Рекомендація: {d.suggestion}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Code / Diff / Editor Surface */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {viewMode === 'code' && (
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                  <table className="w-full border-collapse font-mono text-xs leading-6">
                    <tbody>
                      {codeLines.map((line, idx) => {
                        const lineNum = idx + 1;
                        const diagOnLine = detail.diagnostics.find((d) => d.line === lineNum);
                        const isHighlighted = highlightedLine === lineNum;
                        return (
                          <tr
                            key={lineNum}
                            className={
                              isHighlighted
                                ? 'bg-sky-50'
                                : diagOnLine?.severity === 'critical'
                                  ? 'bg-red-50/70'
                                  : diagOnLine
                                    ? 'bg-amber-50/60'
                                    : 'hover:bg-slate-50'
                            }
                          >
                            <td className="w-12 px-3 text-right select-none text-slate-400 border-r border-slate-100 tabular-nums align-top">
                              {lineNum}
                            </td>
                            <td className="px-4 whitespace-pre text-slate-800">{line || ' '}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === 'diff' && (
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                  {!detail.isModified ? (
                    <div className="p-8 text-sm text-slate-500 text-center">
                      Файл ідентичний версії з GitHub (mathpar/mathTasks). Застосуйте виправлення або відредагуйте код, щоб побачити різницю.
                    </div>
                  ) : (
                    <table className="w-full border-collapse font-mono text-xs leading-6">
                      <tbody>
                        {detail.diff.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              row.type === 'added'
                                ? 'bg-emerald-50 text-emerald-950'
                                : row.type === 'removed'
                                  ? 'bg-red-50 text-red-950'
                                  : 'text-slate-700'
                            }
                          >
                            <td className="w-10 px-2 text-right select-none text-slate-400 border-r border-slate-100 tabular-nums">
                              {row.lineOriginal ?? ''}
                            </td>
                            <td className="w-10 px-2 text-right select-none text-slate-400 border-r border-slate-100 tabular-nums">
                              {row.lineModified ?? ''}
                            </td>
                            <td className="w-6 text-center select-none font-semibold">
                              {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                            </td>
                            <td className="px-3 whitespace-pre">{row.text || ' '}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {viewMode === 'edit' && (
                <textarea
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                  spellCheck={false}
                  rows={26}
                  className="w-full p-4 font-mono text-xs leading-6 text-slate-900 bg-white focus:outline-none resize-y"
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
