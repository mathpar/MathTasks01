import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Save, Sparkles } from 'lucide-react';
import type { AiAnalysisResponse, RepoFileEntry } from '../types/mathTasks';

interface AiArchitectViewProps {
  files: RepoFileEntry[];
  initialMode: 'audit' | 'generate_module';
  initialFilePath: string;
  initialSectionId?: string;
  initialSectionTitle?: string;
  onSaveGeneratedFile: (path: string, content: string) => Promise<void>;
}

const PRESET_GENERATIONS = [
  {
    label: '1.1 Розряди та порівняння (5 кл.)',
    grade: 5,
    sectionId: '1.1',
    prompt:
      'Реалізуй генератор для підрозділу 1.1 (Повторення: Розряди, класи, порівняння натуральних чисел) для 5 класу у пакеті chapters.chapter1 з різноманітними задачами (запис числа за розрядами, порівняння багатоцифрових чисел, округлення до сотень).',
  },
  {
    label: '1.5 Розв’язання рівнянь (5 кл.)',
    grade: 5,
    sectionId: '1.5',
    prompt:
      'Створи генератор Section 1.5 (Розв’язання рівнянь типу a*x + b = c, (x - a)*b = c) для 5 класу без від’ємних чисел у відповіді, із покроковим Mathpar-розв’язком.',
  },
  {
    label: 'Глава 2. Геометричні величини (5 кл.)',
    grade: 5,
    sectionId: '2.4',
    prompt:
      'Спроєктуй базовий генератор Глави 2 (Площа прямокутника, периметр, об’єм прямокутного паралелепіпеда) з реалізацією AssignmentGenerator та збереженням файлів.',
  },
  {
    label: '6 клас: Дроби з різними знаменниками',
    grade: 6,
    sectionId: '6.1',
    prompt:
      'Розшир архітектуру на 6 клас (пакет com.mathpartner.generator.grade6): додавання і віднімання звичайних дробів з різними знаменниками, зведення до НСК та скорочення результату.',
  },
];

export function AiArchitectView({
  files,
  initialMode,
  initialFilePath,
  initialSectionId,
  initialSectionTitle,
  onSaveGeneratedFile,
}: AiArchitectViewProps) {
  const [mode, setMode] = useState<'audit' | 'generate_module'>(initialMode);
  const [selectedFile, setSelectedFile] = useState(initialFilePath);
  const [gradeLevel, setGradeLevel] = useState(5);
  const [sectionId, setSectionId] = useState(initialSectionId ?? '1.1');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    if (initialFilePath) setSelectedFile(initialFilePath);
    if (initialSectionId) {
      setSectionId(initialSectionId);
      setPrompt(
        `Створи повний Java-клас генератора для розділу ${initialSectionId} (${initialSectionTitle ?? ''}) з інтеграцією у Task, AssignmentGenerator та MathparRenderer.`
      );
    }
  }, [initialMode, initialFilePath, initialSectionId, initialSectionTitle]);

  const javaFiles = files.filter((f) => f.extension === 'java');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedNotice(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          filePath: mode === 'audit' ? selectedFile : undefined,
          gradeLevel,
          sectionId,
          targetPrompt:
            prompt.trim() ||
            (mode === 'audit'
              ? 'Проведи повний синтаксичний, математичний та Mathpar-аудит класу та запропонуй виправлену версію.'
              : 'Згенеруй новий модуль генератора задач у стилі Google Java Style.'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка виконання AI-аналізу');
      setResult(data as AiAnalysisResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка AI');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!result?.fixedOrGeneratedCode) return;
    await navigator.clipboard.writeText(result.fixedOrGeneratedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveToRepo = async () => {
    if (!result?.suggestedFilePath || !result?.fixedOrGeneratedCode) return;
    await onSaveGeneratedFile(result.suggestedFilePath, result.fixedOrGeneratedCode);
    setSavedNotice(`Файл збережено в робочому репозиторії: ${result.suggestedFilePath}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Архітектор Java та Mathpar (розширене мислення)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Глибокий аудит існуючого коду, виправлення математичної логіки та проєктування нових модулів для 1–12 класів
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
            <button
              type="button"
              onClick={() => setMode('audit')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Аудит файлу
            </button>
            <button
              type="button"
              onClick={() => setMode('generate_module')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'generate_module'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Новий модуль (1–12 кл.)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-slate-100">
          {mode === 'audit' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5 text-xs">
                <span className="font-medium text-slate-700">Оберіть Java-файл із репозиторію</span>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-slate-900 font-mono text-xs focus:outline-none focus:border-sky-600"
                >
                  {javaFiles.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.packageGroup} / {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_GENERATIONS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setGradeLevel(preset.grade);
                      setSectionId(preset.sectionId);
                      setPrompt(preset.prompt);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md transition-colors whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <label className="space-y-1.5">
                  <span className="font-medium text-slate-700">Клас (1–12)</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Math.max(1, Math.min(12, Number(e.target.value) || 5)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono tabular-nums"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="font-medium text-slate-700">Код розділу</span>
                  <input
                    type="text"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    placeholder="1.1, 2.4..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
                  />
                </label>
              </div>
            </div>
          )}

          <label className="block space-y-1.5 text-xs">
            <span className="font-medium text-slate-700">Технічне завдання або фокус перевірки</span>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'audit'
                  ? 'Наприклад: Перевір сумісність із MathparRenderer, ділення на нуль та правильність синтаксису відповідей...'
                  : 'Опишіть типи задач, числові діапазони та математичні обмеження для нового класу...'
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
            />
          </label>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {loading
                  ? 'Виконується глибокий аналіз...'
                  : mode === 'audit'
                    ? 'Запустити аудит коду'
                    : 'Згенерувати Java-модуль'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Architectural Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Архітектурний висновок</h2>
              <span className="text-xs font-mono text-slate-500">{result.suggestedFilePath}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
            {result.architectureNotes.length > 0 && (
              <ul className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
                {result.architectureNotes.map((note, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {idx + 1}. {note}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Generated Java Code */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-700 truncate">
                {result.suggestedFilePath}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-1.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Скопійовано' : 'Копіювати'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveToRepo}
                  className="py-1.5 px-3 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Зберегти в репозиторій</span>
                </button>
              </div>
            </div>
            <pre className="p-4 font-mono text-xs leading-6 text-slate-800 overflow-x-auto max-h-[480px] overflow-y-auto whitespace-pre">
              {result.fixedOrGeneratedCode}
            </pre>
          </div>

          {/* Mathpar Sample */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Приклад виводу у синтаксисі Mathpar
            </div>
            <pre className="p-4 font-mono text-xs leading-6 text-slate-800 overflow-x-auto whitespace-pre">
              {result.mathparSample}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
