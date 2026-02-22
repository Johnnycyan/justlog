import { useQuery } from "react-query";

const colorCache: Record<string, string> = {};

export function useChannelColor(
  channelName: string | undefined,
): string | undefined {
  const { data } = useQuery<string | undefined>(
    ["channelColor", channelName],
    async () => {
      if (!channelName) return undefined;

      if (colorCache[channelName]) {
        return colorCache[channelName];
      }

      try {
        const response = await fetch(
          `https://api.ivr.fi/v2/twitch/user?login=${channelName}`,
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();

        if (data && data.length > 0 && data[0].chatColor) {
          colorCache[channelName] = data[0].chatColor;
          return data[0].chatColor;
        }
      } catch (err) {
        console.error("Failed to fetch channel color", err);
      }
      return undefined;
    },
    {
      staleTime: Infinity, // keep in cache forever
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 2,
    },
  );

  return data;
}
