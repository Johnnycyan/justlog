import { useContext } from "react";
import { useQuery } from "react-query";
import { getUserId, isUserId } from "../services/isUserId";
import { store } from "../store";
import { Emote, LogMessage, UserLogResponse } from "../types/log";
import runes from "runes";

export function useLog(
  channel: string,
  username: string,
  year: string,
  month: string,
): Array<LogMessage> {
  const { state } = useContext(store);

  const { data } = useQuery<Array<LogMessage>>(
    [
      "log",
      {
        channel: channel,
        username: username,
        year: year,
        month: month,
        from: state.timeFrom,
        to: state.timeTo,
      },
    ],
    () => {
      if (channel || username) {
        const channelIsId = channel ? isUserId(channel) : false;
        const usernameIsId = username ? isUserId(username) : false;

        let queryUrlStr = `${state.apiBaseUrl}`;

        if (channel && !username) {
          const ch = channelIsId ? getUserId(channel) : channel;
          queryUrlStr += `/global/channels/${channelIsId ? "channelid" : "channel"}/${ch}`;
        } else if (channel && username) {
          const ch = channelIsId ? getUserId(channel) : channel;
          queryUrlStr += `/${channelIsId ? "channelid" : "channel"}/${ch}`;
        }

        if (username && !channel) {
          const us = usernameIsId ? getUserId(username) : username;
          queryUrlStr += `/global/users/${usernameIsId ? "userid" : "user"}/${us}`;
        } else if (username && channel) {
          const us = usernameIsId ? getUserId(username) : username;
          queryUrlStr += `/${usernameIsId ? "userid" : "user"}/${us}`;
        }

        // If time range is set, use range query params instead of year/month path
        if (state.timeFrom && state.timeTo) {
          // Don't append year/month path, use from/to params instead
        } else {
          queryUrlStr += `/${year}/${month}`;
        }
        const queryUrl = new URL(queryUrlStr);
        queryUrl.searchParams.append("jsonBasic", "1");
        if (!state.settings.newOnBottom.value) {
          queryUrl.searchParams.append("reverse", "1");
        }

        if (state.timeFrom) {
          queryUrl.searchParams.append("from", state.timeFrom);
        }
        if (state.timeTo) {
          queryUrl.searchParams.append("to", state.timeTo);
        }

        return fetch(queryUrl.toString())
          .then((response) => {
            if (response.ok) {
              return response;
            }

            throw Error(response.statusText);
          })
          .then((response) => response.json())
          .then((data: UserLogResponse) => {
            const messages: Array<LogMessage> = [];

            for (const msg of data.messages) {
              messages.push({
                ...msg,
                timestamp: new Date(msg.timestamp),
                emotes: parseEmotes(msg.text, msg.tags["emotes"]),
              });
            }

            return messages;
          });
      }

      return [];
    },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  return data ?? [];
}

function parseEmotes(
  messageText: string,
  emotes: string | undefined,
): Array<Emote> {
  const parsed: Array<Emote> = [];
  if (!emotes) {
    return parsed;
  }

  const groups = emotes.split("/");

  for (const group of groups) {
    const [id, positions] = group.split(":");
    const positionGroups = positions.split(",");

    for (const positionGroup of positionGroups) {
      const [startPos, endPos] = positionGroup.split("-");

      const startIndex = Number(startPos);
      const endIndex = Number(endPos) + 1;

      parsed.push({
        id,
        startIndex: startIndex,
        endIndex: endIndex,
        code: runes.substr(messageText, startIndex, endIndex - startIndex + 1),
      });
    }
  }

  return parsed;
}
