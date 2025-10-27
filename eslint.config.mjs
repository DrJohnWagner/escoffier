// eslint.config.mjs

// {
//   "extends": [
//     "next/core-web-vitals",
//     "prettier"
//   ],
//   "plugins": ["prettier"],
//   "rules": {
//     "prettier/prettier": "error"
//   }
// }

// 1. Imports
import globals from "globals"
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"
import reactPlugin from "eslint-plugin-react"
import prettierConfig from "eslint-config-prettier"

// It's often cleaner to define the config array and then export it.
const eslintConfig = [
    // 2. Global Ignores
    // It's best practice to define all ignores at the top.
    {
        ignores: [
            "node_modules/",
            ".next/",
            "out/",
            "build/",
            "dist/",
            "next-env.d.ts",
        ],
    },

    // 3. Core ESLint and TypeScript configurations
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // 4. Configuration for React and Next.js files
    // This is a single configuration object that applies to all relevant files.
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            "@next/next": nextPlugin,
            react: reactPlugin,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node, // Next.js often uses both browser and node environments
            },
        },
        rules: {
            // Add rules from Next.js core web vitals
            ...nextPlugin.configs["core-web-vitals"].rules,
            // Add any other specific rules for React/Next.js here
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
        },
        settings: {
            react: {
                version: "detect", // Automatically detect the React version
            },
        },
    },

    // 5. Prettier Configuration
    // This MUST be the LAST item in the array to override any conflicting style rules.
    prettierConfig,
]

export default eslintConfig
