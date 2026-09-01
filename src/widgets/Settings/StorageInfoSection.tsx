import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { isFileSystemAccessSupported } from '../../services/brainBackup';

interface StorageInfo {
  usageFormatted: string;
  availableFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

interface StorageInfoSectionProps {
  storageInfo: StorageInfo | null;
}

/**
 * Storage & Browser Info Section
 * Displays storage usage, quota, and browser capability information.
 * Self-contained with its own collapse state.
 */
export const StorageInfoSection: React.FC<StorageInfoSectionProps> = ({ storageInfo }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bento-card p-6">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          存储与浏览器信息
        </h2>
        <span className="text-2xl text-text-light-secondary dark:text-text-dark-secondary">
          {showDetails ? <ChevronDown className="h-5 w-5" aria-hidden /> : <ChevronRight className="h-5 w-5" aria-hidden />}
        </span>
      </button>

      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 space-y-6"
        >
          {storageInfo && (
            <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">已使用：</span>
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {storageInfo.usageFormatted}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">可用：</span>
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {storageInfo.availableFormatted}
                </span>
              </div>
              <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-3 overflow-hidden mt-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    storageInfo.percentUsed > 80 ? 'bg-accent-red' :
                    storageInfo.percentUsed > 60 ? 'bg-accent-yellow' :
                    'bg-accent-green'
                  }`}
                  style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                已使用 {storageInfo.percentUsed.toFixed(1)}%
              </p>
            </div>
          )}

          <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">IndexedDB：</span>
              <span className="font-semibold text-accent-green"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> 支持</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">文件系统访问：</span>
              <span className={`font-semibold ${isFileSystemAccessSupported() ? 'text-accent-green' : 'text-accent-yellow'}`}>
                {isFileSystemAccessSupported() ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> 支持</> : <><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> 不支持</>}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
