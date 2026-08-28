/**
 * BackupOnboardingModal Component
 *
 * First-time onboarding modal for backup setup
 * - Step 1: Why Backup?
 * - Step 2: Choose Cloud Provider
 * - Step 3: Platform-Specific Instructions
 * - Step 4: Folder Picker (FSA API)
 * - Step 5: Reminder Preferences
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { useThemeStore } from '../stores/useThemeStore';
import { autoSaveManager } from '../services/autoSave';
import { requestAutoSaveDirectory } from '../services/brainBackup';

interface BackupOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CloudProvider = 'icloud' | 'google-drive' | 'onedrive' | 'proton-drive' | 'dropbox' | 'none';
type Platform = 'windows' | 'macos';
type ReminderPreference = 'every-session' | 'in-7-days' | 'monthly' | 'never';

export function BackupOnboardingModal({ isOpen, onClose }: BackupOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [platform, setPlatform] = useState<Platform>(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('mac') ? 'macos' : 'windows';
  });
  const [reminderPreference, setReminderPreference] = useState<ReminderPreference>('every-session');
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBackupPreferences = useThemeStore((state) => state.updateBackupPreferences);

  const totalSteps = 5;

  /**
   * Handle folder selection (Step 4)
   */
  const handleSelectFolder = async () => {
    setIsSelecting(true);
    setError(null);

    try {
      const dirHandle = await requestAutoSaveDirectory();

      // Update preferences
      updateBackupPreferences({
        hasBackupFolder: true,
        backupFolderPath: dirHandle.name,
        autoSaveEnabled: true,
      });

      // Enable auto-save
      await autoSaveManager.enableLocal(dirHandle);

      // Move to next step
      setCurrentStep(5);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('已取消选择文件夹。请选择一个文件夹以继续。');
      } else {
        setError(`错误：${(err as Error).message}`);
      }
    } finally {
      setIsSelecting(false);
    }
  };

  /**
   * Handle reminder preference save (Step 5)
   */
  const handleSaveReminder = () => {
    let nextReminderDate: string | null = null;

    if (reminderPreference === 'in-7-days') {
      nextReminderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (reminderPreference === 'monthly') {
      // 1st of next month
      const now = new Date();
      nextReminderDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    updateBackupPreferences({
      reminderPreference,
      nextReminderDate,
    });

    onClose();
  };

  /**
   * Cloud provider instructions
   */
  const getInstructions = (provider: CloudProvider, platform: Platform) => {
    const instructions: Record<CloudProvider, Record<Platform, { title: string; steps: string[] }>> = {
      icloud: {
        windows: {
          title: 'iCloud Drive (Windows)',
          steps: [
            '从 Microsoft Store 安装 iCloud for Windows',
            '使用你的 Apple ID 登录',
            '在 iCloud 设置中启用“iCloud Drive”',
            '打开文件资源管理器并进入 iCloud Drive',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
        macos: {
          title: 'iCloud Drive (macOS)',
          steps: [
            '打开系统设置 → Apple ID → iCloud',
            '启用“iCloud Drive”',
            '打开 Finder 并进入 iCloud Drive（在侧边栏中）',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
      },
      'google-drive': {
        windows: {
          title: 'Google Drive (Windows)',
          steps: [
            '从 google.com/drive/download 安装 Google Drive for Desktop',
            '使用你的 Google 账户登录',
            '打开文件资源管理器并进入 Google Drive（G: 盘）',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
        macos: {
          title: 'Google Drive (macOS)',
          steps: [
            '从 google.com/drive/download 安装 Google Drive for Desktop',
            '使用你的 Google 账户登录',
            '打开 Finder 并进入 Google Drive',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
      },
      onedrive: {
        windows: {
          title: 'OneDrive (Windows)',
          steps: [
            'Windows 10/11 预装 OneDrive',
            '使用你的 Microsoft 账户登录（如果尚未登录）',
            '打开文件资源管理器并进入 OneDrive',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
        macos: {
          title: 'OneDrive (macOS)',
          steps: [
            '从 Mac App Store 安装 OneDrive',
            '使用你的 Microsoft 账户登录',
            '打开 Finder 并进入 OneDrive',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
      },
      'proton-drive': {
        windows: {
          title: 'Proton Drive (Windows)',
          steps: [
            '从 proton.me/drive 安装 Proton Drive 桌面应用',
            '使用你的 Proton 账户登录',
            '打开文件资源管理器并进入 Proton Drive 文件夹',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
        macos: {
          title: 'Proton Drive (macOS)',
          steps: [
            '从 proton.me/drive 安装 Proton Drive 桌面应用',
            '使用你的 Proton 账户登录',
            '打开 Finder 并进入 Proton Drive 文件夹',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
      },
      dropbox: {
        windows: {
          title: 'Dropbox (Windows)',
          steps: [
            '从 dropbox.com/install 安装 Dropbox 桌面应用',
            '使用你的 Dropbox 账户登录',
            '打开文件资源管理器并进入 Dropbox 文件夹',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
        macos: {
          title: 'Dropbox (macOS)',
          steps: [
            '从 dropbox.com/install 安装 Dropbox 桌面应用',
            '使用你的 Dropbox 账户登录',
            '打开 Finder 并进入 Dropbox 文件夹',
            '创建一个名为“LifeOS Backups”的文件夹（或你喜欢的任何名称）',
            '在下一步中，按提示选择此文件夹',
          ],
        },
      },
      none: {
        windows: { title: '', steps: [] },
        macos: { title: '', steps: [] },
      },
    };

    return instructions[provider][platform];
  };

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-5xl">💾</span>
            </div>

            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary text-center">
              为什么要备份数据？
            </h2>

            <div className="space-y-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
              <p>
                <strong className="text-text-light-primary dark:text-text-dark-primary">
                  你的数据存储在浏览器的本地。
                </strong>{' '}
                这虽然能保证 100% 隐私，但也意味着在以下情况下数据可能会丢失：
              </p>

              <ul className="list-disc list-inside space-y-1 ml-3">
                <li>浏览器缓存被清除</li>
                <li>电脑崩溃或丢失/被盗</li>
                <li>你更换了浏览器或设备</li>
                <li>浏览器存储损坏</li>
              </ul>

              <p className="pt-2">
                <strong className="text-text-light-primary dark:text-text-dark-primary">
                  自动保存到云同步文件夹可以保护你。
                </strong>
                {/* 联网边界：由你的云盘客户端负责上传，LifeOS 本身不会联网上传任何数据。 */}
              </p>

              <div className="bg-status-success/10 border border-status-success rounded-button p-3 mt-3">
                <p className="text-xs text-status-success font-medium">
                  ✅ 每 30 秒自动备份
                  <br />
                  ✅ 在所有设备间同步
                  <br />
                  ✅ 仍然 100% 私密（文件夹由你掌控）
                  <br />
                  ✅ 出问题时轻松恢复
                  <br />
                  <span className="text-status-success/80">
                    （上传由你的云盘客户端完成，LifeOS 本身不会联网上传数据）
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button text-sm font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
              >
                暂时跳过
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium transition-all duration-standard ease-smooth"
              >
                继续
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              选择你的云服务提供商
            </h2>

            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              选择你正在使用（或想使用）的云存储服务：
            </p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'icloud', name: 'iCloud Drive', icon: '☁️', description: 'Apple（5GB 免费）' },
                { id: 'google-drive', name: 'Google Drive', icon: '📁', description: 'Google（15GB 免费）' },
                { id: 'onedrive', name: 'OneDrive', icon: '☁️', description: 'Microsoft（5GB 免费）' },
                { id: 'proton-drive', name: 'Proton Drive', icon: '🔒', description: 'Proton（1GB 免费，加密）' },
                { id: 'dropbox', name: 'Dropbox', icon: '📦', description: 'Dropbox（2GB 免费）' },
              ].map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id as CloudProvider)}
                  className={`p-3 rounded-button border-2 transition-all text-left ${
                    selectedProvider === provider.id
                      ? 'border-accent-blue bg-accent-blue/10'
                      : 'border-border-light dark:border-border-dark hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{provider.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {provider.name}
                      </div>
                      <div className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                        {provider.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              <button
                onClick={() => setSelectedProvider('none')}
                className={`p-3 rounded-button border-2 transition-all text-left ${
                  selectedProvider === 'none'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:border-accent-blue/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">❓</span>
                  <div>
                    <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      我没有云存储
                    </div>
                    <div className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                      给我看免费选项
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button text-sm font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
              >
                返回
              </button>
              <button
                onClick={() => setCurrentStep(selectedProvider === 'none' ? 2.5 : 3)}
                disabled={!selectedProvider}
                className="flex-1 px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium transition-all duration-standard ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                继续
              </button>
            </div>
          </div>
        );

      case 2.5: {
        // Free provider recommendations
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              免费且安全的云存储选项
            </h2>

            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              以下是一些你可以使用的可靠免费云存储服务：
            </p>

            <div className="space-y-2">
              {[
                {
                  name: 'Google Drive',
                  storage: '15GB 免费',
                  url: 'https://drive.google.com',
                  pros: '存储空间最大，随处可用，设置简单',
                },
                {
                  name: 'OneDrive',
                  storage: '5GB 免费',
                  url: 'https://onedrive.com',
                  pros: '内置 Windows，与 Microsoft 深度集成',
                },
                {
                  name: 'iCloud Drive',
                  storage: '5GB 免费',
                  url: 'https://icloud.com',
                  pros: '最适合 Apple 用户，设备间无缝衔接',
                },
                {
                  name: 'Proton Drive',
                  storage: '1GB 免费（加密）',
                  url: 'https://proton.me/drive',
                  pros: '端到端加密，注重隐私',
                },
                {
                  name: 'Dropbox',
                  storage: '2GB 免费',
                  url: 'https://dropbox.com',
                  pros: '可靠，支持广泛',
                },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-button border border-border-light dark:border-border-dark"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                        {provider.name}
                      </div>
                      <div className="text-xs text-accent-blue">{provider.storage}</div>
                    </div>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs rounded-button transition-all duration-standard ease-smooth"
                    >
                      注册 →
                    </a>
                  </div>
                  <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                    {provider.pros}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-status-info/10 border border-status-info rounded-button p-3">
              <p className="text-xs text-text-light-primary dark:text-text-dark-primary">
                <strong>💡 提示：</strong>注册后，下载桌面应用以实现自动同步。然后回到第 2 步，在其中选择该服务。
              </p>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setCurrentStep(2);
                }}
                className="flex-1 px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium transition-all duration-standard ease-smooth"
              >
                ← 返回服务列表
              </button>
            </div>
          </div>
        );
      }

      case 3: {
        // Platform-specific instructions
        if (!selectedProvider || selectedProvider === 'none') {
          setCurrentStep(2);
          return null;
        }

        const instructions = getInstructions(selectedProvider, platform);

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                设置说明
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setPlatform('windows')}
                  className={`px-2 py-1 text-xs rounded-button transition-all duration-standard ease-smooth ${
                    platform === 'windows'
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => setPlatform('macos')}
                  className={`px-2 py-1 text-xs rounded-button transition-all duration-standard ease-smooth ${
                    platform === 'macos'
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                  }`}
                >
                  macOS
                </button>
              </div>
            </div>

            <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-button p-3">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                {instructions.title}
              </h3>
              <ol className="space-y-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex-shrink-0 font-semibold text-accent-blue">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-status-warning/10 border border-status-warning rounded-button p-3">
              <p className="text-xs text-text-light-primary dark:text-text-dark-primary">
                <strong>⚠️ 重要：</strong>继续之前，请确保桌面应用已安装并正在同步。
                你选择的文件夹必须位于云同步文件夹内。
              </p>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button text-sm font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
              >
                返回
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="flex-1 px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium transition-all duration-standard ease-smooth"
              >
                准备好了
              </button>
            </div>
          </div>
        );
      }

      case 4: {
        // Folder picker
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-5xl">📁</span>
            </div>

            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary text-center">
              选择你的备份文件夹
            </h2>

            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary text-center">
              点击下方按钮，选择保存备份的文件夹。
            </p>

            <div className="bg-status-info/10 border border-status-info rounded-button p-3">
              <p className="text-xs text-text-light-primary dark:text-text-dark-primary">
                <strong>💡 提示：</strong>进入你的云同步文件夹（iCloud Drive、Google Drive 等），
                选择你创建的“LifeOS Backups”文件夹。
              </p>
            </div>

            {error && (
              <div className="bg-status-error/10 border border-status-error rounded-button p-3">
                <p className="text-xs text-status-error">{error}</p>
              </div>
            )}

            <button
              onClick={handleSelectFolder}
              disabled={isSelecting}
              className="w-full px-4 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button font-semibold text-base transition-all duration-standard ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSelecting ? '正在打开文件夹选择器…' : '📁 选择备份文件夹'}
            </button>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button text-sm font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
              >
                返回
              </button>
            </div>
          </div>
        );
      }

      case 5: {
        // Reminder preferences
        return (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-5xl">✅</span>
            </div>

            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary text-center">
              已启用自动保存！
            </h2>

            <div className="bg-status-success/10 border border-status-success rounded-button p-3">
              <p className="text-xs text-status-success text-center">
                <strong>你的数据现在每 30 秒自动备份一次。</strong>
                <br />
                备份保存在你的云同步文件夹中，并会在所有设备之间同步。
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                提醒偏好
              </h3>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                希望我们什么时候提醒你检查备份？
              </p>

              <div className="space-y-1">
                {[
                  { id: 'every-session', label: '每次会话', description: '每次访问时提醒我' },
                  { id: 'in-7-days', label: '7 天后', description: '一周后提醒我' },
                  { id: 'monthly', label: '每月', description: '每月 1 号提醒我' },
                  { id: 'never', label: '从不', description: '不再提醒我' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setReminderPreference(option.id as ReminderPreference)}
                    className={`w-full p-3 rounded-button border-2 transition-all text-left ${
                      reminderPreference === option.id
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-border-light dark:border-border-dark hover:border-accent-blue/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {option.label}
                    </div>
                    <div className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveReminder}
              className="w-full px-4 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button font-semibold text-base transition-all duration-standard ease-smooth"
            >
              完成设置
            </button>

            <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary text-center">
              你以后可以随时在 设置 → 备份与同步 中更改这些设置
            </p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置自动保存备份" maxWidth="2xl">
      {/* Progress Indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
            第 {currentStep > 2.5 ? Math.floor(currentStep) : currentStep} 步，共 {totalSteps} 步
          </span>
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            已完成 {Math.round(((currentStep > 2.5 ? Math.floor(currentStep) : currentStep) / totalSteps) * 100)}%
          </span>
        </div>
        <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-1.5">
          <div
            className="bg-accent-blue h-1.5 rounded-full transition-all duration-standard ease-smooth"
            style={{
              width: `${((currentStep > 2.5 ? Math.floor(currentStep) : currentStep) / totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}
    </Modal>
  );
}
