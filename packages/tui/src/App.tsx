import type { AppState, CommandInvocation } from "@tstui/core";
import { ChatView } from "./views/ChatView.js";
import { ConnectView } from "./views/ConnectView.js";
import { ServerTreeView } from "./views/ServerTreeView.js";
import { StatusBar } from "./views/StatusBar.js";
import { defaultTheme, type ThemeTokens } from "./theme.js";

export type TstuiAppProps = {
  readonly state: AppState;
  readonly dispatch: (command: CommandInvocation) => void;
  readonly theme?: ThemeTokens;
};

export const TstuiApp = (props: TstuiAppProps) => {
  const theme = props.theme ?? defaultTheme;
  return (
    <box
      flexDirection="column"
      backgroundColor={theme.background}
      width="100%"
      height="100%"
    >
      <ConnectView state={props.state} theme={theme} />
      <box flexDirection="row" flexGrow={1}>
        <ServerTreeView state={props.state} theme={theme} />
        <ChatView state={props.state} theme={theme} dispatch={props.dispatch} />
      </box>
      <StatusBar state={props.state} theme={theme} />
    </box>
  );
};
