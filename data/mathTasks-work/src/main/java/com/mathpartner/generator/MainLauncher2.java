package com.mathpartner.generator;

import com.mathpartner.generator.chapters.chapter1.Chapter1Generator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

/**
 * Запуск повної генерації Глави 1 в єдиний файл Mathpar.
 */
public class MainLauncher2 {
  public static void main(String[] args) {
    Chapter1Generator ch1Generator = new Chapter1Generator();
    MathparRenderer renderer = new MathparRenderer();

    List<Assignment> chapter1Assignments = ch1Generator.generateAllChapterAssignments();

    try (FileWriter writer = new FileWriter("Chapter1_Course.txt")) {
      for (Assignment assignment : chapter1Assignments) {
        writer.write(renderer.renderAssignment(assignment));
        writer.write("\n");
      }
      System.out.println("Успішно згенеровано 56 завдань для Глави 1 у файл Chapter1_Course.txt!");
    } catch (IOException e) {
      System.err.println("Помилка запису файлу: " + e.getMessage());
    }
  }
}
