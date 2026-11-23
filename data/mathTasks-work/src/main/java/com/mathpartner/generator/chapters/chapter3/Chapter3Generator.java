package com.mathpartner.generator.chapters.chapter3;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний менеджер-генератор Глави 3 (Подільність натуральних чисел).
 */
public class Chapter3Generator implements AssignmentGenerator {

  private final DivisorsAndMultiplesGen section31 = new DivisorsAndMultiplesGen();
  private final DivisibilityRulesGen section32 = new DivisibilityRulesGen();
  private final PrimeAndCompositeGen section33 = new PrimeAndCompositeGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 104) {
      return generateSection31(absIndex);
    } else if (absIndex <= 120) {
      return generateSection32(absIndex);
    } else {
      return generateSection33(absIndex);
    }
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 97;
    for (int i = 1; i <= 8; i++) {
      saveToFile(outputDirectory, generateSection31(absoluteIndex++));
    }
    for (int i = 1; i <= 16; i++) {
      saveToFile(outputDirectory, generateSection32(absoluteIndex++));
    }
    for (int i = 1; i <= 8; i++) {
      saveToFile(outputDirectory, generateSection33(absoluteIndex++));
    }
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateSection31(int absIndex) {
    Assignment a = createHolder(absIndex, "Дільники і кратні");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section31.generateTask(String.format("%02d", t)));
    }
    return a;
  }

  private Assignment generateSection32(int absIndex) {
    Assignment a = createHolder(absIndex, "Ознаки подільності");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section32.generateTask(String.format("%02d", t)));
    }
    return a;
  }

  private Assignment generateSection33(int absIndex) {
    Assignment a = createHolder(absIndex, "Прості та складені числа");
    for (int t = 1; t <= 10; t++) {
      a.addTask(section33.generateTask(String.format("%02d", t)));
    }
    return a;
  }
}
