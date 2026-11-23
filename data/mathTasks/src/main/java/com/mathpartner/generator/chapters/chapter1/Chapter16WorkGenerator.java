package com.mathpartner.generator.chapters.chapter1;

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
