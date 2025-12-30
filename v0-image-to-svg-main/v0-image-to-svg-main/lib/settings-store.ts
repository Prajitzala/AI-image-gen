import { create } from "zustand"
import type { Settings, ApiMode } from "@/components/settings/types"

interface SettingsStore {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
  getApiMode: () => ApiMode
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    mode: "production",
    isTest: true,
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  getApiMode: () => {
    const { settings } = get()
    if (settings.isTest) {
      return settings.mode === "production" ? "test" : "test_preview"
    }
    return settings.mode as ApiMode
  },
}))
