import { useContext } from "react";
import { useQuery } from "react-query";
import { OptOutError } from "../errors/OptOutError";
import { getUserId, isUserId } from "../services/isUserId";
import { store } from "../store";

export type AvailableLogs = Array<{ month: string; year: string }>;

export function useAvailableLogs(
  channel: string | null,
  username: string | null,
): [AvailableLogs, Error | undefined] {
  const { state, setState } = useContext(store);

  // @ts-ignore I don't understand this error :)
  const { data } = useQuery<[AvailableLogs, Error | undefined]>(
    ["availableLogs", { channel: channel, username: username }],
    () => {
      if (!channel && !username) {
        return Promise.resolve([[], undefined]);
      }

      const channelIsId = channel ? isUserId(channel) : false;
      const usernameIsId = username ? isUserId(username) : false;

      const queryUrl = new URL(`${state.apiBaseUrl}/list`);

      if (channel) {
        let ch = channel;
        if (channelIsId) ch = getUserId(ch);
        queryUrl.searchParams.append(`channel${channelIsId ? "id" : ""}`, ch);
      }

      if (username) {
        let us = username;
        if (usernameIsId) us = getUserId(us);
        queryUrl.searchParams.append(`user${usernameIsId ? "id" : ""}`, us);
      }

      return fetch(queryUrl.toString())
        .then((response) => {
          if (response.ok) {
            return response;
          }

          setState({ ...state, error: true });

          if (response.status === 403) {
            throw new OptOutError();
          }

          throw Error(response.statusText);
        })
        .then((response) => response.json())
        .then((data: { availableLogs: AvailableLogs }) => [
          data.availableLogs,
          undefined,
        ])
        .catch((err) => {
          return [[], err];
        });
    },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  return (
    (data as [AvailableLogs, Error | undefined] | undefined) ?? [[], undefined]
  );
}
