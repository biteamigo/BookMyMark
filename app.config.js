const appJson = require("./app.json");

// Require plugin explicitly so EAS Build can resolve it from node_modules
const withSqlite = require("expo-sqlite/app.plugin.js");

module.exports = () => {
  const config = { ...appJson.expo };
  config.plugins = config.plugins || [];
  // Remove string "expo-sqlite" if present (we add the resolved plugin below)
  config.plugins = config.plugins.filter((p) => p !== "expo-sqlite");
  config.plugins.push(withSqlite());
  return { expo: config };
};
