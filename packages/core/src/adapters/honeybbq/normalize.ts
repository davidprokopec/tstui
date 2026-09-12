import type {
  ChannelInfo,
  ClientInfo,
  TextMessage,
} from "@honeybbq/teamspeak-client";
import type { Channel, ClientEntry, Message } from "../../domain/model.js";

export const normalizeChannel = (channel: ChannelInfo): Channel => ({
  id: channel.id.toString(),
  parentId: channel.parentID.toString(),
  name: channel.name,
});
export const normalizeClient = (client: ClientInfo): ClientEntry => ({
  id: client.id.toString(),
  channelId: client.channelID.toString(),
  nickname: client.nickname,
});
export const normalizeMessage = (
  message: TextMessage,
  id: string,
  timestamp: number,
): Message => ({
  id,
  targetId: message.targetID.toString(),
  sender: message.invokerName,
  body: message.message,
  timestamp,
});
