package com.mathpartner.generator.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Модель окремої математичної задачі у форматі платформи Mathpartner.
 */
public class Task {
  private final String taskId;
  private final String taskType; // "TASK-Z", "TASK-Q", "TASK-D0", "TASK-D1", "TASK-D2", "TASK-D4"
  private final String conditionText;
  private String conditionMath;
  private final List<SolutionStep> solutionSteps = new ArrayList<>();
  private final String finalAnswer;

  public Task(String taskId, String taskType, String conditionText, String finalAnswer) {
    this.taskId = taskId;
    this.taskType = taskType;
    this.conditionText = conditionText;
    this.finalAnswer = finalAnswer;
  }

  public void addTextStep(String text) {
    solutionSteps.add(new SolutionStep(text, true));
  }

  /**
   * Додає обчислювальний крок мовою Mathpar (виводиться без подвійних лапок).
   */
  public void addFormulaStep(String formula) {
    solutionSteps.add(new SolutionStep(formula, false));
  }

  public String getTaskId() {
    return taskId;
  }

  public String getTaskType() {
    return taskType;
  }

  public String getConditionText() {
    return conditionText;
  }

  public String getConditionMath() {
    return conditionMath;
  }

  public void setConditionMath(String conditionMath) {
    this.conditionMath = conditionMath;
  }

  public List<SolutionStep> getSolutionSteps() {
    return solutionSteps;
  }

  public String getFinalAnswer() {
    return finalAnswer;
  }

  @Override
  public String toString() {
    return String.format("%s \"%s. %s\" -> %s", taskType, taskId, conditionText, finalAnswer);
  }
}
