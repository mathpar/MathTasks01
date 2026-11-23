package com.mathpartner.generator.chapters.chapter5;

import com.mathpartner.generator.engine.AssignmentGenerator;
import com.mathpartner.generator.engine.MathparRenderer;
import com.mathpartner.generator.model.Assignment;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * Головний диспетчер Глави 5 (Десяткові дроби та відсотки).
 */
public class Chapter5Generator implements AssignmentGenerator {

  private final DecimalArithmeticGen arithmeticGen = new DecimalArithmeticGen();
  private final DecimalRoundingGen roundingGen = new DecimalRoundingGen();
  private final DecimalAverageGen averageGen = new DecimalAverageGen();
  private final PercentageGen percentageGen = new PercentageGen();
  private final MathparRenderer renderer = new MathparRenderer();

  @Override
  public Assignment generate(int weekNumber, int assignmentNumber) {
    int absIndex = (weekNumber - 1) * 8 + assignmentNumber;
    if (absIndex <= 216) return generateArithmeticSection(absIndex);
    if (absIndex <= 224) return generateRoundingSection(absIndex);
    if (absIndex <= 232) return generateAverageSection(absIndex);
    return generatePercentageSection(absIndex);
  }

  public void generateAndSaveAll(String outputDirectory) {
    File dir = new File(outputDirectory);
    if (!dir.exists()) {
      dir.mkdirs();
    }

    int absoluteIndex = 185;
    for (int i = 1; i <= 32; i++) saveToFile(outputDirectory, generateArithmeticSection(absoluteIndex++));
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateRoundingSection(absoluteIndex++));
    for (int i = 1; i <= 8; i++) saveToFile(outputDirectory, generateAverageSection(absoluteIndex++));
    for (int i = 1; i <= 24; i++) saveToFile(outputDirectory, generatePercentageSection(absoluteIndex++));
  }

  private void saveToFile(String baseDir, Assignment assignment) {
    String header = assignment.getPageHeader();
    String cleanName = header.toUpperCase().startsWith("PAGE ") ? header.substring(5) : header;
    cleanName = cleanName.trim().replaceAll("\\s+", "_");

    File targetFile = new File(baseDir, cleanName + ".txt");
    try (FileWriter writer = new FileWriter(targetFile)) {
      writer.write(renderer.renderAssignment(assignment));
    } catch (IOException e) {
      System.err.println("Помилка запису файлу десяткових дробів: " + e.getMessage());
    }
  }

  private Assignment createHolder(int absIndex, String sectionTitle) {
    int week = ((absIndex - 1) / 8) + 1;
    int taskNum = ((absIndex - 1) % 8) + 1;
    String header =
        String.format("PAGE UA-SM-05-Week%02d-Task%02d %s", week, taskNum, sectionTitle.toUpperCase());
    return new Assignment(header);
  }

  private Assignment generateArithmeticSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Арифметика десяткових дробів");
    for (int t = 1; t <= 10; t++) a.addTask(arithmeticGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateRoundingSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Округлення десяткових дробів");
    for (int t = 1; t <= 10; t++) a.addTask(roundingGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generateAverageSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Середнє арифметичне та середня швидкість");
    for (int t = 1; t <= 10; t++) a.addTask(averageGen.generateTask(String.format("%02d", t)));
    return a;
  }

  private Assignment generatePercentageSection(int absIndex) {
    Assignment a = createHolder(absIndex, "Відсотки та їх застосування");
    for (int t = 1; t <= 10; t++) a.addTask(percentageGen.generateTask(String.format("%02d", t)));
    return a;
  }
}
