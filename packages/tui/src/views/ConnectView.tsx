import type { AppState } from "@tstui/core";
import type { ThemeTokens } from "../theme.js";

export type ConnectViewProps = {
  readonly state: AppState;
  readonly theme: ThemeTokens;
};
export const ConnectView = (props: ConnectViewProps) => (
  <box border borderColor={props.theme.accent} padding={1} height={3}>
    <text fg={props.theme.text}>
      Server: {props.state.server?.name ?? "not connected"}
    </text>
  </box>
);
