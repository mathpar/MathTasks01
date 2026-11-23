package com.mathpartner.generator.engine;

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
