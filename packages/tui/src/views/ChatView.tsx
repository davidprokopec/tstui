import type { AppState, CommandInvocation } from "@tstui/core";
import type { ThemeTokens } from "../theme.js";

export type ChatViewProps = {
  readonly state: AppState;
  readonly theme: ThemeTokens;
  readonly dispatch: (command: CommandInvocation) => void;
};
export const ChatView = (props: ChatViewProps) => {
  const target = (): string => props.state.activeChannelId ?? "";
  const messages = () => props.state.messages[target()] ?? [];
  return (
    <box
      flexDirection="column"
      border
      borderColor={props.theme.muted}
      width="65%"
      padding={1}
    >
      <text fg={props.theme.accent}>
        Chat · {target() === "" ? "no channel" : `#${target()}`}
      </text>
      <scrollbox flexGrow={1}>
        {messages().map((message) => (
          <text fg={props.theme.text}>
            {message.sender}: {message.body}
          </text>
        ))}
      </scrollbox>
      <text fg={props.theme.muted}>Read-only demo transcript</text>
    </box>
  );
};
