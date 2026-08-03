import React, { createContext, useContext, useState, useEffect } from 'react';
import { cost360DatabaseService } from '../services/cost360DatabaseService';

const DatabaseContext = createContext(null);

// Default databases fallback
const DEFAULT_DATABASES = [
  { id: 'master', name: 'Base Maestra', description: 'Base de datos oficial de Cost360', is_master: true, is_active: true },
];

export const DatabaseProvider = ({ children }) => {
  const [activeDatabase, setActiveDatabase] = useState(DEFAULT_DATABASES[0]);
  const [databases, setDatabases] = useState(DEFAULT_DATABASES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const data = await cost360DatabaseService.getAll();
      const dbList = data.databases || [];
      
      // Ensure master is always first
      const sortedDatabases = [
        ...dbList.filter(db => db.is_master),
        ...dbList.filter(db => !db.is_master)
      ];
      
      setDatabases(sortedDatabases);
      
      // Set active database to master if not set
      if (sortedDatabases.length > 0) {
        setActiveDatabase(sortedDatabases[0]);
      }
    } catch (error) {
      console.error('Error loading databases:', error);
      // Keep default databases on error
    } finally {
      setLoading(false);
    }
  };

  const refreshDatabases = () => {
    loadDatabases();
  };

  const value = {
    activeDatabase,
    setActiveDatabase,
    databases,
    loading,
    refreshDatabases,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
