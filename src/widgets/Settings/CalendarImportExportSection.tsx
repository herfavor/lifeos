import React, { useRef } from 'react';
import { CalendarDays, Download, Hourglass, Upload } from 'lucide-react';

interface CalendarImportExportSectionProps {
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Calendar Import/Export Section
 * Provides buttons to export calendar to ICS and import from ICS files.
 */
export const CalendarImportExportSection: React.FC<CalendarImportExportSectionProps> = ({
  isExporting,
  isImporting,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bento-card p-6">
      <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        <CalendarDays className="h-5 w-5" aria-hidden /> 日历导入/导出
      </h2>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        从 Google Calendar 导入事件，或将你的事件导出为 .ics 格式。
      </p>

      <div className="space-y-3">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200"
        >
          {isExporting ? <><Hourglass className="h-4 w-4" aria-hidden /> 正在导出...</> : <><Upload className="h-4 w-4" aria-hidden /> 导出日历（.ics）</>}
        </button>

        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="w-full px-4 py-3 bg-accent-secondary hover:bg-accent-secondary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200"
        >
          {isImporting ? <><Hourglass className="h-4 w-4" aria-hidden /> 正在导入...</> : <><Download className="h-4 w-4" aria-hidden /> 导入日历（.ics）</>}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,.ical"
          onChange={onImport}
          className="hidden"
        />
      </div>
    </div>
  );
};
