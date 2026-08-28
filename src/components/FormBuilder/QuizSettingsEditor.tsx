/**
 * Quiz Settings Editor Component
 * Configure correct answers, points, and feedback for quiz mode
 */

import type { FormField, QuizSettings } from '../../types/forms';

interface QuizSettingsEditorProps {
  field: FormField;
  onSettingsChange: (settings: QuizSettings | undefined) => void;
}

export function QuizSettingsEditor({ field, onSettingsChange }: QuizSettingsEditorProps) {
  const quizSettings = field.quizSettings;

  const handleChange = (updates: Partial<QuizSettings>) => {
    if (!quizSettings) {
      // Initialize quiz settings
      onSettingsChange({
        correctAnswer: '',
        points: 1,
        ...updates,
      });
    } else {
      onSettingsChange({
        ...quizSettings,
        ...updates,
      });
    }
  };

  const handleRemove = () => {
    onSettingsChange(undefined);
  };

  // Don't show quiz settings for certain field types
  if (field.type === 'calculation' || field.type === 'hidden' || field.type === 'file') {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
          测验设置
        </h4>
        {quizSettings && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-accent-red hover:underline"
          >
            移除测验设置
          </button>
        )}
      </div>

      {!quizSettings ? (
        <button
          type="button"
          onClick={() => handleChange({})}
          className="w-full px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90"
        >
          为此字段启用测验模式
        </button>
      ) : (
        <>
          {/* Correct Answer */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              正确答案 *
            </label>

            {/* Text-based fields */}
            {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(quizSettings.correctAnswer || '')}
                onChange={(e) => handleChange({ correctAnswer: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                placeholder="输入正确答案"
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            )}

            {/* Select/Radio fields */}
            {(field.type === 'select' || field.type === 'radio') && (
              <select
                value={String(quizSettings.correctAnswer || '')}
                onChange={(e) => handleChange({ correctAnswer: e.target.value })}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              >
                <option value="">选择正确答案</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {/* Multiselect */}
            {field.type === 'multiselect' && (
              <div className="space-y-2">
                {field.options?.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Array.isArray(quizSettings.correctAnswer) && quizSettings.correctAnswer.includes(option)}
                      onChange={(e) => {
                        const currentAnswers = Array.isArray(quizSettings.correctAnswer) ? quizSettings.correctAnswer : [];
                        const newAnswers = e.target.checked
                          ? [...currentAnswers, option]
                          : currentAnswers.filter((a) => a !== option);
                        handleChange({ correctAnswer: newAnswers });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Checkbox */}
            {field.type === 'checkbox' && (
              <select
                value={String(quizSettings.correctAnswer || 'false')}
                onChange={(e) => handleChange({ correctAnswer: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="true">已勾选 (true)</option>
                <option value="false">未勾选 (false)</option>
              </select>
            )}

            {/* Rating/Scale */}
            {(field.type === 'rating' || field.type === 'scale') && (
              <input
                type="number"
                value={Number(quizSettings.correctAnswer || 1)}
                onChange={(e) => handleChange({ correctAnswer: Number(e.target.value) })}
                min={1}
                max={field.type === 'rating' ? 5 : 10}
                placeholder={`输入正确的${field.type === 'rating' ? '评分' : '量表'}值（${field.type === 'rating' ? '1-5' : '1-10'}）`}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            )}

            {/* Date/Time fields */}
            {field.type === 'date' && (
              <input
                type="date"
                value={String(quizSettings.correctAnswer || '')}
                onChange={(e) => handleChange({ correctAnswer: e.target.value })}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            )}

            {field.type === 'time' && (
              <input
                type="time"
                value={String(quizSettings.correctAnswer || '')}
                onChange={(e) => handleChange({ correctAnswer: e.target.value })}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            )}
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              分值 *
            </label>
            <input
              type="number"
              value={quizSettings.points || 1}
              onChange={(e) => handleChange({ points: Number(e.target.value) || 1 })}
              min={1}
              placeholder="此问题的分值"
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          {/* Feedback (Optional) */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              反馈消息（可选）
            </label>
            <textarea
              value={quizSettings.feedback || ''}
              onChange={(e) => handleChange({ feedback: e.target.value })}
              placeholder="提交后显示的可选反馈（例如：'法国的首都是巴黎！'）"
              rows={2}
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}
