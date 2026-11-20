import type { CodeDiagnostic } from '../src/types/mathTasks.ts';
import { listAllRepoFiles, readRepoFile } from './repoStore.ts';

function findLine(content: string, needle: string | RegExp): number {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (typeof needle === 'string') {
      if (lines[i].includes(needle)) return i + 1;
    } else {
      if (needle.test(lines[i])) return i + 1;
    }
  }
  return 1;
}

export function analyzeFile(relPath: string, content: string, ch1Content?: string): CodeDiagnostic[] {
  const diags: CodeDiagnostic[] = [];

  if (relPath.endsWith('.txt')) {
    diags.push({
      id: `${relPath}:stray-txt`,
      file: relPath,
      line: 1,
      severity: 'medium',
      category: 'architecture',
      title: 'Зайвий текстовий артефакт у src/main/java',
      description: 'У каталозі вихідного коду Java зберігається чорновий текстовий файл, що засмічує структуру пакетів Maven.',
      suggestion: 'Видаліть чорнові .txt файли з src/main/java або перенесіть документацію у корінь репозиторію.',
    });
    return diags;
  }

  if (!relPath.endsWith('.java')) return diags;

  // 1. Chapter1Generator.java checks
  if (relPath.endsWith('Chapter1Generator.java')) {
    if (/expressionGen\.generateExpressionTask\(\s*j\s*\)/.test(content)) {
      diags.push({
        id: 'ch1-expr-type-mismatch',
        file: relPath,
        line: findLine(content, /expressionGen\.generateExpressionTask\(\s*j\s*\)/),
        severity: 'critical',
        category: 'compilation',
        title: 'Невідповідність типів: передано int замість String',
        description:
          'Метод Chapter14ExpressionGenerator.generateExpressionTask(String taskId) очікує String, але передається лічильник циклу j типу int. Це викликає помилку компіляції Java.',
        suggestion: 'Форматуйте номер задачі: expressionGen.generateExpressionTask(String.format("%02d", j)).',
      });
    }

    if (/eTask\.toString\(\)/.test(content)) {
      diags.push({
        id: 'ch1-task-tostring',
        file: relPath,
        line: findLine(content, /eTask\.toString\(\)/),
        severity: 'high',
        category: 'mathpar_syntax',
        title: 'Виклик Object.toString() на моделі Task',
        description:
          'Клас Task не перевизначає toString() у форматі Mathpar, тому eTask.toString() виведе посилання виду com.mathpartner.generator.model.Task@4f023edb.',
        suggestion: 'Використовуйте MathparRenderer або перетворіть усі модулі Глави 1 на єдину модель Assignment / Task.',
      });
    }

    if (/manager\.generateAllAssignments\s*\(/.test(content)) {
      diags.push({
        id: 'ch1-missing-method-main',
        file: relPath,
        line: findLine(content, /manager\.generateAllAssignments\s*\(/),
        severity: 'critical',
        category: 'compilation',
        title: 'Виклик неіснуючого методу generateAllAssignments()',
        description:
          'У методі main() викликається manager.generateAllAssignments("./math_assignments"), але в класі оголошено метод generateAndSaveAll(String outputDirectory).',
        suggestion: 'Замініть виклик на manager.generateAndSaveAll("./math_assignments").',
      });
    }

    if (/"TASK-Z \\"Вычислите умножение столбиком\.\\"\\n" \+ mTask\.mathparRender/.test(content)) {
      diags.push({
        id: 'ch1-mult-format',
        file: relPath,
        line: findLine(content, 'mTask.mathparRender'),
        severity: 'medium',
        category: 'mathpar_syntax',
        title: 'Неповний блок Mathpar для множення у стовпчик',
        description:
          'Вивід містить російський текст і не має обов’язкових розділювачів "---", "?", "===", "_ \\"Рішення.\\"" та фінальної відповіді для автоматичної перевірки.',
        suggestion: 'Огорніть задачу через Task + MathparRenderer з українським текстом та точною відповіддю.',
      });
    }
  }

  // 2. MainLauncher2.java checks
  if (relPath.endsWith('MainLauncher2.java')) {
    const ch1MissingMethod = ch1Content !== undefined ? !ch1Content.includes('generateAllChapterAssignments()') : true;
    if (/ch1Generator\.generateAllChapterAssignments\(\)/.test(content) && ch1MissingMethod) {
      diags.push({
        id: 'launcher2-missing-method',
        file: relPath,
        line: findLine(content, /ch1Generator\.generateAllChapterAssignments\(\)/),
        severity: 'critical',
        category: 'compilation',
        title: 'Виклик неіснуючого методу generateAllChapterAssignments()',
        description:
          'MainLauncher2 очікує, що Chapter1Generator має метод List<Assignment> generateAllChapterAssignments(), але цей метод відсутній у Chapter1Generator.',
        suggestion: 'Реалізуйте generateAllChapterAssignments() у Chapter1Generator згідно з інтерфейсом моделей Assignment/Task.',
      });
    }
  }

  // 3. MathparRenderer.java checks
  if (relPath.endsWith('MathparRenderer.java')) {
    if (content.includes('"_ Рішення ') && !content.includes('step.isText()')) {
      diags.push({
        id: 'renderer-ignores-istext',
        file: relPath,
        line: findLine(content, '"_ Рішення '),
        severity: 'high',
        category: 'mathpar_syntax',
        title: 'MathparRenderer ігнорує step.isText() та ламає синтаксис формул',
        description:
          'Усі кроки розв’язання склеюються всередину одного багаторядкового текстового рядка "_ Рішення ...", через що формули не обчислюються, а прості текстові кроки не розділяються крапкою з комою.',
        suggestion:
          'Рендеринг блоку розв’язку має відкриватися як _ "Рішення XX.", далі текстові кроки в "..." а обчислювальні вирази без лапок із ";" (крім останнього).',
      });
    }
  }

  // 4. Chapter16WorkGenerator.java checks
  if (relPath.endsWith('Chapter16WorkGenerator.java')) {
    if (content.includes('task.textUa = String.format("TASK-Z') || content.includes('task.textUa = String.format("TASK-Q')) {
      diags.push({
        id: 'work-duplicate-task-prefix',
        file: relPath,
        line: findLine(content, /task\.textUa = String\.format\("TASK-/),
        severity: 'medium',
        category: 'mathpar_syntax',
        title: 'Подвійний префікс TASK-Z / TASK-Q у виводі задачі',
        description:
          'Поле textUa вже починається з "TASK-Z 01. ...", а метод toString() повторно додає taskType перед лапками: TASK-Z "TASK-Z 01. ...".',
        suggestion: 'Залишайте в textUa лише номер і умову задачі, а префікс TASK-Z/TASK-Q формуйте в одному місці (у MathparRenderer).',
      });
    }

    if (content.includes('if (remainingNum <= 0)') && !content.includes('workDoneNum = jointRateNum * 2; // recalculated')) {
      const idx = content.indexOf('if (remainingNum <= 0)');
      const snippet = content.slice(idx, idx + 300);
      if (snippet.includes('t1 = 6; t2 = 8;') && !snippet.includes('task.textUa = String.format')) {
        diags.push({
          id: 'work-pipes-stale-text',
          file: relPath,
          line: findLine(content, 'if (remainingNum <= 0)'),
          severity: 'high',
          category: 'math_logic',
          title: 'Розбіжність умови та розв’язку в задачі про труби (stale state)',
          description:
            'Коли remainingNum <= 0, код змінює t1 = 6, t2 = 8 і remainingNum = 10, але task.textUa вже сформовано зі старими t1/t2, а workDoneNum взагалі не перераховується (залишається старим у кроці 2)!',
          suggestion:
            'Підбирайте параметри t1, t2 (наприклад, t1 ≥ 5, t2 ≥ 6 або перевіряйте умову 2*(1/t1 + 1/t2) < 1) ДО формування task.textUa та кроків розв’язання.',
        });
      }
    }
  }

  // 5. Chapter16MotionGenerator.java & ColumnDivisionGenerator.java language/format
  if (relPath.endsWith('Chapter16MotionGenerator.java') || relPath.endsWith('ColumnDivisionGenerator.java')) {
    if (content.includes('textRu') || content.includes('_ "Решение."')) {
      diags.push({
        id: `${relPath}-ru-language`,
        file: relPath,
        line: findLine(content, /textRu|Решение/),
        severity: 'medium',
        category: 'mathpar_syntax',
        title: 'Російськомовні рядки в українському підручнику для 5 класу',
        description:
          'Умови задач та заголовок розв’язку (_ "Решение.") написані російською мовою, хоча проєкт призначений для українського підручника (UA-SM-05).',
        suggestion: 'Перекладіть умови та кроки розв’язання українською мовою та використовуйте _ "Рішення.".',
      });
    }
  }

  // 6. ColumnDivisionGenerator divisor == 0 guard & Mathpar structure
  if (relPath.endsWith('ColumnDivisionGenerator.java')) {
    if (!content.includes('divisor <= 0') && !content.includes('divisor == 0')) {
      diags.push({
        id: 'div-zero-guard',
        file: relPath,
        line: findLine(content, 'dividend / divisor'),
        severity: 'high',
        category: 'math_logic',
        title: 'Відсутня перевірка ділення на нуль (divisor <= 0)',
        description: 'Метод generateTask(dividend, divisor, formatType) одразу виконує dividend / divisor без перевірки divisor <= 0.',
        suggestion: 'Додайте перевірку IllegalArgumentException при divisor <= 0.',
      });
    }
  }

  // 7. DivisibilityRulesGen.java checks
  if (relPath.endsWith('DivisibilityRulesGen.java')) {
    if (content.includes('/*/')) {
      diags.push({
        id: 'divisibility-comment-hazard',
        file: relPath,
        line: findLine(content, '/*/'),
        severity: 'medium',
        category: 'compilation',
        title: 'Некоректний маркер кінця коментаря /*/',
        description: 'У рядку 4 використано /*/ замість стандартного */, що знижує читабельність і може ламати наївні парсери.',
        suggestion: 'Використовуйте стандартний закриваючий тег Javadoc/коментаря */.',
      });
    }
    if (content.includes('чи ділиться воно на 3.", String.valueOf(d1 + d2 + d3)')) {
      diags.push({
        id: 'divisibility-ambiguous-prompt',
        file: relPath,
        line: findLine(content, 'чи ділиться воно на 3.'),
        severity: 'high',
        category: 'math_logic',
        title: 'Неоднозначна відповідь у задачі про подільність на 3',
        description:
          'Умова просить і обчислити суму цифр, і перевірити подільність на 3, але у відповідь очікується лише сума цифр без пояснення формату для автоматичної перевірки.',
        suggestion: 'Сформулюйте однозначно: запишіть суму цифр та/або введіть чітку вимогу до відповіді (число суми або 1/0).',
      });
    }
  }

  // 8. FractionArithmeticGen.java checks
  if (relPath.endsWith('FractionArithmeticGen.java')) {
    if (content.includes('String answer = (n1 + n2) + "/" + denom;')) {
      diags.push({
        id: 'frac-unreduced-answer',
        file: relPath,
        line: findLine(content, '(n1 + n2) + "/" + denom'),
        severity: 'high',
        category: 'math_logic',
        title: 'Результат додавання дробів не скорочується на НСД',
        description:
          'Наприклад, 2/6 + 2/6 дає відповідь "4/6" замість скороченого дробу "2/3", а також сума може перевищувати 1 (неправильний дріб).',
        suggestion: 'Скорочуйте результат на НСД(n1 + n2, denom) і обмежуйте чисельники так, щоб сума залишалась правильним дробом або перетворювалась на [ціле, чис/знам].',
      });
    }
  }

  // 9. DecimalArithmeticGen.java checks
  if (relPath.endsWith('DecimalArithmeticGen.java')) {
    if (!content.includes('BigDecimal')) {
      diags.push({
        id: 'dec-double-precision',
        file: relPath,
        line: findLine(content, 'double res = a * b'),
        severity: 'high',
        category: 'math_logic',
        title: 'Ризик похибки двійкової арифметики з плаваючою комою (double)',
        description: 'Обчислення a + b та a * b через double без BigDecimal може накопичувати похибку представлення (типу 0.30000000000000004).',
        suggestion: 'Використовуйте BigDecimal.valueOf(...) для точних десяткових операцій.',
      });
    }
  }

  // 10. DecimalAverageGen.java checks
  if (relPath.endsWith('DecimalAverageGen.java')) {
    if (content.includes('%d god')) {
      diags.push({
        id: 'dec-avg-god-typo',
        file: relPath,
        line: findLine(content, '%d god'),
        severity: 'medium',
        category: 'mathpar_syntax',
        title: 'Описка в українському тексті: "god" замість "год"',
        description: 'У рядку умови задачі на середню швидкість написано "і %d god зі швидкістю" латиницею.',
        suggestion: 'Замініть "god" на "год".',
      });
    }
    if (content.includes('double avg = sum / 3.0;') && !content.includes('BigDecimal')) {
      diags.push({
        id: 'dec-avg-nonterminating',
        file: relPath,
        line: findLine(content, 'double avg = sum / 3.0;'),
        severity: 'high',
        category: 'math_logic',
        title: 'Періодичний десятковий дріб при діленні на 3 без округлення в умові',
        description:
          'Випадкова сума n1 + n2 + n3 може не ділитися на 3 націло (наприклад, 19.9 / 3 = 6.6333...), але у відповіді та кроці пишеться точна рівність "= 6.63".',
        suggestion: 'Підбирайте числа так, щоб сума ділилася на 3 без остачі (гарантовано точний десятковий результат).',
      });
    }
  }

  // 11. Redundant regex in Chapter3/4/5Generator
  if (/replaceAll\("\[\\\\s\\\\s\]\+", "_"/.test(content)) {
    diags.push({
      id: `${relPath}-redundant-regex`,
      file: relPath,
      line: findLine(content, '[\\s\\s]+'),
      severity: 'medium',
      category: 'architecture',
      title: 'Надлишковий символьний клас [\\\\s\\\\s]+ у регулярному виразі',
      description: 'У replaceAll використано дубльований символ класу [\\s\\s]+ замість \\s+.',
      suggestion: 'Замініть на cleanName.trim().replaceAll("\\\\s+", "_").',
    });
  }

  return diags;
}

export function analyzeRepository(repoDir: string): CodeDiagnostic[] {
  const files = listAllRepoFiles(repoDir);
  const ch1Content =
    readRepoFile(repoDir, 'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java') ?? '';
  const all: CodeDiagnostic[] = [];
  for (const rel of files) {
    const content = readRepoFile(repoDir, rel);
    if (content !== null) {
      all.push(...analyzeFile(rel, content, ch1Content));
    }
  }
  return all;
}
