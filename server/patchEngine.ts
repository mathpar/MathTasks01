import { deleteWorkingFile, writeWorkingFile } from './repoStore.ts';

export const PATCHED_FILES: Record<string, string> = {
  'src/main/java/com/mathpartner/generator/model/Task.java': String.raw`package com.mathpartner.generator.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Модель окремої математичної задачі у форматі платформи Mathpartner.
 */
public class Task {
  private final String taskId;
  private final String taskType; // "TASK-Z", "TASK-Q", "TASK-D0", "TASK-D1", "TASK-D2", "TASK-D4"
  private final String conditionText;
  private String conditionMath;
  private final List<SolutionStep> solutionSteps = new ArrayList<>();
  private final String finalAnswer;

  public Task(String taskId, String taskType, String conditionText, String finalAnswer) {
    this.taskId = taskId;
    this.taskType = taskType;
    this.conditionText = conditionText;
    this.finalAnswer = finalAnswer;
  }

  public void addTextStep(String text) {
    solutionSteps.add(new SolutionStep(text, true));
  }

  /**
   * Додає обчислювальний крок мовою Mathpar (виводиться без подвійних лапок).
   */
  public void addFormulaStep(String formula) {
    solutionSteps.add(new SolutionStep(formula, false));
  }

  public String getTaskId() {
    return taskId;
  }

  public String getTaskType() {
    return taskType;
  }

  public String getConditionText() {
    return conditionText;
  }

  public String getConditionMath() {
    return conditionMath;
  }

  public void setConditionMath(String conditionMath) {
    this.conditionMath = conditionMath;
  }

  public List<SolutionStep> getSolutionSteps() {
    return solutionSteps;
  }

  public String getFinalAnswer() {
    return finalAnswer;
  }

  @Override
  public String toString() {
    return String.format("%s \"%s. %s\" -> %s", taskType, taskId, conditionText, finalAnswer);
  }
}
`,

  'src/main/java/com/mathpartner/generator/engine/MathparRenderer.java': String.raw`package com.mathpartner.generator.engine;

import com.mathpartner.generator.model.Assignment;
import com.mathpartner.generator.model.SolutionStep;
import com.mathpartner.generator.model.Task;
import java.util.List;

/**
 * Двигун рендерингу завдань у строгий синтаксис платформи Mathpartner.
 */
public class MathparRenderer {

  /**
   * Формує повний текст завдання для тижня з 10 задач у форматі Mathpar.
   */
  public String renderAssignment(Assignment assignment) {
    StringBuilder sb = new StringBuilder();
    sb.append("\"").append(assignment.getPageHeader()).append("\"\n");

    for (Task task : assignment.getTasks()) {
      sb.append(renderTask(task));
    }
    sb.append("\"===\"\n");
    return sb.toString();
  }

  /**
   * Рендерить одну задачу з розділювачами "===", "---", ?, "_ " та умовою, що закінчується на ?.
   */
  public String renderTask(Task task) {
    String rawCondition = task.getConditionText() == null ? "" : task.getConditionText().trim();
    StringBuilder sb = new StringBuilder();
    sb.append("\"===\"\n");

    if (task.getConditionMath() != null && !task.getConditionMath().isBlank()) {
      String textPart = rawCondition.replaceAll("[?\"\\s]+$", "");
      sb.append("\"")
          .append(task.getTaskType())
          .append(" ")
          .append(task.getTaskId())
          .append(". ")
          .append(textPart)
          .append(" \"\n");
      String mathCond = task.getConditionMath().replaceAll("\\s+$", "");
      if (!mathCond.endsWith("?")) {
        mathCond = mathCond + "?";
      }
      sb.append(mathCond).append("\n");
    } else {
      String cleanCondition = rawCondition.replaceAll("[.?\"\\s]+$", "");
      if (cleanCondition.endsWith("=")) {
        cleanCondition = cleanCondition + " ";
      }
      sb.append("\"")
          .append(task.getTaskType())
          .append(" ")
          .append(task.getTaskId())
          .append(". ")
          .append(cleanCondition)
          .append("\"?\n");
    }

    sb.append("\"---\"\n?\n\"===\"\n");

    List<SolutionStep> steps = task.getSolutionSteps();
    int startIdx = 0;
    if (!steps.isEmpty() && steps.get(0).isText()) {
      sb.append("\"_ Рішення ")
          .append(task.getTaskId())
          .append(".\n  ")
          .append(steps.get(0).getContent().trim())
          .append("\"\n");
      startIdx = 1;
    } else {
      sb.append("\"_ Рішення ").append(task.getTaskId()).append(".\"\n");
    }

    for (int i = startIdx; i < steps.size(); i++) {
      SolutionStep step = steps.get(i);
      if (step.isText()) {
        sb.append("  \"").append(step.getContent().trim()).append("\"\n");
      } else {
        boolean isLast = (i == steps.size() - 1);
        String rawFormula = step.getContent().replaceAll("[;\\s]+$", "");
        if (rawFormula.contains("\n")) {
          sb.append(rawFormula).append(isLast ? "" : ";").append("\n");
        } else {
          sb.append("  ").append(rawFormula.trim()).append(isLast ? "" : ";").append("\n");
        }
      }
    }

    sb.append("\"---\"\n").append(task.getFinalAnswer()).append("\n");
    return sb.toString();
  }
}
`,

  'src/main/java/com/mathpartner/generator/engine/ColumnMultiplicationGenerator.java': String.raw`package com.mathpartner.generator.engine;

import com.mathpartner.generator.model.Task;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Генератор задач на множення у стовпчик із суворим вирівнюванням розрядів
 * (одиниці під одиницями, десятки під десятками, сотні під сотнями).
 */
public class ColumnMultiplicationGenerator {

  private final Random random = new Random();

  public static class MultiplicationTask {
    public int multiplicand;
    public int multiplier;
    public int[] intermediateProducts;
    public int finalResult;
    public String conditionMath;
    public String mathparRender;

    @Override
    public String toString() {
      return mathparRender;
    }

    /**
     * Перетворює задачу множення у стовпчик на модель Task для MathparRenderer.
     */
    public Task toTask(String taskId) {
      Task task =
          new Task(
              taskId,
              "TASK-Z",
              "Обчисліть множення у стовпчик:",
              String.valueOf(finalResult));
      task.setConditionMath(conditionMath);
      task.addTextStep("Виконаємо множення розряд за розрядом у стовпчик:");
      task.addFormulaStep(mathparRender);
      return task;
    }
  }

  /**
   * Генерує задачу на множення двох чисел заданої розрядності.
   */
  public MultiplicationTask generateTask(int digits1, int digits2) {
    MultiplicationTask task = new MultiplicationTask();

    task.multiplicand = generateRandomNumber(digits1);
    task.multiplier = generateNonZeroDigitNumber(digits2);
    task.finalResult = task.multiplicand * task.multiplier;

    String multiplierStr = String.valueOf(task.multiplier);
    int len = multiplierStr.length();
    task.intermediateProducts = new int[len];

    for (int i = 0; i < len; i++) {
      int digit = Character.getNumericValue(multiplierStr.charAt(len - 1 - i));
      task.intermediateProducts[i] = task.multiplicand * digit;
    }

    task.conditionMath = buildColumnBlock(task, true);
    task.mathparRender = buildColumnBlock(task, false);
    return task;
  }

  private int generateRandomNumber(int digits) {
    if (digits <= 0) {
      return 0;
    }
    int min = (int) Math.pow(10, digits - 1);
    int max = (int) Math.pow(10, digits) - 1;
    return min + random.nextInt(max - min + 1);
  }

  private int generateNonZeroDigitNumber(int digits) {
    if (digits <= 0) {
      return 0;
    }
    int value = 0;
    for (int i = 0; i < digits; i++) {
      value = value * 10 + (1 + random.nextInt(9));
    }
    return value;
  }

  private String spaces(int count) {
    return " ".repeat(Math.max(0, count));
  }

  /**
   * Формує стовпчик множення з жорстким позиціонуванням кожного розряду.
   */
  private String buildColumnBlock(MultiplicationTask task, boolean conditionOnly) {
    String m1 = String.valueOf(task.multiplicand);
    String m2 = String.valueOf(task.multiplier);
    String res = String.valueOf(task.finalResult);

    int minLeftRel = Math.min(-(m1.length() - 1), Math.min(-(m2.length() - 1), -(res.length() - 1)));
    List<int[]> partialRows = new ArrayList<>();
    for (int k = 0; k < task.intermediateProducts.length; k++) {
      partialRows.add(new int[] {k, task.intermediateProducts[k]});
    }

    for (int idx = 0; idx < partialRows.size(); idx++) {
      int shift = partialRows.get(idx)[0];
      String pStr = String.valueOf(partialRows.get(idx)[1]);
      int left = -(shift + pStr.length() - 1) - (idx > 0 ? 1 : 0);
      if (left < minLeftRel) {
        minLeftRel = left;
      }
    }

    int starCol = 4;
    int starRel = minLeftRel - 1;
    int onesCol = starCol - starRel;

    StringBuilder sb = new StringBuilder();
    int m1Start = onesCol - (m1.length() - 1);
    sb.append(spaces(m1Start)).append(m1).append("\n");

    int m2Start = onesCol - (m2.length() - 1);
    sb.append(spaces(starCol))
        .append("*")
        .append(spaces(m2Start - starCol - 1))
        .append(m2)
        .append("=");

    if (conditionOnly) {
      sb.append(" ?");
      return sb.toString();
    }
    sb.append("\n");

    if (partialRows.size() > 1) {
      for (int idx = 0; idx < partialRows.size(); idx++) {
        int shift = partialRows.get(idx)[0];
        String pStr = String.valueOf(partialRows.get(idx)[1]);
        int pEndCol = onesCol - shift;
        int pStartCol = pEndCol - (pStr.length() - 1);
        if (idx == 0) {
          sb.append(spaces(pStartCol)).append(pStr).append("\n");
        } else {
          boolean isLastPartial = (idx == partialRows.size() - 1);
          sb.append(spaces(pStartCol - 1)).append("+").append(pStr);
          if (isLastPartial) {
            sb.append(spaces(onesCol + 1 - (pEndCol + 1))).append("=");
          }
          sb.append("\n");
        }
      }
    }

    int resStart = onesCol - (res.length() - 1);
    sb.append(spaces(resStart)).append(res);
    return sb.toString();
  }
}
`,

  'src/main/java/com/mathpartner/generator/engine/ColumnDivisionGenerator.java': String.raw`package com.mathpartner.generator.engine;

import com.mathpartner.generator.model.Task;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Генератор ділення куточком із суворим вирівнюванням розрядів, контролем ділення на нуль
 * та розділенням пошуку цілої і дробової частин на окремі задачі.
 */
public class ColumnDivisionGenerator {

  private final Random random = new Random();

  public static class DivisionTask {
    public String taskType; // TASK-Z або TASK-Q
    public String textUa;
    public String conditionMath;
    public String solution;
    public String answer;

    @Override
    public String toString() {
      return toTask("01").toString();
    }

    public Task toTask(String taskId) {
      Task task = new Task(taskId, taskType, textUa, answer);
      task.setConditionMath(conditionMath);
      String[] parts = solution.split("\\n---STEPS---\\n");
      if (parts.length > 0 && !parts[0].isBlank()) {
        task.addTextStep(parts[0].trim());
      }
      if (parts.length > 1) {
        String[] blocks = parts[1].split("\\n---BLOCK---\\n");
        for (String block : blocks) {
          String clean = block.replaceAll("[;\\s]+$", "");
          if (!clean.isBlank()) {
            task.addFormulaStep(clean);
          }
        }
      }
      return task;
    }
  }

  /**
   * Генерує задачу на ділення згідно із затвердженими типами формулювань.
   *
   * @param dividend ділене
   * @param divisor дільник (має бути &gt; 0)
   * @param formatType 0 — точне ділення без остачі,
   *     1 — [частка, остача],
   *     2 — пошук цілої частини частки (окрема задача TASK-Z),
   *     3 — пошук дробової частини частки (окрема задача TASK-Q)
   */
  public DivisionTask generateTask(int dividend, int divisor, int formatType) {
    if (divisor <= 0) {
      throw new IllegalArgumentException("Дільник має бути додатним числом (divisor > 0).");
    }

    DivisionTask task = new DivisionTask();
    if (formatType == 0) {
      dividend = (dividend / divisor) * divisor;
      if (dividend == 0) {
        dividend = divisor * (2 + random.nextInt(9));
      }
    } else if ((formatType == 2 || formatType == 3) && dividend % divisor == 0) {
      dividend += 1 + random.nextInt(Math.max(1, divisor - 1));
    }

    int quotient = dividend / divisor;
    int remainder = dividend % divisor;
    String columnBlock = buildColumnDivisionBlock(dividend, divisor);
    task.conditionMath = String.format("    %d/%d =?", dividend, divisor);
    String introText = String.format("Виконаємо ділення куточком %d на %d:", dividend, divisor);

    if (remainder == 0) {
      task.taskType = "TASK-Z";
      task.textUa = "Обчисліть ділення куточком:";
      task.answer = String.valueOf(quotient);
      task.solution =
          introText
              + "\n---STEPS---\n"
              + columnBlock
              + "\n---BLOCK---\n"
              + String.format("(%d)", quotient);
      return task;
    }

    if (formatType == 1) {
      task.taskType = "TASK-Z";
      task.textUa = "Знайдіть неповну частку та остачу від ділення:";
      task.answer = String.format("[%d, %d]", quotient, remainder);
      task.solution =
          introText
              + "\n---STEPS---\n"
              + columnBlock
              + "\n---BLOCK---\n"
              + String.format("%d = %d * %d + %d", dividend, divisor, quotient, remainder)
              + "\n---BLOCK---\n"
              + String.format("[%d, %d]", quotient, remainder);
    } else if (formatType == 2) {
      // Окрема задача 1: пошук цілої частини частки
      task.taskType = "TASK-Z";
      task.textUa = "Знайдіть цілу частину частки від ділення";
      task.answer = String.valueOf(quotient);
      task.solution =
          introText
              + "\n---STEPS---\n"
              + columnBlock
              + "\n---BLOCK---\n"
              + String.format("%d = %d * %d + %d", dividend, divisor, quotient, remainder)
              + "\n---BLOCK---\n"
              + String.format("(%d)", quotient);
    } else {
      // Окрема задача 2: пошук дробової частини частки
      task.taskType = "TASK-Q";
      task.textUa = "Знайдіть дробову частину частки від ділення";

      int gcd = calculateGCD(remainder, divisor);
      int finalNum = remainder / gcd;
      int finalDen = divisor / gcd;

      task.answer = String.format("%d/%d", finalNum, finalDen);
      String reductionStep =
          (gcd > 1)
              ? String.format("%d/%d=%d/%d", remainder, divisor, finalNum, finalDen)
              : task.answer;
      task.solution =
          introText
              + "\n---STEPS---\n"
              + columnBlock
              + "\n---BLOCK---\n"
              + String.format("%d/%d = %d + %d/%d", dividend, divisor, quotient, remainder, divisor)
              + "\n---BLOCK---\n"
              + reductionStep;
    }

    return task;
  }

  /**
   * Будує блок ділення куточком із точним позиціонуванням розрядів під діленим.
   */
  private String buildColumnDivisionBlock(int dividend, int divisor) {
    String digits = String.valueOf(dividend);
    String divisorStr = String.valueOf(divisor);
    int baseCol = 4;
    int qCol = baseCol + digits.length() + divisorStr.length() + 1;

    List<String> lines = new ArrayList<>();
    lines.add(" ".repeat(baseCol) + digits + "/" + divisorStr + "=");

    int current = 0;
    boolean started = false;
    for (int i = 0; i < digits.length(); i++) {
      current = current * 10 + (digits.charAt(i) - '0');
      if (!started && current < divisor && i < digits.length() - 1) {
        continue;
      }
      int curEndCol = baseCol + i;
      if (started) {
        String curStr = String.valueOf(current);
        int curStartCol = curEndCol - curStr.length() + 1;
        lines.add(" ".repeat(Math.max(0, curStartCol - 2)) + "= " + curStr);
      }
      started = true;

      int qDigit = current / divisor;
      int product = qDigit * divisor;
      String prodStr = String.valueOf(product);
      int prodStartCol = curEndCol - prodStr.length() + 1;
      String leftSub = " ".repeat(Math.max(0, prodStartCol - 2)) + "- " + prodStr;
      int padToQ = Math.max(1, (qCol - 1) - leftSub.length());
      lines.add(leftSub + " ".repeat(padToQ) + "(" + qDigit + ")");
      current = current - product;
    }

    String remStr = String.valueOf(current);
    int remEndCol = baseCol + digits.length() - 1;
    int remStartCol = remEndCol - remStr.length() + 1;
    lines.add(" ".repeat(Math.max(0, remStartCol - 2)) + "= " + remStr);

    return String.join("\n", lines);
  }

  private int calculateGCD(int a, int b) {
    while (b != 0) {
      int temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter14ExpressionGenerator.java': String.raw`package com.mathpartner.generator.chapters.chapter1;

import com.mathpartner.generator.model.Task;
import java.util.Random;

/**
 * Генератор буквених виразів для підрозділу 1.4 (5 клас).
 */
public class Chapter14ExpressionGenerator {
  private final Random random = new Random();

  public Task generateExpressionTask(String taskId) {
    int type = random.nextInt(3);
    String var = "x";

    int a = 2 + random.nextInt(15);
    int b = 2 + random.nextInt(15);
    int valX = 3 + random.nextInt(8);

    String condition;
    int finalCoeff;
    int finalResult;

    switch (type) {
      case 0:
        condition =
            String.format(
                "Спростіть вираз %d * %s + %d * %s та обчисліть його значення, якщо %s = %d.",
                a, var, b, var, var, valX);
        finalCoeff = a + b;
        finalResult = finalCoeff * valX;

        Task task0 = new Task(taskId, "TASK-Z", condition, String.valueOf(finalResult));
        task0.addTextStep("Винесемо спільний множник за дужки та додамо коефіцієнти:");
        task0.addFormulaStep(String.format("(%d + %d) * %s = %d * %s", a, b, var, finalCoeff, var));
        task0.addTextStep("Підставимо значення змінної у спрощений вираз:");
        task0.addFormulaStep(String.format("%d * %d = %d", finalCoeff, valX, finalResult));
        return task0;

      case 1:
        condition =
            String.format(
                "Спростіть вираз %d * (%d * %s) та обчисліть його значення, якщо %s = %d.",
                a, b, var, var, valX);
        finalCoeff = a * b;
        finalResult = finalCoeff * valX;

        Task task1 = new Task(taskId, "TASK-Z", condition, String.valueOf(finalResult));
        task1.addTextStep("Використовуючи сполучну властивість множення, перемножимо числа:");
        task1.addFormulaStep(String.format("(%d * %d) * %s = %d * %s", a, b, var, finalCoeff, var));
        task1.addTextStep("Підставимо значення змінної у спрощений вираз:");
        task1.addFormulaStep(String.format("%d * %d = %d", finalCoeff, valX, finalResult));
        return task1;

      default:
        if (a <= b) {
          a += b;
        }
        condition =
            String.format(
                "Спростіть вираз %d * %s - %d * %s та обчисліть його значення, якщо %s = %d.",
                a, var, b, var, var, valX);
        finalCoeff = a - b;
        finalResult = finalCoeff * valX;

        Task task2 = new Task(taskId, "TASK-Z", condition, String.valueOf(finalResult));
        task2.addTextStep("Винесемо спільний множник за дужки та виконаємо віднімання:");
        task2.addFormulaStep(String.format("(%d - %d) * %s = %d * %s", a, b, var, finalCoeff, var));
        task2.addTextStep("Підставимо значення змінної у спрощений вираз:");
        task2.addFormulaStep(String.format("%d * %d = %d", finalCoeff, valX, finalResult));
        return task2;
    }
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter16MotionGenerator.java': String.raw`package com.mathpartner.generator.chapters.chapter1;

import com.mathpartner.generator.model.Task;
import java.util.Random;

/**
 * Генератор текстових задач на рух (Глава 1, підрозділ 1.6) українською мовою.
 */
public class Chapter16MotionGenerator {

  private final Random random = new Random();

  public static class MotionTask {
    public String taskType;
    public String textUa;
    public String solution;
    public String answer;

    public Task toTask(String taskId) {
      Task task = new Task(taskId, taskType, textUa, answer);
      for (String line : solution.split("\\n")) {
        String trimmed = line.trim();
        if (!trimmed.isEmpty()) {
          if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            task.addTextStep(trimmed.substring(1, trimmed.length() - 1));
          } else {
            task.addFormulaStep(trimmed);
          }
        }
      }
      return task;
    }
  }

  public Task generateTask(String taskId) {
    int type = random.nextInt(2);
    MotionTask m = (type == 0) ? generateTowardsEachOtherTask() : generateRiverFlowTask();
    return m.toTask(taskId);
  }

  public MotionTask generateRandomTask(int taskNumber) {
    return (random.nextInt(2) == 0) ? generateTowardsEachOtherTask() : generateRiverFlowTask();
  }

  private MotionTask generateTowardsEachOtherTask() {
    MotionTask task = new MotionTask();
    int v1 = 60 + random.nextInt(31);
    int v2 = 70 + random.nextInt(31);
    int vSum = v1 + v2;

    int tNumerator = vSum * 2 + random.nextInt(50);
    int gcd = calculateGCD(tNumerator, vSum);
    int finalNum = tNumerator / gcd;
    int finalDen = vSum / gcd;

    task.textUa =
        String.format(
            "З двох міст назустріч один одному одночасно виїхали два автомобілі. Швидкість першого %d км/год, а другого — %d км/год. Через скільки годин вони зустрінуться, якщо відстань між містами %d км?",
            v1, v2, tNumerator);

    String reducedVal =
        finalDen == 1 ? String.valueOf(finalNum) : String.format("%d/%d", finalNum, finalDen);
    String step2Formula =
        (gcd > 1 && finalDen > 1)
            ? String.format("%d/%d = %s", tNumerator, vSum, reducedVal)
            : String.format("%d / %d = %s", tNumerator, vSum, reducedVal);

    task.solution =
        String.format(
            "\"1) Швидкість зближення:\"\n%d + %d = %d\n\"2) Час до зустрічі:\"\n%s",
            v1, v2, vSum, step2Formula);

    if (finalDen == 1) {
      task.taskType = "TASK-Z";
      task.answer = String.valueOf(finalNum);
    } else {
      task.taskType = "TASK-Q";
      task.answer = String.format("%d/%d", finalNum, finalDen);
    }
    return task;
  }

  private MotionTask generateRiverFlowTask() {
    MotionTask task = new MotionTask();
    int vOwn = 15 + random.nextInt(10);
    int vRiver = 2 + random.nextInt(3);

    int vAlong = vOwn + vRiver;
    int vAgainst = vOwn - vRiver;
    int s = vAlong * 2;

    int gcd = calculateGCD(s, vAgainst);
    int finalNum = s / gcd;
    int finalDen = vAgainst / gcd;

    task.textUa =
        String.format(
            "Власна швидкість катера %d км/год, а швидкість течії річки %d км/год. Катер пройшов за течією відстань %d км. Скільки годин витратить катер на зворотний шлях проти течії?",
            vOwn, vRiver, s);

    String reducedVal =
        finalDen == 1 ? String.valueOf(finalNum) : String.format("%d/%d", finalNum, finalDen);
    String step2Formula =
        (gcd > 1 && finalDen > 1)
            ? String.format("%d/%d = %s", s, vAgainst, reducedVal)
            : String.format("%d / %d = %s", s, vAgainst, reducedVal);

    task.solution =
        String.format(
            "\"1) Швидкість проти течії:\"\n%d - %d = %d\n\"2) Час на зворотний шлях:\"\n%s",
            vOwn, vRiver, vAgainst, step2Formula);

    if (finalDen == 1) {
      task.taskType = "TASK-Z";
      task.answer = String.valueOf(finalNum);
    } else {
      task.taskType = "TASK-Q";
      task.answer = String.format("%d/%d", finalNum, finalDen);
    }
    return task;
  }

  private int calculateGCD(int a, int b) {
    while (b != 0) {
      int temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter16WorkGenerator.java': String.raw`package com.mathpartner.generator.chapters.chapter1;

import com.mathpartner.generator.model.Task;
import java.util.Random;

/**
 * Генератор текстових задач на роботу (Глава 1, підрозділ 1.6).
 * Гарантує узгодженість параметрів умови, проміжних кроків та відповіді.
 */
public class Chapter16WorkGenerator {

  private final Random random = new Random();

  public static class WorkTask {
    public String taskType;
    public String textUa;
    public String solution;
    public String answer;

    public Task toTask(String taskId) {
      Task task = new Task(taskId, taskType, textUa, answer);
      for (String line : solution.split("\\n")) {
        String trimmed = line.trim();
        if (!trimmed.isEmpty()) {
          if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            task.addTextStep(trimmed.substring(1, trimmed.length() - 1));
          } else {
            task.addFormulaStep(trimmed);
          }
        }
      }
      return task;
    }
  }

  public Task generateTask(String taskId) {
    WorkTask w = (random.nextInt(2) == 0) ? generateTwoWorkersTask() : generatePoolPipesTask();
    return w.toTask(taskId);
  }

  public WorkTask generateRandomTask(int taskNumber) {
    return (random.nextInt(2) == 0) ? generateTwoWorkersTask() : generatePoolPipesTask();
  }

  private WorkTask generateTwoWorkersTask() {
    WorkTask task = new WorkTask();
    task.taskType = "TASK-Z";

    int[][] presets = {
      {10, 15, 6},
      {8, 8, 4},
      {12, 24, 8},
      {6, 12, 4}
    };
    int[] chosen = presets[random.nextInt(presets.length)];
    int days1 = chosen[0];
    int days2 = chosen[1];
    int hours = chosen[2];

    task.textUa =
        String.format(
            "Один робітник може виконати замовлення за %d днів, а другий — за %d днів. За скільки днів вони виконають це замовлення, працюючи разом?",
            days1, days2);

    task.solution =
        String.format(
            "\"1) Приймемо всю роботу за 1. Спільна продуктивність:\"\n1/%d + 1/%d = 1/%d\n\"2) Час спільної роботи:\"\n1 / (1/%d) = %d",
            days1, days2, hours, hours, hours);
    task.answer = String.valueOf(hours);
    return task;
  }

  private WorkTask generatePoolPipesTask() {
    WorkTask task = new WorkTask();
    task.taskType = "TASK-Q";

    // Гарантуємо 2*(1/t1 + 1/t2) < 1 ще ДО форматування тексту задачі
    int t1 = 5 + random.nextInt(4); // 5..8 годин
    int t2 = 7 + random.nextInt(5); // 7..11 годин

    int lcm = calculateLCM(t1, t2);
    int jointRateNum = (lcm / t1) + (lcm / t2);
    int workDoneNum = jointRateNum * 2;
    int remainingNum = lcm - workDoneNum;

    if (remainingNum <= 0) {
      t1 = 6;
      t2 = 8;
      lcm = 24;
      workDoneNum = 14;
      remainingNum = 10;
    }

    int gcd = calculateGCD(remainingNum, lcm);
    int finalNum = remainingNum / gcd;
    int finalDen = lcm / gcd;

    task.textUa =
        String.format(
            "Перша труба може наповнити басейн за %d годин, а друга — за %d годин. Яка частина басейну залишиться порожньою після 2 годин одночасної роботи обох труб?",
            t1, t2);

    String remStepFormula =
        (gcd > 1 && finalDen > 1)
            ? String.format("1 - %d/%d = %d/%d\n%d/%d=%d/%d", workDoneNum, lcm, remainingNum, lcm, remainingNum, lcm, finalNum, finalDen)
            : String.format("1 - %d/%d = %d/%d", workDoneNum, lcm, finalNum, finalDen);

    task.solution =
        String.format(
            "\"1) Продуктивність першої труби 1/%d, другої 1/%d. За 2 години разом:\"\n2 * (1/%d + 1/%d) = %d/%d\n\"2) Залишкова порожня частина:\"\n%s",
            t1, t2, t1, t2, workDoneNum, lcm, remStepFormula);

    if (finalDen == 1) {
      task.taskType = "TASK-Z";
      task.answer = String.valueOf(finalNum);
    } else {
      task.answer = String.format("%d/%d", finalNum, finalDen);
    }
    return task;
  }

  private int calculateGCD(int a, int b) {
    while (b != 0) {
      int temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  private int calculateLCM(int a, int b) {
    return (a * b) / calculateGCD(a, b);
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter1/Chapter1Generator.java': String.raw`package com.mathpartner.generator.chapters.chapter1;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.ColumnDivisionGenerator;
import com.mathpartner.generator.engine.ColumnMultiplicationGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import com.mathpartner.generator.model.Task;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Головний генератор Глави 1 (тижні 1–7, 56 завдань по 10 задач).
 */
public class Chapter1Generator implements AssignmentGenerator {

  private final ColumnDivisionGenerator divisionGen = new ColumnDivisionGenerator();
  private final ColumnMultiplicationGenerator multiplicationGen = new ColumnMultiplicationGenerator();
  private final Chapter14ExpressionGenerator expressionGen = new Chapter14ExpressionGenerator();
  private final Chapter16MotionGenerator motionGen = new Chapter16MotionGenerator();
  private final Chapter16WorkGenerator workGen = new Chapter16WorkGenerator();
  private final MathparRenderer renderer = new MathparRenderer();
  private final Random random = new Random(42);

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    String header =
        String.format(
            "PAGE UA-SM-05-Week%02d-Task%02d НАТУРАЛЬНІ ЧИСЛА ТА ДІЇ З НИМИ",
            weekNumber, assignmentNumber);
    Assignment assignment = new Assignment(header);

    for (int j = 1; j <= 10; j++) {
      String taskId = String.format("%02d", j);
      int sectionType = random.nextInt(5);

      switch (sectionType) {
        case 0:
          int d1 = 2 + random.nextInt(2);
          int d2 = 2 + random.nextInt(2);
          ColumnMultiplicationGenerator.MultiplicationTask mTask =
              multiplicationGen.generateTask(d1, d2);
          assignment.addTask(mTask.toTask(taskId));
          break;

        case 1:
          int dividend = 100 + random.nextInt(900);
          int divisor = 5 + random.nextInt(20);
          // 0 — точне ділення, 2 — пошук цілої частини (окрема задача), 3 — пошук дробової частини (окрема задача)
          int[] divModes = {0, 2, 3};
          int formType = divModes[random.nextInt(divModes.length)];
          ColumnDivisionGenerator.DivisionTask dTask =
              divisionGen.generateTask(dividend, divisor, formType);
          assignment.addTask(dTask.toTask(taskId));
          break;

        case 2:
          assignment.addTask(expressionGen.generateExpressionTask(taskId));
          break;

        case 3:
          assignment.addTask(motionGen.generateTask(taskId));
          break;

        default:
          assignment.addTask(workGen.generateTask(taskId));
          break;
      }
    }
    return assignment;
  }

  /**
   * Генерує всі 56 завдань Глави 1 (7 тижнів по 8 завдань).
   */
  public List<Assignment> generateAllChapterAssignments() {
    List<Assignment> list = new ArrayList<>();
    for (int i = 1; i <= 56; i++) {
      int week = ((i - 1) / 8) + 1;
      int taskNum = ((i - 1) % 8) + 1;
      list.add(generate(week, taskNum));
    }
    return list;
  }

  /**
   * Генерує та зберігає всі 56 файлів Глави 1 у цільову директорію.
   */
  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    List<Assignment> assignments = generateAllChapterAssignments();
    for (int i = 0; i < assignments.size(); i++) {
      Assignment assignment = assignments.get(i);
      String fileName = String.format("UA-SM-05-Week%02d-Task%02d.txt", (i / 8) + 1, (i % 8) + 1);
      File file = new File(dir, fileName);
      try (FileWriter writer = new FileWriter(file)) {
        writer.write(renderer.renderAssignment(assignment));
      } catch (IOException e) {
        System.err.println("Помилка запису файлу " + fileName + ": " + e.getMessage());
      }
    }
  }

  public static void main(String[] args) {
    Chapter1Generator manager = new Chapter1Generator();
    manager.generateAndSaveAll("./math_assignments");
  }
}
`,

  'src/main/java/com/mathpartner/generator/MainLauncher2.java': String.raw`package com.mathpartner.generator;

import com.mathpartner.generator.chapters.chapter1.Chapter1Generator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

/**
 * Запуск повної генерації Глави 1 в єдиний файл Mathpar.
 */
public class MainLauncher2 {
  public static void main(String[] args) {
    Chapter1Generator ch1Generator = new Chapter1Generator();
    MathparRenderer renderer = new MathparRenderer();

    List<Assignment> chapter1Assignments = ch1Generator.generateAllChapterAssignments();

    try (FileWriter writer = new FileWriter("Chapter1_Course.txt")) {
      for (Assignment assignment : chapter1Assignments) {
        writer.write(renderer.renderAssignment(assignment));
        writer.write("\n");
      }
      System.out.println("Успішно згенеровано 56 завдань для Глави 1 у файл Chapter1_Course.txt!");
    } catch (IOException e) {
      System.err.println("Помилка запису файлу: " + e.getMessage());
    }
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter3/DivisibilityRulesGen.java': String.raw`package com.mathpartner.generator.chapters.chapter3;

import com.mathpartner.generator.model.Task;
import java.util.Random;

/**
 * Генератор розділу 3.2: Ознаки подільності на 2, 3, 5, 9, 10.
 */
public class DivisibilityRulesGen {
  private final Random random = new Random();

  public Task generateTask(String taskId) {
    int type = random.nextInt(3);

    switch (type) {
      case 0:
        int base = 100 + random.nextInt(800);
        int lastDigit = random.nextInt(10);
        int num5 = base * 10 + lastDigit;
        boolean divBy5 = (lastDigit == 0 || lastDigit == 5);

        Task task0 =
            new Task(
                taskId,
                "TASK-Z",
                "Чи ділиться число "
                    + num5
                    + " на 5? Якщо ділиться, запишіть у відповідь 1, якщо ні — 0.",
                divBy5 ? "1" : "0");
        task0.addTextStep("На 5 діляться всі натуральні числа, які закінчуються цифрою 0 або 5.");
        task0.addTextStep(
            "Остання цифра числа " + num5 + " — це " + lastDigit + (divBy5 ? ", тому ділиться." : ", тому не ділиться."));
        return task0;

      case 1:
        int d1 = 1 + random.nextInt(8);
        int d2 = random.nextInt(9);
        int d3 = (3 - ((d1 + d2) % 3)) % 3;
        int num3 = d1 * 100 + d2 * 10 + d3;
        int digitSum = d1 + d2 + d3;

        Task task1 =
            new Task(
                taskId,
                "TASK-Z",
                "Обчисліть суму цифр числа " + num3 + ", щоб перевірити його подільність на 3.",
                String.valueOf(digitSum));
        task1.addTextStep("Знайдемо суму цифр числа:");
        task1.addFormulaStep(d1 + " + " + d2 + " + " + d3 + " = " + digitSum);
        return task1;

      default:
        int prefix = 12 + random.nextInt(75);
        Task task2 =
            new Task(
                taskId,
                "TASK-Z",
                "Яку найменшу цифру потрібно поставити замість * у записі числа "
                    + prefix
                    + "*, щоб воно ділилося на 2?",
                "0");
        task2.addTextStep("Щоб число ділилося на 2, воно має закінчуватися парною цифрою (0, 2, 4, 6, 8).");
        task2.addTextStep("Найменша з цих цифр — 0.");
        return task2;
    }
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter4/FractionArithmeticGen.java': String.raw`package com.mathpartner.generator.chapters.chapter4;

import com.mathpartner.generator.model.Task;
import java.util.Random;

/**
 * Генератор розділу 4.3: Додавання та віднімання звичайних дробів зі скороченням.
 */
public class FractionArithmeticGen {
  private final Random random = new Random();

  public Task generateTask(String taskId) {
    int type = random.nextInt(2);
    int denom = 6 + random.nextInt(10); // 6..15

    if (type == 0) {
      int n1 = 1 + random.nextInt((denom - 2) / 2);
      int n2 = 1 + random.nextInt(denom - n1 - 1);
      int sumNum = n1 + n2;
      int gcd = calculateGCD(sumNum, denom);
      int finalNum = sumNum / gcd;
      int finalDen = denom / gcd;

      String condition =
          String.format("Обчисліть та скоротіть результат: %d/%d + %d/%d = ?", n1, denom, n2, denom);
      String answer = (finalDen == 1) ? String.valueOf(finalNum) : finalNum + "/" + finalDen;

      Task task = new Task(taskId, finalDen == 1 ? "TASK-Z" : "TASK-Q", condition, answer);
      task.addTextStep("Додаємо чисельники, знаменник залишаємо без змін, і скорочуємо на НСД:");
      if (gcd > 1 && finalDen > 1) {
        task.addFormulaStep(String.format("(%d + %d) / %d = %d/%d", n1, n2, denom, sumNum, denom));
        task.addFormulaStep(String.format("%d/%d=%s", sumNum, denom, answer));
      } else {
        task.addFormulaStep(String.format("(%d + %d) / %d = %s", n1, n2, denom, answer));
      }
      return task;
    } else {
      int w1 = 5 + random.nextInt(4);
      int w2 = 1 + random.nextInt(3);
      int n1 = 3 + random.nextInt(3);
      int n2 = 1 + random.nextInt(2);
      int diffNum = n1 - n2;
      int gcd = calculateGCD(diffNum, denom);
      int finalNum = diffNum / gcd;
      int finalDen = denom / gcd;

      String condition =
          String.format(
              "Обчисліть різницю мішаних чисел: [%d, %d/%d] - [%d, %d/%d] = ?",
              w1, n1, denom, w2, n2, denom);
      String answer = String.format("[%d, %d/%d]", w1 - w2, finalNum, finalDen);

      Task task = new Task(taskId, "TASK-Q", condition, answer);
      task.addTextStep("Виконаємо окремо віднімання цілих та дробових частин:");
      task.addFormulaStep(String.format("%d - %d = %d", w1, w2, w1 - w2));
      task.addFormulaStep(String.format("%d/%d - %d/%d = %d/%d", n1, denom, n2, denom, finalNum, finalDen));
      return task;
    }
  }

  private int calculateGCD(int a, int b) {
    while (b != 0) {
      int temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter5/DecimalArithmeticGen.java': String.raw`package com.mathpartner.generator.chapters.chapter5;

import com.mathpartner.generator.model.Task;
import java.math.BigDecimal;
import java.util.Random;

/**
 * Генератор арифметики десяткових дробів із використанням BigDecimal.
 */
public class DecimalArithmeticGen {
  private final Random random = new Random();

  public Task generateTask(String taskId) {
    int type = random.nextInt(2);

    if (type == 0) {
      BigDecimal a = BigDecimal.valueOf(15 + random.nextInt(60), 1);
      BigDecimal b = BigDecimal.valueOf(21 + random.nextInt(50), 1);
      BigDecimal res = a.add(b);

      String condition =
          String.format("Обчисліть значення виразу: %s + %s = ?", a.toPlainString(), b.toPlainString());
      String answer = res.toPlainString();

      Task task = new Task(taskId, "TASK-D1", condition, answer);
      task.addTextStep("Виконаємо додавання десяткових дробів, підписуючи розряд під розрядом:");
      task.addFormulaStep(String.format("%s + %s = %s", a.toPlainString(), b.toPlainString(), answer));
      return task;
    } else {
      BigDecimal a = BigDecimal.valueOf(12 + random.nextInt(15), 2);
      BigDecimal b = BigDecimal.valueOf(3 + random.nextInt(5), 1);
      BigDecimal res = a.multiply(b);

      String condition =
          String.format("Обчисліть добуток десяткових дробів: %s * %s = ?", a.toPlainString(), b.toPlainString());
      String answer = res.toPlainString();

      Task task = new Task(taskId, "TASK-D3", condition, answer);
      task.addTextStep("Перемножимо числа і відокремимо справа сумарну кількість знаків після коми:");
      task.addFormulaStep(String.format("%s * %s = %s", a.toPlainString(), b.toPlainString(), answer));
      return task;
    }
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter5/DecimalAverageGen.java': String.raw`package com.mathpartner.generator.chapters.chapter5;

import com.mathpartner.generator.model.Task;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;

/**
 * Генератор задач на середнє арифметичне та середню швидкість руху.
 */
public class DecimalAverageGen {
  private final Random random = new Random();

  public Task generateTask(String taskId) {
    int type = random.nextInt(2);

    if (type == 0) {
      // Гарантуємо, що сума ділиться на 3 без періодичного хвоста
      int k1 = 50 + random.nextInt(40);
      int k2 = 60 + random.nextInt(40);
      int rem = (k1 + k2) % 3;
      int k3 = 70 + random.nextInt(40);
      k3 += (3 - ((rem + k3) % 3)) % 3;

      BigDecimal n1 = BigDecimal.valueOf(k1, 1);
      BigDecimal n2 = BigDecimal.valueOf(k2, 1);
      BigDecimal n3 = BigDecimal.valueOf(k3, 1);
      BigDecimal sum = n1.add(n2).add(n3);
      BigDecimal avg = sum.divide(BigDecimal.valueOf(3), 1, RoundingMode.UNNECESSARY);

      String answer = avg.toPlainString();
      String condition =
          String.format(
              "Знайдіть середнє арифметичне трьох чисел: %s, %s та %s.",
              n1.toPlainString(), n2.toPlainString(), n3.toPlainString());

      Task task = new Task(taskId, "TASK-D1", condition, answer);
      task.addTextStep("Знайдемо суму заданих чисел:");
      task.addFormulaStep(
          String.format("%s + %s + %s = %s", n1.toPlainString(), n2.toPlainString(), n3.toPlainString(), sum.toPlainString()));
      task.addTextStep("Поділимо отриману суму на 3:");
      task.addFormulaStep(String.format("%s / 3 = %s", sum.toPlainString(), answer));
      return task;
    } else {
      int t1 = 2;
      int t2 = 3;
      int totalTime = t1 + t2;

      int v1 = 60 + random.nextInt(5) * 4;
      int v2 = 70 + random.nextInt(5) * 4;

      int s1 = v1 * t1;
      int s2 = v2 * t2;
      int totalDistance = s1 + s2;

      BigDecimal avgSpeed =
          BigDecimal.valueOf(totalDistance).divide(BigDecimal.valueOf(totalTime), 1, RoundingMode.HALF_UP);
      boolean exactInt = avgSpeed.stripTrailingZeros().scale() <= 0;
      String answer = exactInt ? avgSpeed.toBigInteger().toString() : avgSpeed.toPlainString();
      String taskType = exactInt ? "TASK-D0" : "TASK-D1";

      String condition =
          String.format(
              "Автомобіль рухався %d год зі швидкістю %d км/год і %d год зі швидкістю %d км/год. Знайдіть середню швидкість руху автомобіля.",
              t1, v1, t2, v2);

      Task task = new Task(taskId, taskType, condition, answer);
      task.addTextStep("Обчислимо весь пройдений шлях та весь час:");
      task.addFormulaStep(String.format("%d * %d + %d * %d = %d", v1, t1, v2, t2, totalDistance));
      task.addTextStep("Поділимо весь шлях на загальний час:");
      task.addFormulaStep(String.format("%d / %d = %s", totalDistance, totalTime, answer));
      return task;
    }
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter3/Chapter3Generator.java': String.raw`package com.mathpartner.generator.chapters.chapter3;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний менеджер-генератор Глави 3 (Подільність натуральних чисел).
 */
public class Chapter3Generator implements AssignmentGenerator {

  private final DivisorsAndMultiplesGen section31 = new DivisorsAndMultiplesGen();
  private final DivisibilityRulesGen section32 = new DivisibilityRulesGen();
  private final PrimeAndCompositeGen section33 = new PrimeAndCompositeGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 104) {
      return generateSection31(absIndex);
    } else if (absIndex <= 120) {
      return generateSection32(absIndex);
    } else {
      return generateSection33(absIndex);
    }
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 97;
    for (int i = 1; i <= 8; i++) {
      saveToFile(outputDirectory, generateSection31(absoluteIndex++));
    }
    for (int i = 1; i <= 16; i++) {
      saveToFile(outputDirectory, generateSection32(absoluteIndex++));
    }
    for (int i = 1; i <= 8; i++) {
      saveToFile(outputDirectory, generateSection33(absoluteIndex++));
    }
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateSection31(int absIndex) {
    Assignment a = createHolder(absIndex, "Дільники і кратні");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section31.generateTask(String.format("%02d", t)));
    }
    return a;
  }

  private Assignment generateSection32(int absIndex) {
    Assignment a = createHolder(absIndex, "Ознаки подільності");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section32.generateTask(String.format("%02d", t)));
    }
    return a;
  }

  private Assignment generateSection33(int absIndex) {
    Assignment a = createHolder(absIndex, "Прості та складені числа");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section33.generateTask(String.format("%02d", t)));
    }
    return a;
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter4/Chapter4Generator.java': String.raw`package com.mathpartner.generator.chapters.chapter4;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний диспетчер Глави 4 (Звичайні дроби).
 */
public class Chapter4Generator implements AssignmentGenerator {

  private final FractionConceptGen section41 = new FractionConceptGen();
  private final FractionTypesAndMixedGen section42 = new FractionTypesAndMixedGen();
  private final FractionArithmeticGen section43 = new FractionArithmeticGen();
  private final FractionTextProblemsGen section44 = new FractionTextProblemsGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 136) return generateSection41(absIndex);
    if (absIndex <= 152) return generateSection42(absIndex);
    if (absIndex <= 168) return generateSection43(absIndex);
    return generateSection44(absIndex);
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 129;
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateSection41(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection42(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection43(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection44(absoluteIndex++));
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу дробів: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateSection41(int absIndex) {
    Assignment a = createHolder(absIndex, "Поняття дробу та координатний промінь");
    for (int t = 1; t <= 10; t++) a.addTask(section41.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection42(int absIndex) {
    Assignment a = createHolder(absIndex, "Види дробів та мішані числа");
    for (int t = 1; t <= 10; t++) a.addTask(section42.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection43(int absIndex) {
    Assignment a = createHolder(absIndex, "Додавання та віднімання звичайних дробів");
    for (int t = 1; t <= 10; t++) a.addTask(section43.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection44(int absIndex) {
    Assignment a = createHolder(absIndex, "Текстові задачі на звичайні дроби");
    for (int t = 1; t <= 10; t++) a.addTask(section44.generateTask(String.format("%02d", t)));
    return a;
  }
}
`,

  'src/main/java/com/mathpartner/generator/chapters/chapter5/Chapter5Generator.java': String.raw`package com.mathpartner.generator.chapters.chapter5;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний диспетчер Глави 5 (Десяткові дроби та відсотки).
 */
public class Chapter5Generator implements AssignmentGenerator {

  private final DecimalArithmeticGen arithmeticGen = new DecimalArithmeticGen();
  private final DecimalRoundingGen roundingGen = new DecimalRoundingGen();
  private final DecimalAverageGen averageGen = new DecimalAverageGen();
  private final PercentageGen percentageGen = new PercentageGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 216) return generateArithmeticSection(absIndex);
    if (absIndex <= 224) return generateRoundingSection(absIndex);
    if (absIndex <= 232) return generateAverageSection(absIndex);
    return generatePercentageSection(absIndex);
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 185;
    for (int i = 1; i <= 32; i++) saveToFile(outputDirectory, generateArithmeticSection(absoluteIndex++));
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateRoundingSection(absoluteIndex++));
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateAverageSection(absoluteIndex++));
    for (int i = 1; i <= 24; i++) saveToFile(outputDirectory, generatePercentageSection(absoluteIndex++));
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу десяткових дробів: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateArithmeticSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Арифметика десяткових дробів");
    for (int t = 1; t <= 10; t++) a.addTask(arithmeticGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateRoundingSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Округлення десяткових дробів");
    for (int t = 1; t <= 10; t++) a.addTask(roundingGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateAverageSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Середнє арифметичне та середня швидкість");
    for (int t = 1; t <= 10; t++) a.addTask(averageGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generatePercentageSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Відсотки та їх застосування");
    for (int t = 1; t <= 10; t++) a.addTask(percentageGen.generateTask(String.format("%02d", t)));
    return a;
  }
}
`,
};

export function applyPatchForFile(relPath: string): boolean {
  const patched = PATCHED_FILES[relPath];
  if (!patched) return false;
  writeWorkingFile(relPath, patched);
  return true;
}

export function applyAllPatches(): { patchedCount: number; removedCount: number } {
  let patchedCount = 0;
  for (const [relPath, content] of Object.entries(PATCHED_FILES)) {
    writeWorkingFile(relPath, content);
    patchedCount++;
  }
  let removedCount = 0;
  if (deleteWorkingFile('src/main/java/com/mathpartner/generator/chapters/chapter1/111.txt')) {
    removedCount++;
  }
  if (deleteWorkingFile('src/main/java/com/mathpartner/generator/chapters/chapter4/11111.txt')) {
    removedCount++;
  }
  return { patchedCount, removedCount };
}
