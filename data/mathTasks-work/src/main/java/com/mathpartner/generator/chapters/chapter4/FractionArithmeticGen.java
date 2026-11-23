package com.mathpartner.generator.chapters.chapter4;

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
