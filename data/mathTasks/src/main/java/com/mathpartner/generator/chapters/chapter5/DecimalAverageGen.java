package com.mathpartner.generator.chapters.chapter5;

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
