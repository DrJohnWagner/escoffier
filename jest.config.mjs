/** @type {import('jest').Config} */
export default {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    // No transform: tests run as native ESM. Requires:
    //   NODE_OPTIONS='--experimental-vm-modules' jest
    transform: {},
}
