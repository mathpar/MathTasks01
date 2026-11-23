package com.mathpartner.generator;

import com.mathpartner.generator.chapters.chapter1.Chapter1Generator;
import com.mathpartner.generator.chapters.chapter3.Chapter3Generator;
import com.mathpartner.generator.chapters.chapter4.Chapter4Generator;
import com.mathpartner.generator.chapters.chapter5.Chapter5Generator;

/**
 * Головний клас для пакетної генерації всіх завдань курсу (Глави 1, 3, 4, 5).
 */
public class MainLauncher {

  public static void main(String[] args) {
    String baseOutputDir = "./math_assignments";

    System.out.println("Початок генерації завдань курсу...");

    // Глава 1: Натуральні числа та дії з ними
    System.out.println("Генерація Глави 1...");
    Chapter1Generator chapter1 = new Chapter1Generator();
    chapter1.generateAndSaveAll(baseOutputDir + "/chapter1");

    // Глава 3: Подільність натуральних чисел
    System.out.println("Генерація Глави 3...");
    Chapter3Generator chapter3 = new Chapter3Generator();
    chapter3.generateAndSaveAll(baseOutputDir + "/chapter3");

    // Глава 4: Звичайні дроби і дії з ними
    System.out.println("Генерація Глави 4...");
    Chapter4Generator chapter4 = new Chapter4Generator();
    chapter4.generateAndSaveAll(baseOutputDir + "/chapter4");

    // Глава 5: Десяткові дроби і дії з ними
    System.out.println("Генерація Глави 5...");
    Chapter5Generator chapter5 = new Chapter5Generator();
    chapter5.generateAndSaveAll(baseOutputDir + "/chapter5");

    System.out.println("Генерацію успішно завершено! Усі файли збережено в: " + baseOutputDir);
  }
}
 

