import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { AiAnalysisResponse } from '../src/types/mathTasks.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не налаштовано на сервері. Перевірте налаштування секретів.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `Ти — Senior Java Developer, архітектор програмного забезпечення та профільний експерт платформи Mathpartner, а також вчитель математики у школі.
Твоя спеціалізація — розробка, рефакторинг та розширення Java-пакетів для автоматичної генерації шкільних математичних задачників (зокрема підручників 1–12 класів, репозиторій mathpar/mathTasks).

Суворі технічні правила:
1. Усі пояснення, архітектурні поради та Javadoc-коментарі пиши виключно українською мовою.
2. Синтаксис Mathpar:
   - У всіх умовах задач останнім символом має бути знак питання ?; подвійна лапка може стояти лише перед ?, але не після нього (тобто "TASK-Z 01. Текст умови"?).
   - Усі службові рядки на початку рядка беруться в лапки: "===", "---", та "_ Рішення XX." (замість _ ").
   - Текст кроків розв'язання береться в подвійні лапки "...".
   - Математичні вирази та формули у блоці розв'язання не беруться в лапки і закінчуються крапкою з комою ; (крім останнього виразу перед "---").
   - Упорядковані вектори (наприклад, мішані числа або послідовності): [a, b/c]. Неупорядковані множини: \\{1, 2, 3\\}. Відсотки екрануються: \\%.
   - Поодинокі відповіді не беруться в дужки і не мають крапки з комою.
3. Java 17 та архітектура mathTasks:
   - Пакет com.mathpartner.generator.*
   - Наслідуй/використовуй Task, SolutionStep, Assignment, AssignmentGenerator, MathparRenderer.
   - Забезпечуй сувору типізацію, Google Java Style Guide, перевірку ділення на нуль, швидку рандомізацію без нескінченних циклів та відповідність програмі класу (наприклад, без від'ємних результатів у базовій арифметиці 5 класу).`;

export async function runAiAnalysis(params: {
  mode: 'audit' | 'generate_module';
  filePath?: string;
  fileContent?: string;
  targetPrompt: string;
  gradeLevel?: number;
  sectionId?: string;
}): Promise<AiAnalysisResponse> {
  const ai = getAiClient();
  const modelName = 'gemini-4-hydrogen';

  const userPrompt =
    params.mode === 'audit'
      ? `Проаналізуй наступний Java-файл із репозиторію mathpar/mathTasks (${params.filePath ?? 'невідомий файл'}):

\`\`\`java
${params.fileContent ?? ''}
\`\`\`

Додаткове завдання користувача:
${params.targetPrompt}

Знайди всі синтаксичні, логічні, математичні помилки та порушення синтаксису Mathpar. Запропонуй архітектурне рішення та надай повний виправлений Java-код із Javadoc українською мовою і прикладом згенерованого Mathpar-блоку.`
      : `Створи новий Java-модуль генератора задач для платформи Mathpartner (${params.gradeLevel ?? 5} клас, розділ ${params.sectionId ?? 'новий'}).

Запит користувача:
${params.targetPrompt}

Архітектурні вимоги:
- Код має інтегруватися в пакет com.mathpartner.generator (використовувати Task, SolutionStep, Assignment, AssignmentGenerator, MathparRenderer).
- Якщо це підрозділ 5 класу (наприклад 1.1, 1.2, 1.5, Глава 2 або Глава 6) або іншого класу (6–12), реалізуй повний робочий клас із генерацією різнотипних задач, перевіркою крайових умов (ділення на нуль, цілочисельність де потрібно) та валідним форматом Mathpar.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Короткий структурований підсумок аналізу або архітектури нового модуля українською мовою.',
          },
          architectureNotes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Покрокові архітектурні зауваження, виявлені помилки або математичні інваріанти українською.',
          },
          suggestedFilePath: {
            type: Type.STRING,
            description: 'Відносний шлях Java-файлу у структурі src/main/java/com/mathpartner/generator/...',
          },
          fixedOrGeneratedCode: {
            type: Type.STRING,
            description: 'Повний чистий Java 17 код відповідно до Google Java Style Guide з Javadoc українською.',
          },
          mathparSample: {
            type: Type.STRING,
            description: 'Приклад однієї задачі, згенерованої цим кодом у синтаксисі Mathpar (===, ---, ?, _ "Рішення 01.").',
          },
        },
        required: [
          'summary',
          'architectureNotes',
          'suggestedFilePath',
          'fixedOrGeneratedCode',
          'mathparSample',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    summary: string;
    architectureNotes: string[];
    suggestedFilePath: string;
    fixedOrGeneratedCode: string;
    mathparSample: string;
  };

  return {
    mode: params.mode,
    summary: parsed.summary ?? '',
    architectureNotes: Array.isArray(parsed.architectureNotes) ? parsed.architectureNotes : [],
    suggestedFilePath: parsed.suggestedFilePath ?? params.filePath ?? '',
    fixedOrGeneratedCode: parsed.fixedOrGeneratedCode ?? '',
    mathparSample: parsed.mathparSample ?? '',
    modelUsed: modelName,
  };
}
