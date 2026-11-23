package com.mathpartner.generator.chapters.chapter1;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.ColumnDivisionGenerator;
import com.mathpartner.generator.engine.ColumnMultiplicationGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import com.mathpartner.generator.model.Task;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Головний генератор Глави 1 (тижні 1–7, 56 завдань по 10 задач).
 */
public class Chapter1Generator implements AssignmentGenerator {

  private final ColumnDivisionGenerator divisionGen = new ColumnDivisionGenerator();
  private final ColumnMultiplicationGenerator multiplicationGen = new ColumnMultiplicationGenerator();
  private final Chapter14ExpressionGenerator expressionGen = new Chapter14ExpressionGenerator();
  private final Chapter16MotionGenerator motionGen = new Chapter16MotionGenerator();
  private final Chapter16WorkGenerator workGen = new Chapter16WorkGenerator();
  private final MathparRenderer renderer = new MathparRenderer();
  private final Random random = new Random(42);

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    String header =
        String.format(
            "PAGE UA-SM-05-Week%02d-Task%02d НАТУРАЛЬНІ ЧИСЛА ТА ДІЇ З НИМИ",
            weekNumber, assignmentNumber);
    Assignment assignment = new Assignment(header);

    for (int j = 1; j <= 10; j++) {
      String taskId = String.format("%02d", j);
      int sectionType = random.nextInt(5);

      switch (sectionType) {
        case 0:
          int d1 = 2 + random.nextInt(2);
          int d2 = 2 + random.nextInt(2);
          ColumnMultiplicationGenerator.MultiplicationTask mTask =
              multiplicationGen.generateTask(d1, d2);
          assignment.addTask(mTask.toTask(taskId));
          break;

        case 1:
          int dividend = 100 + random.nextInt(900);
          int divisor = 5 + random.nextInt(20);
          // 0 — точне ділення, 2 — пошук цілої частини (окрема задача), 3 — пошук дробової частини (окрема задача)
          int[] divModes = {0, 2, 3};
          int formType = divModes[random.nextInt(divModes.length)];
          ColumnDivisionGenerator.DivisionTask dTask =
              divisionGen.generateTask(dividend, divisor, formType);
          assignment.addTask(dTask.toTask(taskId));
          break;

        case 2:
          assignment.addTask(expressionGen.generateExpressionTask(taskId));
          break;

        case 3:
          assignment.addTask(motionGen.generateTask(taskId));
          break;

        default:
          assignment.addTask(workGen.generateTask(taskId));
          break;
      }
    }
    return assignment;
  }

  /**
   * Генерує всі 56 завдань Глави 1 (7 тижнів по 8 завдань).
   */
  public List<Assignment> generateAllChapterAssignments() {
    List<Assignment> list = new ArrayList<>();
    for (int i = 1; i <= 56; i++) {
      int week = ((i - 1) / 8) + 1;
      int taskNum = ((i - 1) % 8) + 1;
      list.add(generate(week, taskNum));
    }
    return list;
  }

  /**
   * Генерує та зберігає всі 56 файлів Глави 1 у цільову директорію.
   */
  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    List<Assignment> assignments = generateAllChapterAssignments();
    for (int i = 0; i < assignments.size(); i++) {
      Assignment assignment = assignments.get(i);
      String fileName = String.format("UA-SM-05-Week%02d-Task%02d.txt", (i / 8) + 1, (i % 8) + 1);
      File file = new File(dir, fileName);
      try (FileWriter writer = new FileWriter(file)) {
        writer.write(renderer.renderAssignment(assignment));
      } catch (IOException e) {
        System.err.println("Помилка запису файлу " + fileName + ": " + e.getMessage());
      }
    }
  }

  public static void main(String[] args) {
    Chapter1Generator manager = new Chapter1Generator();
    manager.generateAndSaveAll("./math_assignments");
  }
}
