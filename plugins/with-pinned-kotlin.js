const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Pin the Android build to the Kotlin version the toolchain actually uses.
 *
 * Expo's Android template generates this into `android/build.gradle`:
 *
 *     kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.25'
 *
 * …but nothing on the classpath is pinned to 1.9.25. React Native 0.76's Gradle
 * plugin contributes a dependency constraint that resolves
 * `org.jetbrains.kotlin:kotlin-gradle-plugin` to 1.9.24, so the Kotlin compiler
 * that runs is 1.9.24 while `ext.kotlinVersion` claims 1.9.25.
 *
 * That discrepancy only bites a release build, because expo-modules-core picks
 * its Compose compiler from `kotlinVersion()`:
 *
 *     def versionsMap = ["1.9.24": "1.5.14", "1.9.25": "1.5.15"]
 *     kotlinCompilerExtensionVersion = versionsMap[kotlinVersion()]
 *
 * Claiming 1.9.25 selects Compose compiler 1.5.15, which refuses to run on the
 * 1.9.24 compiler and fails the build:
 *
 *     e: This version (1.5.15) of the Compose Compiler requires Kotlin version
 *        1.9.25 but you appear to be using Kotlin version 1.9.24
 *
 * 1.9.24 is also what expo-modules-core itself falls back to (see
 * ExpoModulesCorePlugin.gradle), so pinning it aligns the version Expo claims
 * with the compiler that actually runs — and Compose compiler 1.5.14 with it.
 * Set `android.kotlinVersion` in gradle.properties, which the template's
 * `findProperty` reads.
 *
 * If this project ever moves to Kotlin 2.x the entry becomes unnecessary: the
 * Compose compiler ships with Kotlin itself from 2.0 on, and expo-modules-core
 * takes a different code path there.
 */

const KOTLIN_VERSION = "1.9.24";
const GRADLE_PROPERTY = "android.kotlinVersion";

module.exports = function withPinnedKotlin(config) {
  return withGradleProperties(config, (gradleConfig) => {
    const properties = gradleConfig.modResults;
    const existing = properties.find(
      (entry) => entry.type === "property" && entry.key === GRADLE_PROPERTY,
    );

    if (existing) {
      existing.value = KOTLIN_VERSION;
    } else {
      properties.push({
        type: "property",
        key: GRADLE_PROPERTY,
        value: KOTLIN_VERSION,
      });
    }

    return gradleConfig;
  });
};

module.exports.KOTLIN_VERSION = KOTLIN_VERSION;
