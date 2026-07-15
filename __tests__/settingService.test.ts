import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/settingRepository.js', () => ({
  findSetting: vi.fn(),
  upsertSetting: vi.fn(),
  deleteSetting: vi.fn(),
}));

import { findSetting, upsertSetting } from '../src/repositories/settingRepository.js';
import { saveUserSettings, getBrandColor } from '../src/services/settingService.js';

const mockFindSetting = vi.mocked(findSetting);
const mockUpsertSetting = vi.mocked(upsertSetting);

type SettingRow = Awaited<ReturnType<typeof findSetting>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('settingService.saveUserSettings', () => {
  it('overwrites without merging when merge=false', async () => {
    mockFindSetting.mockResolvedValue({ value: { theme: 'dark', notificationsEnabled: true } } as unknown as SettingRow);

    const result = await saveUserSettings('tenant-1', 'user-1', { theme: 'light' }, false);
    expect(result).toEqual({ theme: 'light' });
    expect(mockUpsertSetting).toHaveBeenCalledWith('tenant-1', 'user-1', 'general', { theme: 'light' });
  });

  it('merges with existing settings when merge=true', async () => {
    mockFindSetting.mockResolvedValue({ value: { theme: 'dark', notificationsEnabled: true } } as unknown as SettingRow);

    const result = await saveUserSettings('tenant-1', 'user-1', { theme: 'light' }, true);
    expect(result).toEqual({ theme: 'light', notificationsEnabled: true });
  });

  it('merges against an empty object when nothing was previously saved', async () => {
    mockFindSetting.mockResolvedValue(null);

    const result = await saveUserSettings('tenant-1', 'user-1', { theme: 'light' }, true);
    expect(result).toEqual({ theme: 'light' });
  });
});

describe('settingService.getBrandColor', () => {
  it('returns the default color for an anonymous (no-tenant) caller', async () => {
    const color = await getBrandColor(null);
    expect(color).toBe('#2563eb');
    expect(mockFindSetting).not.toHaveBeenCalled();
  });

  it('returns the saved tenant brand color when present', async () => {
    mockFindSetting.mockResolvedValue({ value: '#ff0000' } as SettingRow);
    const color = await getBrandColor('tenant-1');
    expect(color).toBe('#ff0000');
  });
});
