/**
 * Theme Settings Component
 *
 * Two-layer theme configuration:
 * - Color Mode: Light / Dark / System
 * - Brand Theme: Named palettes organized by category
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { getThemesByCategory, THEME_REGISTRY } from '../../config/themes/registry';
import type { ColorMode } from '../../config/themes/types';

const COLOR_MODES: { id: ColorMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Monitor },
];

export const ThemeSettings: React.FC = () => {
  const colorMode = useThemeStore((s) => s.colorMode);
  const brandTheme = useThemeStore((s) => s.brandTheme);
  const setColorMode = useThemeStore((s) => s.setColorMode);
  const setBrandTheme = useThemeStore((s) => s.setBrandTheme);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categorizedThemes = getThemesByCategory();
  const curatedThemes = [
    { ...THEME_REGISTRY['ink-wash'], name: '静谧', description: '低刺激藏蓝与柔和灰，适合长时间使用' },
    { ...THEME_REGISTRY['evergreen'], name: '自然', description: '克制的森林色，适合生活与工作混合场景' },
    { ...THEME_REGISTRY['monochrome'], name: '单色', description: '尽量减少颜色干扰，专注内容本身' },
  ];
  const curatedIds = new Set(curatedThemes.map((theme) => theme.id));

  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
        外观
      </h2>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        先选择明暗模式，再从三套耐看的主色板中选择一套
      </p>

      {/* Color Mode Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-3">
          颜色模式
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_MODES.map(({ id, label, icon: Icon }) => {
            const isActive = colorMode === id;
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setColorMode(id)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-border-light dark:hover:bg-border-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Curated palettes keep the primary choice calm and understandable. */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-3">
          推荐色板
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {curatedThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              themeId={theme.id}
              name={theme.name}
              description={theme.description}
              preview={theme.preview}
              isActive={brandTheme === theme.id}
              onSelect={() => setBrandTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((value) => !value)}
        className="flex w-full items-center justify-between rounded-lg border border-border-light px-4 py-3 text-left text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"
        aria-expanded={showAdvanced}
      >
        <span>
          更多色板
          <span className="ml-2 font-normal text-text-light-tertiary dark:text-text-dark-tertiary">仅在你明确需要时展开</span>
        </span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdvanced && (
        <div className="mt-4 rounded-xl bg-surface-light-elevated p-4 dark:bg-surface-dark">
          <ThemeCard
            themeId="default"
            name={THEME_REGISTRY.default.name}
            description={THEME_REGISTRY.default.description}
            preview={THEME_REGISTRY.default.preview}
            isActive={brandTheme === 'default'}
            onSelect={() => setBrandTheme('default')}
          />
          {categorizedThemes.map(({ category, themes }) => {
            const advancedThemes = themes.filter((theme) => !curatedIds.has(theme.id));
            if (advancedThemes.length === 0) return null;
            return (
              <div key={category.id} className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
                  {category.label}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {advancedThemes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      themeId={theme.id}
                      name={theme.name}
                      description={theme.description}
                      preview={theme.preview}
                      isActive={brandTheme === theme.id}
                      onSelect={() => setBrandTheme(theme.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Theme Card
// ---------------------------------------------------------------------------

interface ThemeCardProps {
  themeId: string;
  name: string;
  description: string;
  preview: { primary: string; secondary: string; accent: string };
  isActive: boolean;
  onSelect: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  name,
  description,
  preview,
  isActive,
  onSelect,
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-accent-primary bg-accent-primary/5'
          : 'bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark'
      }`}
    >
      {/* Color swatches */}
      <div className="flex gap-1 flex-shrink-0">
        <span
          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
          style={{ backgroundColor: preview.primary }}
        />
        <span
          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
          style={{ backgroundColor: preview.secondary }}
        />
        <span
          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
          style={{ backgroundColor: preview.accent }}
        />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${
          isActive
            ? 'text-accent-primary'
            : 'text-text-light-primary dark:text-text-dark-primary'
        }`}>
          {name}
        </p>
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary truncate">
          {description}
        </p>
      </div>

      {/* Active indicator */}
      {isActive && (
        <span className="text-accent-primary flex-shrink-0 text-sm">
          &#10003;
        </span>
      )}
    </motion.button>
  );
};
