package com.mathpartner.generator.chapters.chapter1;

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
