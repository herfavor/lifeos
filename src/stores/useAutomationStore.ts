/**
 * Automation Store
 * Manages automation rules and execution logs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationExecutionLog,
  AutomationTriggerType,
} from '../types/automation';
import { logger } from '../services/logger';
import {
  decodePersistedValue,
  isUnknownRecord,
  toFiniteNumber,
  unwrapPersistedState,
} from '../utils/persistedState';

const log = logger.module('AutomationStore');

function normalizeAutomationAction(value: unknown): AutomationAction | null {
  const decoded = decodePersistedValue(value);
  if (!isUnknownRecord(decoded) || typeof decoded.type !== 'string' || !decoded.type.trim()) {
    return null;
  }
  const configSource = isUnknownRecord(decoded.config)
    ? decoded.config
    : isUnknownRecord(decoded.params)
      ? decoded.params
      : {};
  return {
    type: decoded.type as AutomationAction['type'],
    config: { ...configSource },
    delay: typeof decoded.delay === 'number' && decoded.delay >= 0 ? decoded.delay : undefined,
  };
}

function normalizeAutomationRule(value: unknown, index: number): AutomationRule | null {
  const decoded = decodePersistedValue(value);
  if (!isUnknownRecord(decoded)) return null;

  const triggerSource = isUnknownRecord(decoded.trigger) ? decoded.trigger : {};
  const triggerType =
    typeof triggerSource.type === 'string'
      ? triggerSource.type
      : typeof triggerSource.event === 'string'
        ? triggerSource.event
        : '';
  if (!triggerType) return null;

  const rawActions = Array.isArray(decoded.actions)
    ? decoded.actions
    : decoded.action !== undefined
      ? [decoded.action]
      : [];
  const actions = rawActions
    .map(normalizeAutomationAction)
    .filter((action): action is AutomationAction => action !== null);

  const conditions = Array.isArray(decoded.conditions)
    ? decoded.conditions.filter(isUnknownRecord).map((condition) => ({
        ...condition,
      })) as unknown as AutomationCondition[]
    : [];
  const now = new Date(0).toISOString();

  return {
    id:
      typeof decoded.id === 'string' && decoded.id.trim()
        ? decoded.id
        : `recovered-rule-${index + 1}`,
    name:
      typeof decoded.name === 'string' && decoded.name.trim()
        ? decoded.name
        : `恢复的自动化 ${index + 1}`,
    description: typeof decoded.description === 'string' ? decoded.description : undefined,
    enabled: decoded.enabled !== false,
    trigger: {
      type: triggerType as AutomationTriggerType,
      config: isUnknownRecord(triggerSource.config) ? { ...triggerSource.config } : undefined,
    },
    conditions,
    actions,
    created:
      typeof decoded.created === 'string'
        ? decoded.created
        : typeof decoded.createdAt === 'string'
          ? decoded.createdAt
          : now,
    lastRun: typeof decoded.lastRun === 'string' ? decoded.lastRun : undefined,
    runCount: Math.max(0, toFiniteNumber(decoded.runCount, 0)),
    archivedAt: typeof decoded.archivedAt === 'string' ? decoded.archivedAt : undefined,
    deletedAt: typeof decoded.deletedAt === 'string' ? decoded.deletedAt : undefined,
  };
}

/** Normalize current and legacy automation shapes without dropping valid rules. */
export function normalizeAutomationRules(value: unknown): AutomationRule[] {
  const decoded = decodePersistedValue(value);
  const values = Array.isArray(decoded)
    ? decoded
    : isUnknownRecord(decoded)
      ? Object.values(decoded)
      : [];
  return values
    .map(normalizeAutomationRule)
    .filter((rule): rule is AutomationRule => rule !== null);
}

interface AutomationStore {
  // State
  rules: AutomationRule[];
  executionLogs: AutomationExecutionLog[];
  maxLogsToKeep: number;

  // Actions
  addRule: (rule: Omit<AutomationRule, 'id' | 'created' | 'runCount' | 'enabled'>) => void;
  updateRule: (ruleId: string, updates: Partial<AutomationRule>) => void;
  deleteRule: (ruleId: string) => void;
  archiveRule: (ruleId: string) => void;
  restoreRule: (ruleId: string) => void;
  permanentlyDeleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  getRule: (ruleId: string) => AutomationRule | undefined;
  getRulesByTrigger: (triggerType: AutomationTriggerType) => AutomationRule[];

  // Execution logging
  addExecutionLog: (log: AutomationExecutionLog) => void;
  getExecutionLogs: (ruleId?: string, taskId?: string) => AutomationExecutionLog[];
  clearExecutionLogs: () => void;

  // Utilities
  incrementRunCount: (ruleId: string) => void;
  updateLastRun: (ruleId: string) => void;
}

export const useAutomationStore = create<AutomationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      rules: [],
      executionLogs: [],
      maxLogsToKeep: 1000, // Keep last 1000 execution logs

      // ==================== RULE MANAGEMENT ====================

      addRule: (rule) => {
        const newRule: AutomationRule = {
          ...rule,
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          enabled: true,
          created: new Date().toISOString(),
          runCount: 0,
        };

        set((state) => ({
          rules: [...state.rules, newRule],
        }));

        log.info('Automation rule created', {
          ruleId: newRule.id,
          ruleName: newRule.name,
          triggerType: newRule.trigger.type,
        });
      },

      updateRule: (ruleId, updates) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId ? { ...rule, ...updates } : rule
          ),
        }));

        log.info('Automation rule updated', { ruleId, updates });
      },

      deleteRule: (ruleId) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, enabled: false, deletedAt: new Date().toISOString() }
              : rule
          ),
        }));

        log.info('Automation rule moved to trash', { ruleId });
      },

      archiveRule: (ruleId) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, enabled: false, archivedAt: new Date().toISOString() }
              : rule
          ),
        }));
        log.info('Automation rule archived', { ruleId });
      },

      restoreRule: (ruleId) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId
              ? { ...rule, archivedAt: undefined, deletedAt: undefined }
              : rule
          ),
        }));
        log.info('Automation rule restored', { ruleId });
      },

      permanentlyDeleteRule: (ruleId) => {
        const rule = get().rules.find((item) => item.id === ruleId);
        if (!rule?.deletedAt) return;
        set((state) => ({
          rules: state.rules.filter((item) => item.id !== ruleId),
        }));
        log.info('Automation rule permanently deleted', { ruleId });
      },

      toggleRule: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) {
          log.warn('Rule not found for toggle', { ruleId });
          return;
        }

        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === ruleId ? { ...r, enabled: !r.enabled } : r
          ),
        }));

        log.info('Automation rule toggled', {
          ruleId,
          enabled: !rule.enabled,
        });
      },

      getRule: (ruleId) => {
        return get().rules.find((rule) => rule.id === ruleId);
      },

      getRulesByTrigger: (triggerType) => {
        return get().rules.filter(
          (rule) => rule.enabled && !rule.archivedAt && !rule.deletedAt && rule.trigger.type === triggerType
        );
      },

      // ==================== EXECUTION LOGGING ====================

      addExecutionLog: (executionLog) => {
        set((state) => {
          const logs = [...state.executionLogs, executionLog];

          // Keep only the most recent logs (prevent unbounded growth)
          if (logs.length > state.maxLogsToKeep) {
            logs.splice(0, logs.length - state.maxLogsToKeep);
          }

          return { executionLogs: logs };
        });

        // Update rule metadata if execution was successful
        if (executionLog.success && executionLog.actionsExecuted > 0) {
          get().incrementRunCount(executionLog.ruleId);
          get().updateLastRun(executionLog.ruleId);
        }

        log.debug('Execution log added', {
          ruleId: executionLog.ruleId,
          taskId: executionLog.taskId,
          success: executionLog.success,
        });
      },

      getExecutionLogs: (ruleId?, taskId?) => {
        let logs = get().executionLogs;

        if (ruleId) {
          logs = logs.filter((log) => log.ruleId === ruleId);
        }

        if (taskId) {
          logs = logs.filter((log) => log.taskId === taskId);
        }

        // Return most recent first
        return logs.slice().reverse();
      },

      clearExecutionLogs: () => {
        set({ executionLogs: [] });
        log.info('Execution logs cleared');
      },

      // ==================== UTILITIES ====================

      incrementRunCount: (ruleId) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId ? { ...rule, runCount: rule.runCount + 1 } : rule
          ),
        }));
      },

      updateLastRun: (ruleId) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === ruleId ? { ...rule, lastRun: new Date().toISOString() } : rule
          ),
        }));
      },
    }),
    {
      name: 'automation-store',
      version: 1,
      partialize: (state) => ({
        rules: state.rules,
        // Don't persist execution logs (they'll grow too large)
      }),
      migrate: (persistedState) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        return { rules: normalizeAutomationRules(state.rules) };
      },
      merge: (persistedState, currentState) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        return {
          ...currentState,
          rules: normalizeAutomationRules(state.rules),
          executionLogs: [],
        };
      },
    }
  )
);
