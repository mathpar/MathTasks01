package com.mathpartner.generator.chapters.chapter1;

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
