// Bundled inline from @dreher-media/commitlint-config. See prettier.config.js
// for the rationale on why public repos bundle rather than depend.
//
// Source: https://github.com/Dreher-Media/standards/blob/main/configs/commitlint-config/index.js

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "refactor",
        "docs",
        "chore",
        "build",
        "ci",
        "test",
        "style",
        "revert",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 100],
  },
};
