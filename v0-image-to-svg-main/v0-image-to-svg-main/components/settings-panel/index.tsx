"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Cog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSettingsStore } from "@/lib/settings-store"
import type { Props } from "./types"

export function SettingsPanel({ className, buttonColor = "orange" }: Props) {
  const { settings, updateSettings, getApiMode } = useSettingsStore()

  const handleModeChange = (value: string) => {
    updateSettings({ mode: value as "production" | "preview" })
  }

  const handleTestChange = (checked: boolean) => {
    updateSettings({ isTest: checked })
  }

  const getButtonBgColor = () => {
    if (buttonColor === "pink") return "bg-pink-300 hover:bg-pink-400"
    if (buttonColor === "purple") return "bg-purple-300 hover:bg-purple-400"
    return "bg-orange-300 hover:bg-orange-400"
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className={`h-10 w-10 ${getButtonBgColor()}`}>
            <Cog className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0)] bg-white dark:bg-gray-800">
          <div className="space-y-4">
            <h4 className="font-black text-lg" style={{ textShadow: "1px 1px 0px #000" }}>
              API Settings
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mode" className="font-bold">
                  Mode
                </Label>
                <RadioGroup
                  id="mode"
                  value={settings.mode}
                  onValueChange={handleModeChange}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="production" id="production" />
                    <Label htmlFor="production" className="font-bold">
                      Production
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="preview" id="preview" />
                    <Label htmlFor="preview" className="font-bold">
                      Preview
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="test-mode" checked={settings.isTest} onCheckedChange={handleTestChange} />
                <Label htmlFor="test-mode" className="font-bold">
                  Test Mode
                </Label>
              </div>

              <div className="text-sm font-bold p-2 bg-yellow-200 dark:bg-yellow-300 text-black border-2 border-black">
                Current API mode: <span className="font-mono">{getApiMode()}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
