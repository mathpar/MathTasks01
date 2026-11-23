package com.mathpartner.generator.chapters.chapter5;

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
