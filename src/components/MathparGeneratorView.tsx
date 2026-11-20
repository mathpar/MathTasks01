import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import type { CourseChapter, GeneratedAssignmentPreview } from '../types/mathTasks';

interface MathparGeneratorViewProps {
  chapters: CourseChapter[];
  repoRevision: number;
  onGenerateMissingWithAi: (sectionId: string, sectionTitle: string) => void;
}

export function MathparGeneratorView({
  chapters,
  repoRevision,
  onGenerateMissingWithAi,
}: MathparGeneratorViewProps) {
  const [selectedSection, setSelectedSection] = useState('1.6');
  const [weekNumber, setWeekNumber] = useState(7);
  const [assignmentNumber, setAssignmentNumber] = useState(1);
  const [mode, setMode] = useState<'working' | 'original'>('working');
  const [seedOffset, setSeedOffset] = useState(0);
  const [viewFormat, setViewFormat] = useState<'interactive' | 'raw'>('interactive');
  const [preview, setPreview] = useState<GeneratedAssignmentPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: selectedSection,
          weekNumber,
          assignmentNumber,
          mode,
          seedOffset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка генерації завдання');
      setPreview(data as GeneratedAssignmentPreview);
      setRevealedSolutions({});
      setStudentAnswers({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка генерації');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
  }, [selectedSection, weekNumber, assignmentNumber, mode, seedOffset, repoRevision]);

  const handleCopy = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.fullMathparText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadTxt = () => {
    if (!preview) return;
    const blob = new Blob([preview.fullMathparText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = preview.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPlanAssignments = chapters.reduce((acc, c) => acc + c.totalAssignments, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: CoursePlanConfig Curriculum Matrix */}
      <aside className="w-full lg:w-80 shrink-0 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Програма курсу (5 клас)
          </h2>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {chapters.length} глав · {totalPlanAssignments} завдань · {totalPlanAssignments * 10} задач
          </p>
        </div>

        <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-200">
          {chapters.map((ch) => (
            <div key={ch.id} className="p-3 space-y-2">
              <div className="px-1">
                <div className="text-xs font-semibold text-slate-900">{ch.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {ch.weeksRange} · {ch.totalAssignments} завдань
                </div>
              </div>

              <ul className="space-y-1">
                {ch.sections.map((sec) => {
                  const isSelected = selectedSection === sec.id;
                  return (
                    <li key={sec.id}>
                      {sec.implemented ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSection(sec.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'bg-sky-50 text-sky-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="leading-snug">
                            <span className="font-mono text-[11px] mr-1.5">{sec.id}</span>
                            {sec.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                            {sec.taskCount} завд.
                          </span>
                        </button>
                      ) : (
                        <div className="px-2.5 py-2 rounded-md text-xs text-slate-500 bg-slate-50/70 flex items-center justify-between gap-2">
                          <span className="leading-snug">
                            <span className="font-mono text-[11px] mr-1.5">{sec.id}</span>
                            {sec.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => onGenerateMissingWithAi(sec.id, sec.title)}
                            className="shrink-0 text-[11px] font-medium text-sky-700 hover:underline whitespace-nowrap"
                          >
                            Створити AI
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Generator Stage */}
      <section className="flex-1 min-w-0 w-full space-y-6">
        {/* Parameters & Mode Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {preview?.sectionTitle ?? `Розділ ${selectedSection}`}
              </h1>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {preview?.pageHeader}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSeedOffset((s) => s + 1)}
                className="py-2 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Новий варіант</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!preview}
                className="py-2 px-4 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Експорт .txt</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 text-slate-700">
                <span>Тиждень:</span>
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(Math.max(1, Math.min(35, Number(e.target.value) || 1)))}
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded text-slate-900 font-mono tabular-nums"
                />
              </label>

              <label className="flex items-center gap-2 text-slate-700">
                <span>Завдання (1–8):</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={assignmentNumber}
                  onChange={(e) =>
                    setAssignmentNumber(Math.max(1, Math.min(8, Number(e.target.value) || 1)))
                  }
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded text-slate-900 font-mono tabular-nums"
                />
              </label>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setMode('original')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'original'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Оригінал
                </button>
                <button
                  type="button"
                  onClick={() => setMode('working')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'working'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Виправлений
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setViewFormat('interactive')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewFormat === 'interactive'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Перегляд (10 задач)
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('raw')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewFormat === 'raw'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Код Mathpar (.txt)
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
            Генерація 10 задач у форматі Mathpar...
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && preview && viewFormat === 'interactive' && (
          <div className="space-y-4">
            {preview.tasks.map((task) => {
              const isShown = Boolean(revealedSolutions[task.taskId]);
              const userVal = (studentAnswers[task.taskId] ?? '').trim();
              const isChecked = userVal.length > 0;
              const isCorrect =
                isChecked && userVal.replace(/\s+/g, '') === task.finalAnswer.replace(/\s+/g, '');

              return (
                <div
                  key={task.taskId}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-semibold text-slate-900">Задача {task.taskId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.taskType}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {task.syntaxValid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">Синтаксис Mathpar валідний</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-700 font-medium">Потрібне виправлення</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-900 leading-relaxed">{task.conditionText}</p>

                  {!task.syntaxValid && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 space-y-1">
                      {task.validationNotes.map((note, idx) => (
                        <div key={idx}>• {note}</div>
                      ))}
                    </div>
                  )}

                  {/* Student Answer Check & Solution Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={studentAnswers[task.taskId] ?? ''}
                        onChange={(e) =>
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [task.taskId]: e.target.value,
                          }))
                        }
                        placeholder="Відповідь учня..."
                        className="w-44 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                      />
                      {isChecked && (
                        <span
                          className={`text-xs font-medium ${
                            isCorrect ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isCorrect ? 'Вірно' : `Очікується: ${task.finalAnswer}`}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSolutions((prev) => ({
                          ...prev,
                          [task.taskId]: !prev[task.taskId],
                        }))
                      }
                      className="py-1.5 px-3 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isShown ? 'Приховати рішення' : 'Показати рішення'}</span>
                    </button>
                  </div>

                  {isShown && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 text-xs">
                      <div className="font-semibold text-slate-800">
                        Приховане рішення Mathpar (_ &quot;Рішення {task.taskId}.&quot;)
                      </div>
                      <div className="space-y-1 font-mono text-slate-700">
                        {task.solutionSteps.map((st, idx) => (
                          <div key={idx} className={st.isText ? 'font-sans text-slate-700' : 'text-sky-900'}>
                            {st.isText ? st.content : `${st.content}${idx < task.solutionSteps.length - 1 ? ';' : ''}`}
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-200 font-mono text-slate-900">
                        Відповідь: <span className="font-semibold">{task.finalAnswer}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && preview && viewFormat === 'raw' && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-700">{preview.fileName}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="py-1.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Скопійовано' : 'Копіювати'}</span>
              </button>
            </div>
            <pre className="p-5 font-mono text-xs leading-6 text-slate-800 overflow-x-auto max-h-[680px] overflow-y-auto whitespace-pre">
              {preview.fullMathparText}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
