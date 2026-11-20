import { Fragment, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Play, Wrench } from 'lucide-react';
import type { TestSuiteSummary } from '../types/mathTasks';

interface TestRunnerViewProps {
  onApplyAllPatches: () => Promise<void>;
  repoRevision: number;
  busy: boolean;
}

export function TestRunnerView({
  onApplyAllPatches,
  repoRevision,
  busy,
}: TestRunnerViewProps) {
  const [mode, setMode] = useState<'working' | 'original'>('working');
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runTests = async (targetMode: 'working' | 'original') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка виконання тестів');
      setSummary(data as TestSuiteSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка тестування');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runTests(mode);
  }, [mode, repoRevision]);

  const suiteLabel = (suite: string) => {
    switch (suite) {
      case 'compilation':
        return 'Компіляція та типи';
      case 'math_invariants':
        return 'Математична логіка';
      case 'mathpar_syntax':
        return 'Синтаксис Mathpar';
      default:
        return 'Навчальний план';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Автоматична перевірка коду та генераторів
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Перевірка компіляції Java 17, математичних інваріантів 5 класу та стандартів синтаксису Mathpartner
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setMode('original')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'original'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Оригінал GitHub
            </button>
            <button
              type="button"
              onClick={() => setMode('working')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'working'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Робоча версія
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => runTests(mode)}
            className="py-2 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-sky-700" />
            <span>Перезапустити</span>
          </button>

          {summary && summary.failed > 0 && mode === 'working' && (
            <button
              type="button"
              disabled={busy}
              onClick={onApplyAllPatches}
              className="py-2 px-4 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Виправити всі помилки</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Grid */}
      {summary && (
        <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <div className="text-xs text-slate-500">Перевірок виконано</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
              {summary.total}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Пройдено успішно</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700 tabular-nums">
              {summary.passed}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Виявлено збоїв</div>
            <div
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                summary.failed > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {summary.failed}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Загальний статус</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
              {summary.failed === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">Готово до збірки</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-red-700">Потребує виправлень</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* High-Density Test Results Table */}
      {summary && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4">Категорія</th>
                  <th className="py-3 px-4">Тест</th>
                  <th className="py-3 px-4">Файл</th>
                  <th className="py-3 px-4 text-right">Час</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {summary.results.map((tc) => {
                  const isOpen = expandedId === tc.id;
                  return (
                    <Fragment key={tc.id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : tc.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tc.passed ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Пройдено</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span>Провалено</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {suiteLabel(tc.suite)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{tc.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {tc.targetFile}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                          {tc.durationMs} ms
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${tc.id}-details`} className="bg-slate-50/70">
                          <td colSpan={5} className="px-6 py-4 text-xs space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="font-semibold text-slate-700">Очікувано:</div>
                                <div className="text-slate-600 mt-0.5">{tc.expected}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-700">Фактично:</div>
                                <div
                                  className={`mt-0.5 ${
                                    tc.passed ? 'text-emerald-700' : 'text-red-700 font-medium'
                                  }`}
                                >
                                  {tc.actual}
                                </div>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200/70 text-slate-600">
                              {tc.details}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
