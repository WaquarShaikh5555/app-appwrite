const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Sign release builds with both APK Signature Scheme v1 (JAR) and v2.
 *
 * Android Gradle Plugin disables v1 automatically when `minSdkVersion >= 24`
 * (this project is on 24), so a release build ends up signed **v2 only**:
 *
 *     Verified using v1 scheme (JAR signing): false
 *     Verified using v2 scheme: true
 *
 * That is valid, and modern Android accepts it — but it is brittle in one way
 * that matters for an app people sideload. The v2 signature covers the entire
 * APK byte-for-byte, so a single altered byte anywhere in the file makes the
 * whole signature fail, and Android reports "There was a problem parsing the
 * package". Lossy transfers are common in practice: some phone file managers
 * mangle archives while extracting, cloud providers hand over truncated files,
 * and chat apps recompress attachments.
 *
 * v1 signs each entry and the MANIFEST.MF instead, so it survives mangling that
 * breaks v2. With both present Android verifies with v2 and can still fall back
 * to v1 — the standard belt-and-braces choice for sideloaded builds. It costs a
 * few KB and nothing at runtime.
 *
 * Doing this here rather than re-signing the artifact with `apksigner` after
 * Gradle finishes means every build path — CI, a local build, EAS — gets the
 * same signing behaviour from one place.
 */

const MARKER = "enableV1Signing";

/** Index of the character that closes the brace opened at `open`. */
function findMatchingBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Pure text transform: given build.gradle, adds the two signing flags to the
 * first config block inside `signingConfigs` — the `debug` config that Expo's
 * template has the release build reuse.
 *
 * Exported so it can be tested directly, without running a whole prebuild.
 */
function patchSigningBlock(contents) {
  if (!contents.includes("signingConfigs")) return contents;
  if (contents.includes(MARKER)) return contents;

  const configsAt = contents.indexOf("signingConfigs");
  const outerOpen = contents.indexOf("{", configsAt);
  if (outerOpen === -1) return contents;

  const outerClose = findMatchingBrace(contents, outerOpen);
  if (outerClose === -1) return contents;

  const innerOpen = contents.indexOf("{", outerOpen + 1);
  if (innerOpen === -1 || innerOpen > outerClose) return contents;

  const innerClose = findMatchingBrace(contents, innerOpen);
  if (innerClose === -1 || innerClose > outerClose) return contents;

  const before = contents.slice(0, innerClose);
  const after = contents.slice(innerClose);

  // `before` ends with the newline and indentation that precede the closing
  // brace. Split those off, keep them, and re-append after the new lines so the
  // brace stays exactly where it was.
  const trailingMatch = /(\n[ \t]*)$/.exec(before);
  const trailing = trailingMatch ? trailingMatch[1] : "\n";
  const head = trailingMatch ? before.slice(0, before.length - trailing.length) : before;

  const lastLine = head.split("\n").pop() ?? "";
  const indent = " ".repeat(Math.max(lastLine.length - lastLine.trimStart().length, 0));

  return (
    `${head}\n` +
    `${indent}${MARKER} true\n` +
    `${indent}enableV2Signing true` +
    `${trailing}${after}`
  );
}

module.exports = function withSigningCompat(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    const original = gradleConfig.modResults.contents;
    const patched = patchSigningBlock(original);

    if (patched === original && !original.includes(MARKER)) {
      throw new Error(
        "with-signing-compat: could not find a signing config block to patch in " +
          "app/build.gradle — Expo's Android template changed shape; update the plugin.",
      );
    }

    gradleConfig.modResults.contents = patched;
    return gradleConfig;
  });
};

module.exports.patchSigningBlock = patchSigningBlock;
