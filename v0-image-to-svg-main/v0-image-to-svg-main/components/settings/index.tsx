"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Settings, Props } from "./types"
import { Cog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function SettingsPanel({ className }: Props) {
  const [settings, setSettings] = useState<Settings>({
    mode: "production",
    isTest: true,
  })

  const handleModeChange = (value: "production" | "preview") => {
    setSettings((prev) => ({ ...prev, mode: value }))
  }

  const handleTestChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, isTest: checked }))
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Cog className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">API Settings</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mode">Mode</Label>
                <RadioGroup
                  id="mode"
                  value={settings.mode}
                  onValueChange={handleModeChange as (value: string) => void}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="production" id="production" />
                    <Label htmlFor="production">Production</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="preview" id="preview" />
                    <Label htmlFor="preview">Preview</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="test-mode" checked={settings.isTest} onCheckedChange={handleTestChange} />
                <Label htmlFor="test-mode">Test Mode</Label>
              </div>

              <div className="text-xs text-muted-foreground">
                Current API mode: <span className="font-mono">{getApiMode(settings)}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function getApiMode(settings: Settings): string {
  if (settings.isTest) {
    return settings.mode === "production" ? "test" : "test_preview"
  }
  return settings.mode
}
