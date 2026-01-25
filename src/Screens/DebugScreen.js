/**
 * Debug Screen - For development testing only
 * Shows database statistics and provides reset/clear options
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useDatabase } from "../Context/DatabaseContext";
import { resetDatabase, clearAllData, getTableStats, exportToJSON } from "../database/Database";
import { seedDatabase } from "../database/seed";

const DebugScreen = ({ navigation }) => {
  const { db } = useDatabase();
  const [stats, setStats] = useState(null);
  const [lastExport, setLastExport] = useState(null);

  const refreshStats = useCallback(() => {
    const tableStats = getTableStats(db);
    setStats(tableStats);
  }, [db]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleResetDatabase = () => {
    Alert.alert(
      "Reset Database",
      "This will delete ALL data and reset to initial state with 3 default folders. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetDatabase(db);
            refreshStats();
            Alert.alert("Success", "Database has been reset");
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete ALL folders, bookmarks, and tags. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearAllData(db);
            refreshStats();
            Alert.alert("Success", "All data has been cleared");
          },
        },
      ]
    );
  };

  const handleReseed = () => {
    Alert.alert(
      "Reseed Database",
      "This will add the 3 default folders if they don't exist.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reseed",
          onPress: () => {
            const seeded = seedDatabase(db);
            refreshStats();
            if (seeded) {
              Alert.alert("Success", "Database has been seeded with default folders");
            } else {
              Alert.alert("Info", "Database already has data, no seeding needed");
            }
          },
        },
      ]
    );
  };

  const handleExportToJSON = () => {
    const data = exportToJSON(db);
    setLastExport(JSON.stringify(data, null, 2));
    console.log("Database Export:", data);
    Alert.alert("Exported", "Data has been logged to console and shown below");
  };

  if (!__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.warning}>Debug screen is only available in development mode</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠 Debug Menu</Text>
        <Text style={styles.devNote}>Development builds only</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Database Statistics</Text>
        {stats && (
          <View style={styles.statsContainer}>
            <StatRow label="Folders" value={stats.folders} />
            <StatRow label="Bookmarks" value={stats.bookmarks} />
            <StatRow label="Tags" value={stats.tags} />
            <StatRow label="Folder-Bookmark Links" value={stats.folderBookmarks} />
            <StatRow label="Bookmark-Tag Links" value={stats.bookmarkTags} />
          </View>
        )}
        <TouchableOpacity style={styles.refreshButton} onPress={refreshStats}>
          <Text style={styles.refreshButtonText}>Refresh Stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleReseed}>
          <Text style={styles.buttonText}>Reseed Default Folders</Text>
          <Text style={styles.buttonSubtext}>Add YouTube, Music, Recipes if empty</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExportToJSON}>
          <Text style={styles.buttonText}>Export to JSON</Text>
          <Text style={styles.buttonSubtext}>Log database contents to console</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={handleClearAllData}>
          <Text style={[styles.buttonText, styles.warningText]}>Clear All Data</Text>
          <Text style={styles.buttonSubtext}>Delete all data, keep schema</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleResetDatabase}>
          <Text style={[styles.buttonText, styles.dangerText]}>Reset Database</Text>
          <Text style={styles.buttonSubtext}>Drop all tables and recreate</Text>
        </TouchableOpacity>
      </View>

      {lastExport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Last Export</Text>
          <ScrollView horizontal style={styles.exportContainer}>
            <Text style={styles.exportText}>{lastExport}</Text>
          </ScrollView>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const StatRow = ({ label, value }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  devNote: {
    fontSize: 12,
    color: "#888",
    marginTop: -8,
    marginBottom: 8,
  },
  statsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  statLabel: {
    fontSize: 15,
    color: "#666",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  refreshButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  button: {
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  buttonSubtext: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  warningButton: {
    backgroundColor: "#fff3cd",
  },
  warningText: {
    color: "#856404",
  },
  dangerButton: {
    backgroundColor: "#f8d7da",
  },
  dangerText: {
    color: "#721c24",
  },
  warning: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50,
  },
  exportContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  exportText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#333",
  },
  bottomPadding: {
    height: 50,
  },
});

export default DebugScreen;
