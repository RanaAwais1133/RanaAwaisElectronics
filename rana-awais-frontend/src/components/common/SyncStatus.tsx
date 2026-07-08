import React, { useState, useEffect, useCallback } from 'react';
import { offlineDB } from '../../db/indexeddb';
import { syncEngine } from '../../utils/sync';

export const SyncStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  // Subscribe to sync engine status
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
      setFailedCount(status.failedCount);
      if (status.lastSync) {
        setLastSync(status.lastSync.toLocaleTimeString());
      }
    });
    return unsubscribe;
  }, []);

  const updateStatus = useCallback(async () => {
    const online = navigator.onLine;
    setIsOnline(online);
    setIsLoggedIn(!!localStorage.getItem('token'));

    if (!localStorage.getItem('token')) return;

    try {
      const pending = await offlineDB.getPendingCount();
      const failed = await offlineDB.getFailedCount();
      setPendingCount(pending);
      setFailedCount(failed);
    } catch (error) {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    updateStatus();
    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(updateStatus, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updateStatus]);

  const handleManualSync = async () => {
    if (!navigator.onLine || syncing) return;
    await syncEngine.syncNow();
  };

  // Agar login nahi hai to kuch bhi mat dikhao
  if (!isLoggedIn) return null;

  // Don't show anything if everything is fine
  if (isOnline && pendingCount === 0 && failedCount === 0 && !syncing) {
    return null;
  }

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 p-1 sm:p-1.5 z-50 flex flex-wrap items-center justify-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-b-xl shadow-md max-w-full">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOnline ? 'bg-green-500' : 'bg-red-500'} text-white`}>
        {isOnline ? '🟢 Online' : '🔴 Offline'}
      </span>
      
      {syncing && (
        <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse">
          🔄 Syncing...
        </span>
      )}
      
      {pendingCount > 0 && (
        <span className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse">
          📤 {pendingCount} pending
        </span>
      )}
      
      {failedCount > 0 && (
        <span 
          className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:bg-red-700"
          onClick={() => setShowDetails(!showDetails)}
          title="Click to retry failed"
        >
          ⚠️ {failedCount} failed
        </span>
      )}
      
      <button 
        onClick={handleManualSync} 
        disabled={!isOnline || syncing}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors active:scale-95"
      >
        Sync Now
      </button>

      {lastSync && (
        <span className="text-[9px] text-gray-500 dark:text-gray-400">
          Last: {lastSync}
        </span>
      )}

      {/* Failed details modal */}
      {showDetails && failedCount > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 max-w-sm w-full mx-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm">
              ⚠️ Failed Sync Records
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {failedCount} record(s) failed to sync. Click retry to try again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await syncEngine.retryFailed();
                  setShowDetails(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                🔄 Retry All
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
