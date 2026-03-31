import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

