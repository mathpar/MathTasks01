import fs from 'fs';
import path from 'path';
import type { CourseChapter, CourseSection, DiffLine } from '../src/types/mathTasks.ts';

const DATA_ROOT = path.resolve(process.cwd(), 'data');
export const ORIGINAL_REPO_DIR = path.join(DATA_ROOT, 'mathTasks');
export const WORK_REPO_DIR = path.join(DATA_ROOT, 'mathTasks-work');

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function ensureWorkingRepo(): void {
  if (!fs.existsSync(ORIGINAL_REPO_DIR)) {
    throw new Error('Базовий репозиторій data/mathTasks не знайдено.');
  }
  if (!fs.existsSync(WORK_REPO_DIR)) {
    copyDirRecursive(ORIGINAL_REPO_DIR, WORK_REPO_DIR);
  }
}

export function resetWorkingRepo(): void {
  if (fs.existsSync(WORK_REPO_DIR)) {
    fs.rmSync(WORK_REPO_DIR, { recursive: true, force: true });
  }
  copyDirRecursive(ORIGINAL_REPO_DIR, WORK_REPO_DIR);
}

export function listAllRepoFiles(rootDir: string): string[] {
  const results: string[] = [];
  function walk(current: string): void {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'out' || entry.name === '.git' || entry.name === 'target') continue;
        walk(fullPath);
      } else {
        const rel = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        results.push(rel);
      }
    }
  }
  walk(rootDir);
  return results.sort();
}

export function readRepoFile(repoDir: string, relPath: string): string | null {
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(repoDir, normalized);
  if (!fullPath.startsWith(repoDir) || !fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

export function writeWorkingFile(relPath: string, content: string): void {
  ensureWorkingRepo();
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(WORK_REPO_DIR, normalized);
  if (!fullPath.startsWith(WORK_REPO_DIR)) {
    throw new Error('Недопустимий шлях файлу.');
  }
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function deleteWorkingFile(relPath: string): boolean {
  ensureWorkingRepo();
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(WORK_REPO_DIR, normalized);
  if (!fullPath.startsWith(WORK_REPO_DIR) || !fs.existsSync(fullPath)) {
    return false;
  }
  fs.unlinkSync(fullPath);
  return true;
}

export function computeLineDiff(original: string, modified: string): DiffLine[] {
  const a = original.split(/\r?\n/);
  const b = modified.split(/\r?\n/);
  const m = a.length;
  const n = b.length;

  // LCS DP for clean readable line diffs
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      diff.push({ type: 'context', lineOriginal: i + 1, lineModified: j + 1, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push({ type: 'removed', lineOriginal: i + 1, lineModified: null, text: a[i] });
      i++;
    } else {
      diff.push({ type: 'added', lineOriginal: null, lineModified: j + 1, text: b[j] });
      j++;
    }
  }
  while (i < m) {
    diff.push({ type: 'removed', lineOriginal: i + 1, lineModified: null, text: a[i] });
    i++;
  }
  while (j < n) {
    diff.push({ type: 'added', lineOriginal: null, lineModified: j + 1, text: b[j] });
    j++;
  }
  return diff;
}

const SECTION_GENERATOR_MAP: Record<string, string | null> = {
  '1.1': null,
  '1.2': null,
  '1.3': 'ColumnMultiplicationGenerator / ColumnDivisionGenerator',
  '1.4': 'Chapter14ExpressionGenerator',
  '1.5': null,
  '1.6': 'Chapter16MotionGenerator / Chapter16WorkGenerator',
  '2.1': null,
  '2.2': null,
  '2.3': null,
  '2.4': null,
  '3.1': 'DivisorsAndMultiplesGen',
  '3.2': 'DivisibilityRulesGen',
  '3.3': 'PrimeAndCompositeGen',
  '4.1': 'FractionConceptGen',
  '4.2': 'FractionTypesAndMixedGen',
  '4.3': 'FractionArithmeticGen',
  '4.4': 'FractionTextProblemsGen',
  '5.1': 'DecimalArithmeticGen',
  '5.2': 'DecimalArithmeticGen',
  '5.3': 'DecimalRoundingGen',
  '5.4': 'DecimalAverageGen',
  '5.5': 'PercentageGen',
  '6.1': null,
  '6.2': null,
  '6.3': null,
};

export function parseCoursePlan(repoDir: string): CourseChapter[] {
  const configPath = 'src/main/java/com/mathpartner/generator/CoursePlanConfig.java';
  const content = readRepoFile(repoDir, configPath) ?? '';

  const chapters: CourseChapter[] = [];
  const initMethodRegex = /private void initChapter(\d+)\(\)\s*\{([\s\S]*?)\n\s*\}/g;
  let cumulativeAssignments = 0;

  let match: RegExpExecArray | null;
  while ((match = initMethodRegex.exec(content)) !== null) {
    const chNum = match[1];
    const body = match[2];

    const chapterTitleMatch = body.match(/plan\.put\("([^"]+)"/);
    const chapterTitle = chapterTitleMatch ? chapterTitleMatch[1] : `Глава ${chNum}`;

    const sections: CourseSection[] = [];
    const putRegex = /\.put\("([^"]+)",\s*new SectionInfo\("([^"]+)",\s*(\d+)\)\)/g;
    let secMatch: RegExpExecArray | null;
    let chAssignments = 0;

    while ((secMatch = putRegex.exec(body)) !== null) {
      const id = secMatch[1];
      const title = secMatch[2];
      const taskCount = parseInt(secMatch[3], 10);
      chAssignments += taskCount;

      const customClass = `src/main/java/com/mathpartner/generator/chapters/chapter${chNum}`;
      const genClass = SECTION_GENERATOR_MAP[id] ?? null;
      const hasFiles = fs.existsSync(path.join(repoDir, customClass));

      sections.push({
        id,
        title,
        taskCount,
        weeksCount: Math.ceil(taskCount / 8),
        implemented: Boolean(genClass && hasFiles),
        generatorClass: genClass,
      });
    }

    const startWeek = Math.floor(cumulativeAssignments / 8) + 1;
    cumulativeAssignments += chAssignments;
    const endWeek = Math.ceil(cumulativeAssignments / 8);

    chapters.push({
      id: `chapter${chNum}`,
      title: chapterTitle,
      totalAssignments: chAssignments,
      totalTasks: chAssignments * 10,
      weeksRange: `Тижні ${startWeek}–${endWeek}`,
      sections,
    });
  }

  return chapters;
}
