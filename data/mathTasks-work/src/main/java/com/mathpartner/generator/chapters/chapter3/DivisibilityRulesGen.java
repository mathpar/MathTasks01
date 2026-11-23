package com.mathpartner.generator.chapters.chapter3;

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
