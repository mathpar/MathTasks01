package com.mathpartner.generator.engine;

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
