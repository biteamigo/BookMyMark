/**
 * Seed data for initial app setup
 * Creates 3 default folders: YouTube, Music, Recipes
 */

/**
 * Generate a unique ID
 * @returns {string}
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Get current timestamp in milliseconds
 * @returns {number}
 */
export const now = () => Date.now();

/**
 * Initial folders to seed on first launch
 */
export const INITIAL_FOLDERS = [
  {
    id: "folder_youtube",
    name: "YouTube",
    parentId: null,
    icon: null,
  },
  {
    id: "folder_music",
    name: "Music",
    parentId: null,
    icon: null,
  },
  {
    id: "folder_recipes",
    name: "Recipes",
    parentId: null,
    icon: null,
  },
];

/**
 * Seed the database with initial folders
 * Only runs if the folders table is empty
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export const seedDatabase = (db) => {
  // Check if folders table is empty
  const result = db.getFirstSync("SELECT COUNT(*) as count FROM folders");
  
  if (result.count === 0) {
    const timestamp = now();
    
    INITIAL_FOLDERS.forEach((folder) => {
      db.runSync(
        `INSERT INTO folders (id, name, parentId, icon, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [folder.id, folder.name, folder.parentId, folder.icon, timestamp, timestamp]
      );
    });
    
    console.log(`Seeded database with ${INITIAL_FOLDERS.length} initial folders`);
    return true;
  }
  
  return false;
};
