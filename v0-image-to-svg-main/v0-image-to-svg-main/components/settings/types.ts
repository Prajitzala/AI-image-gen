export interface Props {
  className?: string
}

export interface Settings {
  mode: "production" | "preview"
  isTest: boolean
}

export type ApiMode = "production" | "preview" | "test" | "test_preview"
