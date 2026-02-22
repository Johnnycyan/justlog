import { useContext, useState } from "react";
import { useQuery } from "react-query";
import { store } from "../store";
import { LogMessage, UserLogResponse } from "../types/log";
import runes from "runes";
import { Emote } from "../types/log";

export function useGlobalSearch(query: string): [Array<LogMessage>, boolean] {
  const { state } = useContext(store);

  const { data, isFetching } = useQuery<Array<LogMessage>>(
    ["search", { query: query }],
    () => {
      if (!query) {
        return Promise.resolve([]);
      }

      const queryUrl = new URL(`${state.apiBaseUrl}/search`);
      queryUrl.searchParams.append("q", query);
      queryUrl.searchParams.append("jsonBasic", "1");

      if (!state.settings.newOnBottom.value) {
        queryUrl.searchParams.append("reverse", "1");
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
    },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  return [data ?? [], isFetching];
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
