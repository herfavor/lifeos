import React, { useState, useEffect } from 'react';

export interface BackgroundSettings {
  type: 'none' | 'gradient' | 'image' | 'pattern';
  value: string; // gradient CSS, image URL, or pattern ID
  opacity: number; // 0-100
  blur: number; // 0-20px
}

// Gradient presets
const GRADIENT_PRESETS = [
  {
    name: '紫色梦幻',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: '日出',
    value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    name: '海洋',
    value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    name: '日落',
    value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    name: '森林',
    value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    name: '极光',
    value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
];

interface BackgroundCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
}

/**
 * Background Customizer Component
 *
 * Allows users to:
 * - Choose background type (none, gradient, image, pattern)
 * - Select from gradient presets or enter custom CSS
 * - Upload custom background images
 * - Adjust opacity (0-100%)
 * - Adjust blur (0-20px)
 * - Preview changes in real-time
 */
export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const [localSettings, setLocalSettings] = useState<BackgroundSettings>(settings);
  const [imageFile, setImageFile] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleTypeChange = (type: BackgroundSettings['type']) => {
    setLocalSettings((prev) => ({
      ...prev,
      type,
      value: type === 'gradient' ? GRADIENT_PRESETS[0].value : type === 'none' ? '' : prev.value,
    }));
  };

  const handleGradientSelect = (gradient: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      type: 'gradient',
      value: gradient,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setImageFile(imageUrl);
        setLocalSettings((prev) => ({
          ...prev,
          type: 'image',
          value: imageUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const resetSettings: BackgroundSettings = {
      type: 'none',
      value: '',
      opacity: 100,
      blur: 0,
    };
    setLocalSettings(resetSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-button shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            自定义背景
          </h2>
          <button
            onClick={onClose}
            className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
            aria-label="关闭背景自定义"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Background Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              背景类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTypeChange('none')}
                className={`px-4 py-2 rounded-button font-medium transition-all duration-standard ease-smooth ${
                  localSettings.type === 'none'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                无
              </button>
              <button
                onClick={() => handleTypeChange('gradient')}
                className={`px-4 py-2 rounded-button font-medium transition-all duration-standard ease-smooth ${
                  localSettings.type === 'gradient'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                渐变
              </button>
              <button
                onClick={() => handleTypeChange('image')}
                className={`px-4 py-2 rounded-button font-medium transition-all duration-standard ease-smooth ${
                  localSettings.type === 'image'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                图片
              </button>
              <button
                onClick={() => handleTypeChange('pattern')}
                className={`px-4 py-2 rounded-button font-medium transition-all duration-standard ease-smooth ${
                  localSettings.type === 'pattern'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
                disabled
                title="图案背景即将推出"
              >
                图案（即将推出）
              </button>
            </div>
          </div>

          {/* Gradient Selector */}
          {localSettings.type === 'gradient' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                选择渐变
              </label>
              <div className="grid grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleGradientSelect(preset.value)}
                    className={`h-16 rounded-button border-2 transition-all duration-standard ease-smooth ${
                      localSettings.value === preset.value
                        ? 'border-accent-primary scale-105'
                        : 'border-border-light dark:border-border-dark hover:scale-105'
                    }`}
                    style={{ background: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Image Upload */}
          {localSettings.type === 'image' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                上传图片
              </label>
              <label className="block w-full px-4 py-8 border-2 border-dashed border-border-light dark:border-border-dark rounded-button cursor-pointer hover:border-accent-primary transition-all duration-standard ease-smooth text-center">
                {imageFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-full h-32 bg-cover bg-center rounded-button"
                      style={{ backgroundImage: `url(${imageFile})` }}
                    />
                    <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      点击更换图片
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-text-light-secondary dark:text-text-dark-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      点击上传图片
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Opacity Slider */}
          {localSettings.type !== 'none' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                不透明度：{localSettings.opacity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={localSettings.opacity}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    opacity: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
          )}

          {/* Blur Slider */}
          {localSettings.type !== 'none' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                模糊：{localSettings.blur}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={localSettings.blur}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    blur: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
          )}

          {/* Preview */}
          {localSettings.type !== 'none' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                预览
              </label>
              <div className="relative h-32 rounded-button overflow-hidden border border-border-light dark:border-border-dark">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: localSettings.value,
                    backgroundSize: localSettings.type === 'image' ? 'cover' : undefined,
                    backgroundPosition: localSettings.type === 'image' ? 'center' : undefined,
                    opacity: localSettings.opacity / 100,
                    filter: `blur(${localSettings.blur}px)`,
                  }}
                />
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="bg-surface-light/80 dark:bg-surface-dark/80 px-4 py-2 rounded">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">示例内容</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border-light dark:border-border-dark">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-accent-red hover:bg-accent-red-hover text-white rounded-button font-medium"
          >
            重置
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-surface-light dark:hover:bg-surface-dark text-text-light-primary dark:text-text-dark-primary rounded-button font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-button font-medium"
            >
              应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
