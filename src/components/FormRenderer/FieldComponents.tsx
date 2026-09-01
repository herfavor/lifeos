/**
 * Field Components
 * Individual field types for form rendering
 */

import { useState } from 'react';
import { Star, Upload, X, FileIcon } from 'lucide-react';
import type { FormField, FileUploadAnswer, FormAnswerValue } from '../../types/forms';

/**
 * Common props for field components
 * Value and onChange are typed loosely here because each field type
 * handles its own specific value type internally
 */
interface FieldComponentProps {
  field: FormField;
  value: FormAnswerValue;
  onChange: (value: FormAnswerValue) => void;
  error?: string;
}

// Helper to safely convert value to string for text inputs
const toStringValue = (value: FormAnswerValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

// Helper to safely convert value to number
const toNumberValue = (value: FormAnswerValue): number | '' => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return '';
};

// Helper to safely convert value to boolean
const toBooleanValue = (value: FormAnswerValue): boolean => {
  if (typeof value === 'boolean') return value;
  return false;
};

// Helper to safely convert value to string array
const toStringArrayValue = (value: FormAnswerValue): string[] => {
  if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
    return value as string[];
  }
  return [];
};

// Helper to safely convert value to FileUploadAnswer array
const toFileArrayValue = (value: FormAnswerValue): FileUploadAnswer[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is FileUploadAnswer =>
      typeof v === 'object' && v !== null && 'fileName' in v
    );
  }
  if (value && typeof value === 'object' && 'fileName' in value) {
    return [value as FileUploadAnswer];
  }
  return [];
};

export function TextField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <input
        id={field.id}
        type="text"
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function TextAreaField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <textarea
        id={field.id}
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        rows={4}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function NumberField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <input
        id={field.id}
        type="number"
        value={toNumberValue(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        min={field.validation?.min}
        max={field.validation?.max}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function DateField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <input
        id={field.id}
        type="date"
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function TimeField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <input
        id={field.id}
        type="time"
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function SelectField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <select
        id={field.id}
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
      >
        <option value="">请选择一个选项…</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function MultiSelectField({ field, value, onChange, error }: FieldComponentProps) {
  const selectedValues = toStringArrayValue(value);
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;
  const groupId = `${field.id}-group`;

  const handleToggle = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  return (
    <div role="group" aria-labelledby={groupId} aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}>
      <div id={groupId} className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </div>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <div className="space-y-2">
        {field.options?.map((option, index) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input
              id={`${field.id}-${index}`}
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={() => handleToggle(option)}
              aria-invalid={!!error}
              className="w-4 h-4"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              {option}
            </span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function RadioField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;
  const groupId = `${field.id}-group`;

  return (
    <div role="radiogroup" aria-labelledby={groupId} aria-required={field.required} aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}>
      <div id={groupId} className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </div>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <div className="space-y-2">
        {field.options?.map((option, index) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input
              id={`${field.id}-${index}`}
              type="radio"
              name={field.id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              aria-invalid={!!error}
              className="w-4 h-4"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              {option}
            </span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function CheckboxField({ field, value, onChange, error }: FieldComponentProps) {
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;

  return (
    <div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          id={field.id}
          type="checkbox"
          checked={toBooleanValue(value)}
          onChange={(e) => onChange(e.target.checked)}
          required={field.required}
          aria-required={field.required}
          aria-invalid={!!error}
          aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          className="w-4 h-4 mt-1"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            {field.label}
            {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
          </span>
          {field.description && (
            <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              {field.description}
            </p>
          )}
        </div>
      </label>
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function RatingField({ field, value, onChange, error }: FieldComponentProps) {
  const rating = typeof value === 'number' ? value : 0;
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;
  const groupId = `${field.id}-group`;

  return (
    <div role="group" aria-labelledby={groupId} aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}>
      <div id={groupId} className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </div>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <div className="flex gap-2" role="radiogroup" aria-label={`为 ${field.label} 评分`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`评分 ${star} 星（满分 5 星）`}
            aria-pressed={star === rating}
            className={`transition-colors ${
              star <= rating
                ? 'text-accent-yellow'
                : 'text-text-light-tertiary dark:text-text-dark-tertiary'
            }`}
          >
            <Star className="w-7 h-7" fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-text-light-secondary dark:text-text-dark-secondary" aria-live="polite">
            {rating} / 5
          </span>
        )}
      </div>
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function ScaleField({ field, value, onChange, error }: FieldComponentProps) {
  const scaleValue = typeof value === 'number' ? value : 0;
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;
  const groupId = `${field.id}-group`;

  return (
    <div role="group" aria-labelledby={groupId} aria-describedby={[field.description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}>
      <div id={groupId} className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </div>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`为 ${field.label} 打分`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            aria-label={`选择 ${num}（满分 10 分）`}
            aria-pressed={num === scaleValue}
            className={`w-10 h-10 rounded-lg transition-colors ${
              num === scaleValue
                ? 'bg-accent-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      {scaleValue > 0 && (
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2" aria-live="polite">
          已选择：{scaleValue} / 10
        </p>
      )}
      {error && <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function FileUploadField({ field, value, onChange, error }: FieldComponentProps) {
  const [uploadError, setUploadError] = useState<string>('');
  const errorId = `${field.id}-error`;
  const descriptionId = `${field.id}-description`;
  const inputId = `file-${field.id}`;

  // Default config if not specified
  const config = field.fileConfig || {
    maxSizeMB: 10,
    allowedTypes: ['image/*', 'application/pdf'],
    multiple: false,
  };

  const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError('');

    if (files.length === 0) return;

    // Validate multiple files
    if (!config.multiple && files.length > 1) {
      setUploadError('一次只能上传一个文件');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate each file
    const validatedFiles: FileUploadAnswer[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > maxSizeBytes) {
        setUploadError(`文件“${file.name}”超过 ${config.maxSizeMB}MB 大小限制`);
        e.target.value = '';
        return;
      }

      // Check file type
      const isAllowedType = config.allowedTypes.some((allowedType) => {
        if (allowedType.endsWith('/*')) {
          const category = allowedType.split('/')[0];
          return file.type.startsWith(category + '/');
        }
        return file.type === allowedType;
      });

      if (!isAllowedType) {
        setUploadError(
          `文件“${file.name}”的类型不允许。允许的类型：${config.allowedTypes.join(', ')}`
        );
        e.target.value = '';
        return;
      }

      // Convert to base64
      try {
        const base64Data = await fileToBase64(file);
        validatedFiles.push({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          base64Data,
          uploadedAt: new Date(),
        });
      } catch (err) {
        setUploadError(`无法处理文件“${file.name}”`);
        e.target.value = '';
        return;
      }
    }

    // Update value
    if (config.multiple) {
      // Append to existing files
      const existingFiles = toFileArrayValue(value);
      onChange([...existingFiles, ...validatedFiles]);
    } else {
      // Single file
      onChange(validatedFiles[0]);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveFile = (index?: number) => {
    if (config.multiple && typeof index === 'number') {
      const files = toFileArrayValue(value);
      onChange(files.filter((_, i) => i !== index));
    } else {
      onChange(null);
    }
  };

  // Get uploaded files as array using the helper
  const uploadedFiles = toFileArrayValue(value);

  const combinedError = uploadError || error;
  const ariaDescribedBy = [
    field.description ? descriptionId : null,
    combinedError ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
      >
        {field.label}
        {field.required && <span className="text-accent-red ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}

      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          id={inputId}
          onChange={handleFileChange}
          multiple={config.multiple}
          accept={config.allowedTypes.join(',')}
          required={field.required && uploadedFiles.length === 0}
          aria-required={field.required}
          aria-invalid={!!combinedError}
          aria-describedby={ariaDescribedBy}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg hover:border-accent-primary transition-colors bg-surface-light dark:bg-surface-dark">
          <Upload className="w-5 h-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
          <div className="flex-1">
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
              {config.multiple ? '选择多个文件或拖放文件' : '选择一个文件或拖放文件'}
            </p>
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              最大 {config.maxSizeMB}MB • {config.allowedTypes.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg"
            >
              <FileIcon className="w-5 h-5 text-accent-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                  {file.fileName}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  {formatFileSize(file.fileSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(config.multiple ? index : undefined)}
                className="p-1 hover:bg-accent-red/10 rounded transition-colors"
                aria-label="移除文件"
              >
                <X className="w-4 h-4 text-accent-red" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {combinedError && (
        <p id={errorId} className="text-xs text-accent-red mt-1" role="alert">{combinedError}</p>
      )}
    </div>
  );
}

// Helper: Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper: Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 字节';
  const k = 1024;
  const sizes = ['字节', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
