import type { AppState } from "@tstui/core";
import type { ThemeTokens } from "../theme.js";

export type StatusBarProps = {
  readonly state: AppState;
  readonly theme: ThemeTokens;
};
export const StatusBar = (props: StatusBarProps) => (
  <box height={1} backgroundColor={props.theme.panel}>
    <text
      fg={props.state.error === null ? props.theme.muted : props.theme.danger}
    >
      {props.state.error ??
        `${props.state.phase} · focus ${props.state.focus} · transport ${props.state.capabilities.transport} · text ${props.state.capabilities.text} · voice ${props.state.capabilities.voice}`}
    </text>
  </box>
);
