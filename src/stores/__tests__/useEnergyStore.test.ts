import { beforeEach, describe, expect, it } from 'vitest';
import { useEnergyStore } from '../useEnergyStore';

describe('useEnergyStore record lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    useEnergyStore.setState({ logs: [] });
  });

  it('allows a record to be corrected without changing its identity or timestamp', () => {
    useEnergyStore.getState().logEnergy(4, 'morning', '原备注');
    const original = useEnergyStore.getState().logs[0];

    useEnergyStore.getState().updateLog(original.id, {
      level: 8,
      timeOfDay: 'afternoon',
      note: '  已修正  ',
    });

    expect(useEnergyStore.getState().logs[0]).toMatchObject({
      id: original.id,
      timestamp: original.timestamp,
      level: 8,
      timeOfDay: 'afternoon',
      note: '已修正',
    });
  });

  it('clamps corrected levels and can delete the sample', () => {
    useEnergyStore.getState().logEnergy(5, 'evening');
    const id = useEnergyStore.getState().logs[0].id;

    useEnergyStore.getState().updateLog(id, { level: 99, timeOfDay: 'evening' });
    expect(useEnergyStore.getState().logs[0].level).toBe(10);

    useEnergyStore.getState().deleteLog(id);
    expect(useEnergyStore.getState().logs).toEqual([]);
  });
});
