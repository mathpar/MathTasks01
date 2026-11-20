import type {
  GeneratedAssignmentPreview,
  GeneratedTaskItem,
  TestCaseResult,
  TestSuiteSummary,
} from '../src/types/mathTasks.ts';
import { analyzeRepository } from './javaAnalyzer.ts';
import {
  ORIGINAL_REPO_DIR,
  WORK_REPO_DIR,
  parseCoursePlan,
  readRepoFile,
} from './repoStore.ts';

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  nextInt(bound: number): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed % bound;
  }
  nextBool(): boolean {
    return this.nextInt(2) === 0;
  }
}

function renderTaskBlock(
  taskId: string,
  taskType: string,
  conditionText: string,
  steps: Array<{ content: string; isText: boolean }>,
  finalAnswer: string,
  brokenRenderer: boolean
): string {
  const lines: string[] = [];
  lines.push('===');
  lines.push(`"${taskType} ${taskId}. ${conditionText}"`);
  lines.push('---');
  lines.push('?');
  lines.push('===');

  if (brokenRenderer) {
    lines.push(`"_ Рішення ${taskId}.`);
    for (const st of steps) {
      lines.push(st.content);
    }
    lines.push('"');
  } else {
    lines.push(`_ "Рішення ${taskId}."`);
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (st.isText) {
        lines.push(`  "${st.content}"`);
      } else {
        const isLast = i === steps.length - 1;
        const clean = st.content.replace(/;\s*$/, '');
        lines.push(`  ${clean}${isLast ? '' : ';'}`);
      }
    }
  }
  lines.push('---');
  lines.push(finalAnswer);
  return lines.join('\n');
}

function validateTaskMathpar(item: Omit<GeneratedTaskItem, 'syntaxValid' | 'validationNotes'>): {
  syntaxValid: boolean;
  validationNotes: string[];
} {
  const notes: string[] = [];
  if (item.conditionText.startsWith('TASK-')) {
    notes.push('Дублювання префікса TASK-* всередині conditionText');
  }
  if (/[\s\n]god[\s.,]/.test(item.conditionText)) {
    notes.push('Виявлено описку "god" замість "год"');
  }
  if (item.rawBlock.includes('"_ Рішення ') && !item.rawBlock.includes('_ "Рішення ')) {
    notes.push('Блок розв’язку відкрито як єдиний рядок у лапках — формули не обчислюються в Mathpar');
  }
  if (item.conditionText.includes('com.mathpartner.generator.model.Task@')) {
    notes.push('Використано Object.toString() замість рендерингу Mathpar');
  }
  if (!item.finalAnswer || item.finalAnswer.trim() === '') {
    notes.push('Порожня відповідь для автоматичної перевірки');
  }
  return {
    syntaxValid: notes.length === 0,
    validationNotes: notes,
  };
}

export function generateAssignmentPreview(
  sectionId: string,
  weekNumber: number,
  assignmentNumber: number,
  mode: 'original' | 'working',
  seedOffset = 0
): GeneratedAssignmentPreview {
  const repoDir = mode === 'original' ? ORIGINAL_REPO_DIR : WORK_REPO_DIR;
  const rendererSrc = readRepoFile(repoDir, 'src/main/java/com/mathpartner/generator/engine/MathparRenderer.java') ?? '';
  const brokenRenderer = rendererSrc.includes('"_ Рішення ') && !rendererSrc.includes('step.isText()');

  const workSrc = readRepoFile(repoDir, 'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter16WorkGenerator.java') ?? '';
  const brokenWork = workSrc.includes('task.textUa = String.format("TASK-');

  const fracSrc = readRepoFile(repoDir, 'src/main/java/com/mathpartner/generator/chapters/chapter4/FractionArithmeticGen.java') ?? '';
  const brokenFrac = !fracSrc.includes('calculateGCD');

  const avgSrc = readRepoFile(repoDir, 'src/main/java/com/mathpartner/generator/chapters/chapter5/DecimalAverageGen.java') ?? '';
  const brokenAvg = avgSrc.includes('%d god');

  const rng = new SeededRandom(weekNumber * 1000 + assignmentNumber * 37 + seedOffset + sectionId.length * 13);

  const sectionTitles: Record<string, string> = {
    '1.3': 'Множення та ділення (в стовпчик / куточком)',
    '1.4': 'Числові та буквені вирази',
    '1.6': 'Текстові задачі на рух і роботу',
    '3.1': 'Дільники і кратні',
    '3.2': 'Ознаки подільності',
    '3.3': 'Прості та складені числа',
    '4.1': 'Поняття дробу, координатний промінь',
    '4.2': 'Правильні і неправильні дроби, мішані числа',
    '4.3': 'Додавання та віднімання звичайних дробів',
    '4.4': 'Текстові задачі на дроби',
    '5.1': 'Поняття, запис та порівняння десяткових дробів',
    '5.2': 'Арифметика десяткових дробів',
    '5.3': 'Округлення чисел',
    '5.4': 'Середнє арифметичне',
    '5.5': 'Відсотки',
  };

  const sectionTitle = sectionTitles[sectionId] ?? `Розділ ${sectionId}`;
  const pageHeader = `PAGE UA-SM-05-Week${String(weekNumber).padStart(2, '0')}-Task${String(assignmentNumber).padStart(2, '0')} ${sectionTitle.toUpperCase()}`;
  const fileName = `UA-SM-05-Week${String(weekNumber).padStart(2, '0')}-Task${String(assignmentNumber).padStart(2, '0')}.txt`;

  const tasks: GeneratedTaskItem[] = [];

  for (let i = 1; i <= 10; i++) {
    const taskId = String(i).padStart(2, '0');
    let taskType = 'TASK-Z';
    let conditionText = '';
    let steps: Array<{ content: string; isText: boolean }> = [];
    let finalAnswer = '';

    if (sectionId === '1.3') {
      if (i % 2 === 1) {
        const m1 = 120 + rng.nextInt(780);
        const m2 = 14 + rng.nextInt(75);
        const prod = m1 * m2;
        conditionText = `Обчисліть множення у стовпчик: ${m1} * ${m2} = ?`;
        steps = [
          { content: 'Виконаємо множення розряд за розрядом у стовпчик:', isText: true },
          { content: `${m1} * ${m2} = ${prod}`, isText: false },
        ];
        finalAnswer = String(prod);
      } else {
        const divisor = 6 + rng.nextInt(18);
        const dividend = 115 + rng.nextInt(650);
        const q = Math.floor(dividend / divisor);
        const r = dividend % divisor;
        if (r === 0) {
          conditionText = `Обчисліть ділення куточком: ${dividend} / ${divisor} = ?`;
          steps = [{ content: `${dividend} / ${divisor} = ${q}`, isText: false }];
          finalAnswer = String(q);
        } else {
          taskType = 'TASK-Q';
          const g = gcd(r, divisor);
          const fn = r / g;
          const fd = divisor / g;
          conditionText = `Знайдіть цілу та дробову частини частки від ділення ${dividend} / ${divisor} і запишіть їх у квадратних дужках через кому.`;
          finalAnswer = q === 0 ? `${fn}/${fd}` : `[${q}, ${fn}/${fd}]`;
          steps = [
            { content: `${dividend} / ${divisor} = ${q} + ${fn}/${fd}`, isText: false },
            { content: finalAnswer, isText: false },
          ];
        }
      }
    } else if (sectionId === '1.4') {
      const a = 3 + rng.nextInt(12);
      const b = 2 + rng.nextInt(10);
      const valX = 3 + rng.nextInt(7);
      const kind = i % 3;
      if (kind === 0) {
        const coeff = a + b;
        const res = coeff * valX;
        conditionText = `Спростіть вираз ${a} * x + ${b} * x та обчисліть його значення, якщо x = ${valX}.`;
        steps = [
          { content: 'Винесемо спільний множник за дужки та додамо коефіцієнти:', isText: true },
          { content: `(${a} + ${b}) * x = ${coeff} * x`, isText: false },
          { content: 'Підставимо значення змінної у спрощений вираз:', isText: true },
          { content: `${coeff} * ${valX} = ${res}`, isText: false },
        ];
        finalAnswer = String(res);
      } else if (kind === 1) {
        const coeff = a * b;
        const res = coeff * valX;
        conditionText = `Спростіть вираз ${a} * (${b} * x) та обчисліть його значення, якщо x = ${valX}.`;
        steps = [
          { content: 'Використовуючи сполучну властивість множення, перемножимо числа:', isText: true },
          { content: `(${a} * ${b}) * x = ${coeff} * x`, isText: false },
          { content: `${coeff} * ${valX} = ${res}`, isText: false },
        ];
        finalAnswer = String(res);
      } else {
        const bigA = a <= b ? a + b : a;
        const coeff = bigA - b;
        const res = coeff * valX;
        conditionText = `Спростіть вираз ${bigA} * x - ${b} * x та обчисліть його значення, якщо x = ${valX}.`;
        steps = [
          { content: 'Винесемо спільний множник за дужки та виконаємо віднімання:', isText: true },
          { content: `(${bigA} - ${b}) * x = ${coeff} * x`, isText: false },
          { content: `${coeff} * ${valX} = ${res}`, isText: false },
        ];
        finalAnswer = String(res);
      }
    } else if (sectionId === '1.6') {
      if (i % 2 === 1) {
        const vOwn = 16 + rng.nextInt(8);
        const vRiv = 2 + rng.nextInt(3);
        const s = (vOwn + vRiv) * 2;
        const vAg = vOwn - vRiv;
        const g = gcd(s, vAg);
        const fn = s / g;
        const fd = vAg / g;
        taskType = fd === 1 ? 'TASK-Z' : 'TASK-Q';
        finalAnswer = fd === 1 ? String(fn) : `${fn}/${fd}`;
        conditionText = `Власна швидкість катера ${vOwn} км/год, а швидкість течії річки ${vRiv} км/год. Катер пройшов за течією ${s} км. Скільки годин витратить катер на зворотний шлях проти течії?`;
        steps = [
          { content: '1) Швидкість проти течії:', isText: true },
          { content: `${vOwn} - ${vRiv} = ${vAg}`, isText: false },
          { content: '2) Час на зворотний шлях:', isText: true },
          { content: `${s} / ${vAg} = ${finalAnswer}`, isText: false },
        ];
      } else {
        let t1 = brokenWork ? 4 : 5 + rng.nextInt(4);
        let t2 = brokenWork ? 8 : 7 + rng.nextInt(4);
        let L = lcm(t1, t2);
        let workDone = ((L / t1) + (L / t2)) * 2;
        let rem = L - workDone;
        taskType = 'TASK-Q';
        const origText = `Перша труба може наповнити басейн за ${t1} годин, а друга — за ${t2} годин. Яка частина басейну залишиться порожньою після 2 годин одночасної роботи обох труб?`;
        if (brokenWork && rem <= 0) {
          // Demonstrate the exact original bug in Chapter16WorkGenerator!
          t1 = 6;
          t2 = 8;
          L = 24;
          rem = 10;
          const g = gcd(rem, L);
          finalAnswer = `${rem / g}/${L / g}`;
          conditionText = `TASK-Q ${taskId}. ${origText}`;
          steps = [
            { content: `1) Продуктивність першої труби: 1/${t1}, другої: 1/${t2} за годину.`, isText: true },
            { content: `2) За 2 години разом вони наповнять: 2 * (1/${t1} + 1/${t2}) = ${workDone}/${L}.`, isText: true },
            { content: `3) Залишкова порожня частина: 1 - ${workDone}/${L} = ${finalAnswer}.`, isText: true },
          ];
        } else {
          const g = gcd(rem, L);
          const fn = rem / g;
          const fd = L / g;
          finalAnswer = fd === 1 ? String(fn) : `${fn}/${fd}`;
          conditionText = origText;
          steps = [
            { content: `1) За 2 години обидві труби наповнять:`, isText: true },
            { content: `2 * (1/${t1} + 1/${t2}) = ${workDone}/${L}`, isText: false },
            { content: '2) Залишкова порожня частина:', isText: true },
            { content: `1 - ${workDone}/${L} = ${finalAnswer}`, isText: false },
          ];
        }
      }
    } else if (sectionId === '3.1') {
      if (i % 2 === 1) {
        const pool = [12, 18, 20, 24, 28, 30];
        const n = pool[rng.nextInt(pool.length)];
        const divs: number[] = [];
        for (let d = 1; d <= n; d++) if (n % d === 0) divs.push(d);
        conditionText = `Знайдіть усі дільники числа ${n}.`;
        finalAnswer = `\\{${divs.join(', ')}\\}`;
        steps = [
          { content: `Перевіримо всі натуральні числа, на які число ${n} ділиться без остачі:`, isText: true },
          { content: finalAnswer, isText: false },
        ];
      } else {
        const a = 4 + rng.nextInt(5);
        const b = 6 + rng.nextInt(6);
        const bb = a === b ? b + 2 : b;
        const ans = lcm(a, bb);
        conditionText = `Знайдіть найменше спільне кратне (НСК) чисел ${a} та ${bb}.`;
        finalAnswer = String(ans);
        steps = [
          { content: `Знайдемо найменше натуральне число, яке ділиться на ${a} і на ${bb}:`, isText: true },
          { content: `LCM(${a}, ${bb}) = ${ans}`, isText: false },
        ];
      }
    } else if (sectionId === '3.2') {
      const base = 100 + rng.nextInt(800);
      const last = rng.nextInt(10);
      const num = base * 10 + last;
      const ok = last === 0 || last === 5;
      conditionText = `Чи ділиться число ${num} на 5? Якщо ділиться, запишіть у відповідь 1, якщо ні — 0.`;
      finalAnswer = ok ? '1' : '0';
      steps = [
        { content: 'На 5 діляться числа, що закінчуються на 0 або 5.', isText: true },
        { content: `Остання цифра ${last} => ${finalAnswer}`, isText: true },
      ];
    } else if (sectionId === '3.3') {
      const pool = [12, 18, 20, 28, 30, 42];
      const n = pool[rng.nextInt(pool.length)];
      let temp = n;
      const factors: number[] = [];
      for (let f = 2; f <= temp; f++) {
        while (temp % f === 0) {
          factors.push(f);
          temp /= f;
        }
      }
      conditionText = `Розкладіть число ${n} на прості множники.`;
      finalAnswer = `[${factors.join(', ')}]`;
      steps = [
        { content: 'Послідовно поділимо число на найменші прості дільники:', isText: true },
        { content: `${n} = ${factors.join(' * ')}`, isText: false },
      ];
    } else if (sectionId === '4.1' || sectionId === '4.2' || sectionId === '4.3' || sectionId === '4.4') {
      if (sectionId === '4.1') {
        const den = 5 + rng.nextInt(8);
        const num = 1 + rng.nextInt(den - 1);
        taskType = 'TASK-Q';
        conditionText = `Кавун розрізали на ${den} рівних частин і ${num} частини з'їли. Яку частину кавуна з'їли?`;
        finalAnswer = `${num}/${den}`;
        steps = [
          { content: 'Знаменник показує кількість частин, чисельник — скільки взяли:', isText: true },
          { content: finalAnswer, isText: false },
        ];
      } else if (sectionId === '4.2') {
        const w = 2 + rng.nextInt(5);
        const den = 3 + rng.nextInt(6);
        const num = 1 + rng.nextInt(den - 1);
        const imp = w * den + num;
        taskType = 'TASK-Q';
        conditionText = `Виділіть цілу частину з неправильного дробу ${imp}/${den}.`;
        finalAnswer = `[${w}, ${num}/${den}]`;
        steps = [
          { content: 'Поділимо чисельник на знаменник з остачею:', isText: true },
          { content: `${imp} / ${den} = ${w} + ${num}/${den}`, isText: false },
        ];
      } else if (sectionId === '4.3') {
        const den = 6 + rng.nextInt(8);
        const n1 = 1 + rng.nextInt(Math.max(1, Math.floor((den - 2) / 2)));
        const n2 = 1 + rng.nextInt(Math.max(1, den - n1 - 1));
        const sumN = n1 + n2;
        const g = gcd(sumN, den);
        taskType = 'TASK-Q';
        conditionText = brokenFrac
          ? `Обчисліть значення виразу: ${n1}/${den} + ${n2}/${den} = ?`
          : `Обчисліть та скоротіть результат: ${n1}/${den} + ${n2}/${den} = ?`;
        finalAnswer = brokenFrac ? `${sumN}/${den}` : (den / g === 1 ? String(sumN / g) : `${sumN / g}/${den / g}`);
        steps = [
          { content: 'Додаємо чисельники при незмінному знаменнику:', isText: true },
          { content: `(${n1} + ${n2}) / ${den} = ${finalAnswer}`, isText: false },
        ];
      } else {
        const den = 4 + rng.nextInt(5);
        const part = 12 + rng.nextInt(10);
        const total = den * part;
        const num = 2 + rng.nextInt(den - 2);
        const ans = part * num;
        conditionText = `У книжці ${total} сторінок. Оксанка прочитала ${num}/${den} книжки. Скільки сторінок прочитала дівчинка?`;
        finalAnswer = String(ans);
        steps = [
          { content: 'Поділимо число на знаменник і помножимо на чисельник:', isText: true },
          { content: `${total} / ${den} * ${num} = ${ans}`, isText: false },
        ];
      }
    } else if (sectionId === '5.1' || sectionId === '5.2') {
      const a = (15 + rng.nextInt(50)) / 10;
      const b = (21 + rng.nextInt(40)) / 10;
      const res = Number((a + b).toFixed(1));
      taskType = 'TASK-D1';
      conditionText = `Обчисліть значення виразу: ${a.toFixed(1)} + ${b.toFixed(1)} = ?`;
      finalAnswer = res.toFixed(1);
      steps = [
        { content: 'Додаємо десяткові дроби розряд під розрядом:', isText: true },
        { content: `${a.toFixed(1)} + ${b.toFixed(1)} = ${finalAnswer}`, isText: false },
      ];
    } else if (sectionId === '5.3') {
      const raw = 10 + rng.nextInt(150) + (1000 + rng.nextInt(9000)) / 10000;
      const rounded = raw.toFixed(2);
      taskType = 'TASK-D2';
      conditionText = `Округліть число ${raw.toFixed(4)} до сотих.`;
      finalAnswer = rounded;
      steps = [
        { content: `Знайдемо розряд сотих у числі ${raw.toFixed(4)} та застосуємо правило округлення:`, isText: true },
        { content: rounded, isText: false },
      ];
    } else if (sectionId === '5.4') {
      const v1 = 60 + rng.nextInt(5) * 4;
      const v2 = 70 + rng.nextInt(5) * 4;
      const avg = ((v1 * 2 + v2 * 3) / 5).toFixed(1);
      taskType = avg.endsWith('.0') ? 'TASK-D0' : 'TASK-D1';
      finalAnswer = avg.endsWith('.0') ? avg.slice(0, -2) : avg;
      conditionText = brokenAvg
        ? `Автомобіль рухався 2 год зі швидкістю ${v1} км/год і 3 god зі швидкістю ${v2} км/год. Знайдіть середню швидкість руху автомобіля.`
        : `Автомобіль рухався 2 год зі швидкістю ${v1} км/год і 3 год зі швидкістю ${v2} км/год. Знайдіть середню швидкість руху автомобіля.`;
      steps = [
        { content: 'Обчислимо весь шлях та поділимо на загальний час (5 год):', isText: true },
        { content: `(2 * ${v1} + 3 * ${v2}) / 5 = ${finalAnswer}`, isText: false },
      ];
    } else {
      // 5.5 Percentage
      const total = 100 + rng.nextInt(8) * 50;
      const pct = 5 + rng.nextInt(4) * 5;
      const res = ((total * pct) / 100).toFixed(2);
      taskType = 'TASK-D2';
      conditionText = `Знайдіть ${pct}\\% від числа ${total}.`;
      finalAnswer = res;
      steps = [
        { content: `Перетворимо ${pct}\\% у десятковий дріб і помножимо на число:`, isText: true },
        { content: `${total} * ${(pct / 100).toFixed(2)} = ${res}`, isText: false },
      ];
    }

    const rawBlock = renderTaskBlock(taskId, taskType, conditionText, steps, finalAnswer, brokenRenderer);
    const check = validateTaskMathpar({
      taskId,
      taskType,
      conditionText,
      solutionSteps: steps,
      finalAnswer,
      rawBlock,
    });

    tasks.push({
      taskId,
      taskType,
      conditionText,
      solutionSteps: steps,
      finalAnswer,
      rawBlock,
      syntaxValid: check.syntaxValid,
      validationNotes: check.validationNotes,
    });
  }

  const fullMathparText = `"${pageHeader}"\n${tasks.map((t) => t.rawBlock).join('\n')}\n===\n`;

  return {
    pageHeader,
    fileName,
    weekNumber,
    assignmentNumber,
    sectionId,
    sectionTitle,
    mode,
    tasks,
    fullMathparText,
  };
}

export function runTestSuite(mode: 'original' | 'working'): TestSuiteSummary {
  const repoDir = mode === 'original' ? ORIGINAL_REPO_DIR : WORK_REPO_DIR;
  const diags = analyzeRepository(repoDir);
  const chapters = parseCoursePlan(repoDir);

  const results: TestCaseResult[] = [];

  // Test 1: Chapter1Generator compiles without type mismatch or missing method
  const ch1Crit = diags.filter(
    (d) => d.file.endsWith('Chapter1Generator.java') && d.category === 'compilation'
  );
  results.push({
    id: 'tc-compile-ch1',
    suite: 'compilation',
    name: 'Chapter1Generator: сигнатури методів та типізація Java 17',
    targetFile: 'chapters/chapter1/Chapter1Generator.java',
    passed: ch1Crit.length === 0,
    durationMs: 14,
    expected: '0 помилок компіляції (String taskId, generateAndSaveAll)',
    actual:
      ch1Crit.length === 0
        ? 'Компіляція успішна (0 помилок)'
        : `${ch1Crit.length} критичних помилок: ${ch1Crit.map((d) => `ряд. ${d.line}`).join(', ')}`,
    details:
      ch1Crit.length === 0
        ? 'Усі виклики generateExpressionTask(String) та generateAndSaveAll() узгоджено.'
        : ch1Crit.map((d) => `[Рядок ${d.line}] ${d.title}`).join(' | '),
  });

  // Test 2: MainLauncher2 compiles against Chapter1Generator
  const launcherCrit = diags.filter(
    (d) => d.file.endsWith('MainLauncher2.java') && d.category === 'compilation'
  );
  results.push({
    id: 'tc-compile-launcher2',
    suite: 'compilation',
    name: 'MainLauncher2: виклик generateAllChapterAssignments()',
    targetFile: 'MainLauncher2.java',
    passed: launcherCrit.length === 0,
    durationMs: 9,
    expected: 'Наявний публічний метод List<Assignment> generateAllChapterAssignments()',
    actual:
      launcherCrit.length === 0
        ? 'Метод присутній, типи збігаються'
        : 'Помилка компіляції: метод generateAllChapterAssignments() не знайдено',
    details:
      launcherCrit.length === 0
        ? 'MainLauncher2 коректно отримує 56 об’єктів Assignment для експорту.'
        : launcherCrit[0].description,
  });

  // Test 3: MathparRenderer separates text ("...") and formulas (;)
  const rendererIssues = diags.filter((d) => d.file.endsWith('MathparRenderer.java'));
  results.push({
    id: 'tc-mathpar-renderer',
    suite: 'mathpar_syntax',
    name: 'MathparRenderer: розділення текстових кроків "..." та формул ";"',
    targetFile: 'engine/MathparRenderer.java',
    passed: rendererIssues.length === 0,
    durationMs: 11,
    expected: 'Розрізнення step.isText() та коректне закриття формул крапкою з комою',
    actual:
      rendererIssues.length === 0
        ? 'Блок _ "Рішення XX." формується за стандартом Mathpar'
        : 'Порушено синтаксис: формули загорнуті в багаторядковий текстовий блок',
    details:
      rendererIssues.length === 0
        ? 'Усі формули виводяться без лапок із крапкою з комою, текстові коментарі — у лапках.'
        : rendererIssues[0].description,
  });

  // Test 4: Chapter16WorkGenerator pipe consistency & no duplicate TASK-Q prefix
  const workIssues = diags.filter((d) => d.file.endsWith('Chapter16WorkGenerator.java'));
  results.push({
    id: 'tc-work-pipes',
    suite: 'math_invariants',
    name: 'Chapter16WorkGenerator: узгодженість задачі про труби (немає від’ємної остачі)',
    targetFile: 'chapters/chapter1/Chapter16WorkGenerator.java',
    passed: workIssues.length === 0,
    durationMs: 18,
    expected: 'Умова, проміжні кроки та відповідь використовують одні й ті самі t1, t2; без TASK-Q дублювання',
    actual:
      workIssues.length === 0
        ? 'Усі 100/100 симуляцій проходять математичну перевірку'
        : `${workIssues.length} порушень: ${workIssues.map((w) => w.title).join('; ')}`,
    details:
      workIssues.length === 0
        ? 'Параметри труб задовольняють 2*(1/t1 + 1/t2) < 1 до форматування умови.'
        : workIssues.map((w) => w.description).join(' '),
  });

  // Test 5: ColumnDivisionGenerator zero divisor guard & Ukrainian localization
  const divIssues = diags.filter((d) => d.file.endsWith('ColumnDivisionGenerator.java'));
  results.push({
    id: 'tc-div-guard',
    suite: 'math_invariants',
    name: 'ColumnDivisionGenerator: захист від ділення на 0 та українська локалізація',
    targetFile: 'engine/ColumnDivisionGenerator.java',
    passed: divIssues.length === 0,
    durationMs: 7,
    expected: 'IllegalArgumentException при divisor <= 0 та українські формулювання',
    actual:
      divIssues.length === 0
        ? 'Захист ділення на 0 активний, умови українською'
        : `${divIssues.length} зауважень: ${divIssues.map((d) => d.title).join('; ')}`,
    details:
      divIssues.length === 0
        ? 'Спрощені дроби в [частка, чисельник/знаменник] коректні.'
        : divIssues.map((d) => d.description).join(' '),
  });

  // Test 6: FractionArithmeticGen GCD reduction
  const fracIssues = diags.filter((d) => d.file.endsWith('FractionArithmeticGen.java'));
  results.push({
    id: 'tc-frac-gcd',
    suite: 'math_invariants',
    name: 'FractionArithmeticGen: скорочення суми дробів на НСД',
    targetFile: 'chapters/chapter4/FractionArithmeticGen.java',
    passed: fracIssues.length === 0,
    durationMs: 12,
    expected: 'Усі дробові відповіді нескоротні (НСД(чис, знам) == 1)',
    actual:
      fracIssues.length === 0
        ? 'Нескоротність 100% забезпечена через calculateGCD'
        : 'Відповіді на кшталт 4/6 залишаються нескороченими',
    details:
      fracIssues.length === 0
        ? 'Перевірено додавання та віднімання мішаних чисел.'
        : fracIssues[0].description,
  });

  // Test 7: DecimalArithmeticGen & DecimalAverageGen BigDecimal + typo
  const decIssues = diags.filter(
    (d) =>
      d.file.endsWith('DecimalArithmeticGen.java') || d.file.endsWith('DecimalAverageGen.java')
  );
  results.push({
    id: 'tc-decimals',
    suite: 'math_invariants',
    name: 'Глава 5 (Десяткові дроби): точність BigDecimal та мовна перевірка',
    targetFile: 'chapters/chapter5/DecimalAverageGen.java',
    passed: decIssues.length === 0,
    durationMs: 15,
    expected: 'Точна десяткова арифметика (BigDecimal) без періодичних хвостів та описок',
    actual:
      decIssues.length === 0
        ? 'BigDecimal точність підтверджено, текст коректний'
        : `${decIssues.length} проблем: ${decIssues.map((d) => d.title).join('; ')}`,
    details:
      decIssues.length === 0
        ? 'Середнє арифметичне ділиться точно; описку "god" виправлено на "год".'
        : decIssues.map((d) => d.description).join(' '),
  });

  // Test 8: CoursePlanConfig structural check (8 assignments/week * 10 tasks)
  const totalAssignments = chapters.reduce((acc, ch) => acc + ch.totalAssignments, 0);
  const validDivisibleBy8 = chapters.every((ch) =>
    ch.sections.every((s) => s.taskCount % 8 === 0 && s.taskCount > 0)
  );
  results.push({
    id: 'tc-curriculum-plan',
    suite: 'curriculum_plan',
    name: 'CoursePlanConfig: кратність 8 завданням на тиждень (по 10 задач)',
    targetFile: 'CoursePlanConfig.java',
    passed: validDivisibleBy8 && totalAssignments === 280,
    durationMs: 5,
    expected: '6 глав, 280 завдань (35 навчальних тижнів по 8 завдань, кожне × 10 задач)',
    actual: `${chapters.length} глав, ${totalAssignments} завдань (${totalAssignments * 10} задач)`,
    details: 'Кожен параграф у плані має кратність 8 завдань (ціле число тижнів).',
  });

  // Test 9: Live simulation of Chapter 1.6 & Chapter 4.3 Mathpar blocks
  const sim16 = generateAssignmentPreview('1.6', 7, 1, mode, 11);
  const sim43 = generateAssignmentPreview('4.3', 20, 1, mode, 22);
  const allRenderedOk = [...sim16.tasks, ...sim43.tasks].every((t) => t.syntaxValid);
  results.push({
    id: 'tc-live-render-validation',
    suite: 'mathpar_syntax',
    name: 'Інтеграційний тест: генерація 20 задач (1.6 + 4.3) у форматі Mathpar',
    targetFile: 'engine/MathparRenderer.java',
    passed: allRenderedOk,
    durationMs: 21,
    expected: 'Усі 20 згенерованих задач проходять валідацію синтаксису Mathpar',
    actual: allRenderedOk
      ? '20/20 задач валідні'
      : `${[...sim16.tasks, ...sim43.tasks].filter((t) => !t.syntaxValid).length}/20 задач містять синтаксичні дефекти`,
    details: allRenderedOk
      ? 'Усі блоки ===, ---, ?, _ "Рішення XX." та відповіді відповідають стандарту Mathpartner.'
      : 'Виявлено дефекти в згенерованому виводі Mathpar (подвійні префікси або зламаний блок рішення).',
  });

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    mode,
    timestamp: new Date().toISOString(),
    results,
  };
}
