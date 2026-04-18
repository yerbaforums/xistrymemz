import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = {
  ignorePatterns: [".next", "out", "build"],
  extends: ["next/core-web-vitals"],
  rules: {
    "@next/next/no-img-element": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off"
  }
};

export default [eslintConfig];