package com.mathpartner.generator.chapters.chapter4;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний диспетчер Глави 4 (Звичайні дроби).
 */
public class Chapter4Generator implements AssignmentGenerator {

  private final FractionConceptGen section41 = new FractionConceptGen();
  private final FractionTypesAndMixedGen section42 = new FractionTypesAndMixedGen();
  private final FractionArithmeticGen section43 = new FractionArithmeticGen();
  private final FractionTextProblemsGen section44 = new FractionTextProblemsGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 136) return generateSection41(absIndex);
    if (absIndex <= 152) return generateSection42(absIndex);
    if (absIndex <= 168) return generateSection43(absIndex);
    return generateSection44(absIndex);
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 129;
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateSection41(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection42(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection43(absoluteIndex++));
    for (int i = 1; i <= 16; i++) saveToFile(outputDirectory, generateSection44(absoluteIndex++));
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу дробів: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateSection41(int absIndex) {
    Assignment a = createHolder(absIndex, "Поняття дробу та координатний промінь");
    for (int t = 1; t <= 10; t++) a.addTask(section41.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection42(int absIndex) {
    Assignment a = createHolder(absIndex, "Види дробів та мішані числа");
    for (int t = 1; t <= 10; t++) a.addTask(section42.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection43(int absIndex) {
    Assignment a = createHolder(absIndex, "Додавання та віднімання звичайних дробів");
    for (int t = 1; t <= 10; t++) a.addTask(section43.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateSection44(int absIndex) {
    Assignment a = createHolder(absIndex, "Текстові задачі на звичайні дроби");
    for (int t = 1; t <= 10; t++) a.addTask(section44.generateTask(String.format("%02d", t)));
    return a;
  }
}
