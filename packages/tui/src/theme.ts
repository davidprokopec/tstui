export interface ThemeTokens {
  readonly background: string;
  readonly panel: string;
  readonly accent: string;
  readonly text: string;
  readonly muted: string;
  readonly danger: string;
}

export const defaultTheme: ThemeTokens = {
  background: "#10141c",
  panel: "#18202b",
  accent: "#7dd3fc",
  text: "#f8fafc",
  muted: "#94a3b8",
  danger: "#fb7185",
};
