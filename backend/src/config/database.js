/**
 * Database configuration and utilities
 * Currently using JSON files for demo, but structured for easy migration to real database
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../middleware/security');

class DatabaseManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', '..', process.env.DATA_DIR || 'data');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      logger.info(`Database directory ensured: ${this.dataDir}`);
    } catch (error) {
      logger.error('Failed to create data directory:', error);
      throw error;
    }
  }

  async readCollection(collectionName) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty collection
        return [];
      }
      logger.error(`Error reading collection ${collectionName}:`, error);
      throw error;
    }
  }

  async writeCollection(collectionName, data) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      logger.info(`Collection ${collectionName} written successfully`);
    } catch (error) {
      logger.error(`Error writing collection ${collectionName}:`, error);
      throw error;
    }
  }

  async findById(collectionName, id) {
    const collection = await this.readCollection(collectionName);
    return collection.find(item => item.id === id);
  }

  async findByField(collectionName, field, value) {
    const collection = await this.readCollection(collectionName);
    return collection.find(item => item[field] === value);
  }

  async insert(collectionName, item) {
    const collection = await this.readCollection(collectionName);
    const newItem = {
      ...item,
      id: item.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    collection.push(newItem);
    await this.writeCollection(collectionName, collection);
    return newItem;
  }

  async update(collectionName, id, updates) {
    const collection = await this.readCollection(collectionName);
    const index = collection.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with id ${id} not found in ${collectionName}`);
    }

    collection[index] = {
      ...collection[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeCollection(collectionName, collection);
    return collection[index];
  }

  async delete(collectionName, id) {
    const collection = await this.readCollection(collectionName);
    const index = collection.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with id ${id} not found in ${collectionName}`);
    }

    const deletedItem = collection.splice(index, 1)[0];
    await this.writeCollection(collectionName, collection);
    return deletedItem;
  }

  async findMany(collectionName, filter = {}) {
    const collection = await this.readCollection(collectionName);
    return collection.filter(item => {
      return Object.entries(filter).every(([key, value]) => item[key] === value);
    });
  }

  async count(collectionName, filter = {}) {
    const items = await this.findMany(collectionName, filter);
    return items.length;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Backup and restore functionality
  async backup() {
    try {
      const backupDir = path.join(this.dataDir, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
      
      const collections = ['users', 'rooms', 'events', 'photos'];
      const backup = {};
      
      for (const collection of collections) {
        try {
          backup[collection] = await this.readCollection(collection);
        } catch (error) {
          logger.warn(`Could not backup collection ${collection}:`, error.message);
          backup[collection] = [];
        }
      }
      
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      logger.info(`Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('Backup failed:', error);
      throw error;
    }
  }

  async restore(backupPath) {
    try {
      const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      for (const [collectionName, data] of Object.entries(backup)) {
        await this.writeCollection(collectionName, data);
      }
      
      logger.info(`Database restored from: ${backupPath}`);
    } catch (error) {
      logger.error('Restore failed:', error);
      throw error;
    }
  }

  // Cleanup old backups (keep last 10)
  async cleanupBackups() {
    try {
      const backupDir = path.join(this.dataDir, 'backups');
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.stat(path.join(backupDir, file)).then(stats => stats.mtime)
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (backupFiles.length > 10) {
        const filesToDelete = backupFiles.slice(10);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          logger.info(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }
}

// Create singleton instance
const db = new DatabaseManager();

module.exports = {
  db,
  DatabaseManager
};
