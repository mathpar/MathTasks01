import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { analyzeFile, analyzeRepository } from './server/javaAnalyzer.ts';
import { generateAssignmentPreview, runTestSuite } from './server/mathparSimulator.ts';
import { PATCHED_FILES, applyAllPatches, applyPatchForFile } from './server/patchEngine.ts';
import { buildZipBuffer, type ZipEntryInput } from './server/zipBuilder.ts';
import {
  ORIGINAL_REPO_DIR,
  WORK_REPO_DIR,
  computeLineDiff,
  ensureWorkingRepo,
  listAllRepoFiles,
  parseCoursePlan,
  readRepoFile,
  resetWorkingRepo,
  writeWorkingFile,
} from './server/repoStore.ts';
import { runAiAnalysis } from './server/geminiService.ts';
import type { RepoFileEntry } from './src/types/mathTasks.ts';

async function startServer() {
  ensureWorkingRepo();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Repository tree, diagnostics summary, and CoursePlanConfig curriculum
  app.get('/api/repo/overview', (_req, res) => {
    try {
      ensureWorkingRepo();
      const workFiles = listAllRepoFiles(WORK_REPO_DIR);
      const allDiags = analyzeRepository(WORK_REPO_DIR);
      const chapters = parseCoursePlan(WORK_REPO_DIR);

      const files: RepoFileEntry[] = workFiles.map((rel) => {
        const workContent = readRepoFile(WORK_REPO_DIR, rel) ?? '';
        const origContent = readRepoFile(ORIGINAL_REPO_DIR, rel);
        const fileDiags = allDiags.filter((d) => d.file === rel);
        const parts = rel.split('/');
        const name = parts[parts.length - 1];
        const ext = name.includes('.') ? name.split('.').pop() ?? '' : '';

        let packageGroup = 'Корінь проєкту';
        if (rel.includes('chapters/chapter1')) packageGroup = 'chapters.chapter1';
        else if (rel.includes('chapters/chapter3')) packageGroup = 'chapters.chapter3';
        else if (rel.includes('chapters/chapter4')) packageGroup = 'chapters.chapter4';
        else if (rel.includes('chapters/chapter5')) packageGroup = 'chapters.chapter5';
        else if (rel.includes('/engine/')) packageGroup = 'engine';
        else if (rel.includes('/model/')) packageGroup = 'model';
        else if (rel.includes('/generator/')) packageGroup = 'generator (корінь)';

        return {
          path: rel,
          name,
          packageGroup,
          extension: ext,
          lines: workContent.split(/\r?\n/).length,
          isModified: origContent === null || origContent !== workContent,
          diagnosticCount: fileDiags.length,
          criticalCount: fileDiags.filter((d) => d.severity === 'critical').length,
        };
      });

      res.json({
        repoUrl: 'https://github.com/mathpar/mathTasks',
        files,
        diagnostics: allDiags,
        chapters,
        patchableFiles: Object.keys(PATCHED_FILES),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка читання репозиторію' });
    }
  });

  // 2. Single file content, diagnostics, and diff against GitHub original
  app.get('/api/repo/file', (req, res) => {
    try {
      ensureWorkingRepo();
      const relPath = String(req.query.path ?? '');
      if (!relPath) {
        res.status(400).json({ error: 'Не вказано шлях файлу.' });
        return;
      }
      const workingContent = readRepoFile(WORK_REPO_DIR, relPath);
      if (workingContent === null) {
        res.status(404).json({ error: `Файл ${relPath} не знайдено.` });
        return;
      }
      const originalContent = readRepoFile(ORIGINAL_REPO_DIR, relPath) ?? '';
      const ch1Content =
        readRepoFile(WORK_REPO_DIR, 'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java') ??
        '';
      const diagnostics = analyzeFile(relPath, workingContent, ch1Content);
      const diff = computeLineDiff(originalContent, workingContent);

      res.json({
        path: relPath,
        originalContent,
        workingContent,
        isModified: originalContent !== workingContent,
        hasAvailablePatch: Boolean(PATCHED_FILES[relPath]),
        diagnostics,
        diff,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка читання файлу' });
    }
  });

  // 3. Save manual edits or newly generated Java file into working repo
  app.post('/api/repo/save', (req, res) => {
    try {
      const { path: relPath, content } = req.body as { path?: string; content?: string };
      if (!relPath || typeof content !== 'string') {
        res.status(400).json({ error: 'Потрібно передати path та content.' });
        return;
      }
      writeWorkingFile(relPath, content);
      const ch1Content =
        readRepoFile(WORK_REPO_DIR, 'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java') ??
        '';
      const diagnostics = analyzeFile(relPath, content, ch1Content);
      res.json({ ok: true, path: relPath, diagnostics });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка збереження файлу' });
    }
  });

  // 4. Apply verified patch for single file, all files, or reset to GitHub original
  app.post('/api/repo/patch', (req, res) => {
    try {
      const { action, path: relPath } = req.body as { action?: string; path?: string };
      if (action === 'reset') {
        resetWorkingRepo();
        res.json({ ok: true, message: 'Робочу копію скинуто до оригіналу з GitHub (mathpar/mathTasks).' });
        return;
      }
      if (action === 'apply_all') {
        const result = applyAllPatches();
        res.json({
          ok: true,
          message: `Застосовано виправлення до ${result.patchedCount} файлів, очищено ${result.removedCount} чорнових артефактів.`,
        });
        return;
      }
      if (action === 'apply_file' && relPath) {
        const applied = applyPatchForFile(relPath);
        if (!applied) {
          res.status(404).json({ error: 'Для цього файлу немає готового патчу.' });
          return;
        }
        res.json({ ok: true, message: `Патч застосовано до ${relPath}.` });
        return;
      }
      res.status(400).json({ error: 'Невідома дія патчу.' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка застосування патчу' });
    }
  });

  // 5. Run automated verification test suite
  app.post('/api/tests/run', (req, res) => {
    try {
      const { mode } = req.body as { mode?: 'original' | 'working' };
      const summary = runTestSuite(mode === 'original' ? 'original' : 'working');
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка виконання тестів' });
    }
  });

  // 6. Generate live 10-task Mathpar assignment preview
  app.post('/api/generate/preview', (req, res) => {
    try {
      const { sectionId, weekNumber, assignmentNumber, mode, seedOffset } = req.body as {
        sectionId?: string;
        weekNumber?: number;
        assignmentNumber?: number;
        mode?: 'original' | 'working';
        seedOffset?: number;
      };
      const preview = generateAssignmentPreview(
        sectionId ?? '1.6',
        Number(weekNumber ?? 1),
        Number(assignmentNumber ?? 1),
        mode === 'original' ? 'original' : 'working',
        Number(seedOffset ?? 0)
      );
      res.json(preview);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка генерації завдання' });
    }
  });

  // 6b. Export all generated Mathpar .txt files (whole course or single section) as a .zip archive
  app.get('/api/export/tasks.zip', (req, res) => {
    try {
      ensureWorkingRepo();
      const scope = req.query.scope === 'section' ? 'section' : 'all';
      const sectionId = String(req.query.sectionId ?? '');
      const mode = req.query.mode === 'original' ? 'original' : 'working';
      const seedOffset = Number(req.query.seedOffset ?? 0) || 0;
      const repoDir = mode === 'original' ? ORIGINAL_REPO_DIR : WORK_REPO_DIR;
      const chapters = parseCoursePlan(repoDir);

      const entries: ZipEntryInput[] = [];
      const manifestLines: string[] = [
        'MathTasks 5 клас — Експорт згенерованих файлів Mathpar',
        `Режим: ${mode === 'working' ? 'виправлений (working)' : 'оригінал GitHub'}`,
        '',
      ];

      let globalIdx = 0;
      let totalFiles = 0;

      for (const ch of chapters) {
        for (const sec of ch.sections) {
          if (!sec.implemented) {
            globalIdx += sec.taskCount;
            if (scope === 'all') {
              manifestLines.push(`[ПРОПУЩЕНО] Розділ ${sec.id} (${sec.title}) — генератор ще не реалізовано`);
            }
            continue;
          }

          if (scope === 'section' && sec.id !== sectionId) {
            globalIdx += sec.taskCount;
            continue;
          }

          let secFiles = 0;
          for (let k = 0; k < sec.taskCount; k++) {
            globalIdx++;
            const weekNumber = Math.floor((globalIdx - 1) / 8) + 1;
            const assignmentNumber = ((globalIdx - 1) % 8) + 1;
            const preview = generateAssignmentPreview(sec.id, weekNumber, assignmentNumber, mode, seedOffset);
            const entryPath =
              scope === 'section'
                ? preview.fileName
                : `${ch.id}/section_${sec.id}/${preview.fileName}`;
            entries.push({ name: entryPath, content: preview.fullMathparText });
            secFiles++;
            totalFiles++;
          }

          manifestLines.push(
            `[OK] Розділ ${sec.id} (${sec.title}) — ${secFiles} файлів (${secFiles * 10} задач)`
          );
        }
      }

      if (entries.length === 0) {
        res.status(404).json({ error: 'Не знайдено реалізованих завдань для експорту.' });
        return;
      }

      manifestLines.push('', `Разом файлів: ${totalFiles} (${totalFiles * 10} задач)`);
      entries.unshift({ name: 'README_manifest.txt', content: manifestLines.join('\n') + '\n' });

      const zipBuf = buildZipBuffer(entries);
      const fileName =
        scope === 'section'
          ? `mathTasks-section-${sectionId.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip`
          : `mathTasks-5klass-${mode}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', String(zipBuf.length));
      res.send(zipBuf);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка експорту ZIP' });
    }
  });

  // 6c. Export entire patched Java repository as a .zip archive
  app.get('/api/export/repo.zip', (_req, res) => {
    try {
      ensureWorkingRepo();
      const files = listAllRepoFiles(WORK_REPO_DIR);
      const entries: ZipEntryInput[] = files.map((rel) => ({
        name: `mathTasks-work/${rel}`,
        content: fs.readFileSync(path.join(WORK_REPO_DIR, rel)),
      }));
      const zipBuf = buildZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="mathTasks-java-patched.zip"');
      res.setHeader('Content-Length', String(zipBuf.length));
      res.send(zipBuf);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Помилка експорту репозиторію' });
    }
  });

  // 7. Server-side Gemini AI deep code audit & new module generator
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { mode, filePath, targetPrompt, gradeLevel, sectionId } = req.body as {
        mode?: 'audit' | 'generate_module';
        filePath?: string;
        targetPrompt?: string;
        gradeLevel?: number;
        sectionId?: string;
      };

      const fileContent = filePath ? readRepoFile(WORK_REPO_DIR, filePath) ?? '' : undefined;
      const result = await runAiAnalysis({
        mode: mode === 'generate_module' ? 'generate_module' : 'audit',
        filePath,
        fileContent,
        targetPrompt:
          targetPrompt ??
          'Перевір Java-код на синтаксичні, математичні та Mathpar помилки й підготуй рефакторинг.',
        gradeLevel,
        sectionId,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Помилка звернення до Gemini API';
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MathTasks Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
