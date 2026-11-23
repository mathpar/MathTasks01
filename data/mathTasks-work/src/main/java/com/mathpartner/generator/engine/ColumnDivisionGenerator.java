package com.mathpartner.generator.engine;

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
