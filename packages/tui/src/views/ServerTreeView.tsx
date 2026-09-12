import type { AppState } from "@tstui/core";
import type { ThemeTokens } from "../theme.js";

export type ServerTreeViewProps = {
  readonly state: AppState;
  readonly theme: ThemeTokens;
};
export const ServerTreeView = (props: ServerTreeViewProps) => (
  <box
    flexDirection="column"
    border
    borderColor={props.theme.muted}
    width="35%"
    padding={1}
  >
    <text fg={props.theme.accent}>Channels</text>
    {props.state.channels.map((channel) => (
      <text
        fg={
          channel.id === props.state.activeChannelId
            ? props.theme.accent
            : props.theme.text
        }
      >
        # {channel.name}
      </text>
    ))}
    <text fg={props.theme.muted}>Clients</text>
    {props.state.clients.map((client) => (
      <text fg={props.theme.text}>· {client.nickname}</text>
    ))}
  </box>
);
