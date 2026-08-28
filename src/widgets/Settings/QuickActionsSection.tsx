/**
 * Quick Actions Section Component
 *
 * Export/Import brain file actions with visual feedback.
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';

interface QuickActionsSectionProps {
  timeSinceLastBackup: string | null;
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  timeSinceLastBackup,
  isExporting,
  isImporting,
  onExport,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        快捷操作
      </h2>

      {timeSinceLastBackup && (
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
          上次备份：{timeSinceLastBackup}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExport}
          disabled={isExporting}
          className="p-6 rounded-card bg-gradient-button-magenta text-white transition-all duration-standard shadow-card hover:shadow-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl">📦</span>
            <span className="text-lg font-semibold">
              {isExporting ? '正在导出…' : '导出 Brain'}
            </span>
          </div>
          <p className="text-sm opacity-90">
            将你的全部数据下载为 .brain 文件
          </p>
        </motion.button>

        {/* Import */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleImportClick}
          disabled={isImporting}
          className="p-6 rounded-card bg-gradient-button-cyan text-white transition-all duration-standard shadow-card hover:shadow-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl">📥</span>
            <span className="text-lg font-semibold">
              {isImporting ? '正在导入…' : '导入 Brain'}
            </span>
          </div>
          <p className="text-sm opacity-90">
            从 .brain 文件恢复数据
          </p>
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".brain"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};
