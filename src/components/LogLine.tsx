import dayjs from "dayjs";
import React, { useContext, useState, useRef } from "react";
import styled from "styled-components";
import { useChannels } from "../hooks/useChannels";
import { useThirdPartyEmotes } from "../hooks/useThirdPartyEmotes";
import { useChannelColor } from "../hooks/useChannelColor";
import { store } from "../store";
import { LogMessage } from "../types/log";
import { Message } from "./Message";
import { User } from "./User";
import { ChannelCard } from "./ChannelCard";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.guess();

const LogLineContainer = styled.li`
  display: flex;
  align-items: flex-start;
  margin-bottom: 1px;

  .timestamp {
    color: var(--text-dark);
    user-select: none;
    font-family: monospace;
    white-space: nowrap;
    line-height: 1.1rem;
  }

  .timestamp-link {
    color: var(--text-dark);
    user-select: none;
    font-family: monospace;
    white-space: nowrap;
    line-height: 1.1rem;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
      color: var(--theme2, #9147ff);
    }
  }

  .user {
    margin-left: 5px;
    user-select: none;
    font-weight: bold;
    line-height: 1.1rem;
  }

  .message {
    margin-left: 5px;
    line-height: 1.1rem;
  }

  .channel {
    margin-left: 5px;
    font-weight: bold;
    user-select: none;
  }

  .channel-clickable {
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const TWITCH_COLORS = [
  "#FF0000",
  "#0000FF",
  "#008000",
  "#B22222",
  "#FF7F50",
  "#9ACD32",
  "#FF4500",
  "#2E8B57",
  "#DAA520",
  "#D2691E",
  "#5F9EA0",
  "#1E90FF",
  "#FF69B4",
  "#8A2BE2",
  "#00FF7F",
];

function getChannelColor(name: string) {
  if (!name) return "grey";
  let n = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return TWITCH_COLORS[n % TWITCH_COLORS.length];
}

const ChannelSpan = styled.span.attrs((props: { color: string }) => ({
  style: {
    color: props.color,
  },
}))<{ color?: string }>`
  display: inline;
`;

function ClickableChannel({
  channelName,
  channelId,
  color,
}: {
  channelName: string;
  channelId: string;
  color: string;
}) {
  const [showCard, setShowCard] = useState(false);
  const channelRef = useRef<HTMLSpanElement>(null);

  return (
    <span className="channel">
      {" "}
      <ChannelSpan
        ref={channelRef}
        className="channel-clickable"
        color={color}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setShowCard(true);
        }}
      >
        {channelName}
      </ChannelSpan>
      {" ►"}
      {showCard && (
        <ChannelCard
          channelName={channelName}
          channelId={channelId}
          anchorEl={channelRef.current}
          onClose={() => setShowCard(false)}
        />
      )}
    </span>
  );
}

function ClickableTimestamp({
  message,
  channelName,
}: {
  message: LogMessage;
  channelName: string;
}) {
  const { setCurrents } = useContext(store);

  const handleClick = () => {
    const ts = dayjs(message.timestamp);
    const from = ts.subtract(5, "minute").toISOString();
    const to = ts.add(5, "minute").toISOString();

    setCurrents(
      channelName || `id:${message.tags["room-id"]}`,
      null,
      null,
      from,
      to,
    );
  };

  return (
    <span
      className="timestamp-link"
      onClick={handleClick}
      title="View context in channel log"
    >
      {dayjs(message.timestamp).format("YYYY-MM-DD HH:mm:ss")}
    </span>
  );
}

export function LogLine({ message }: { message: LogMessage }) {
  const { state } = useContext(store);
  const channels = useChannels();
  const isGlobal = !state.currentChannel;
  const showChannel = isGlobal && message.tags["room-id"];

  const channelInfo = showChannel
    ? channels.find((c) => c.userID === message.tags["room-id"])
    : null;
  const channelName = channelInfo ? channelInfo.name : message.tags["room-id"];

  const genuineColor = useChannelColor(showChannel ? channelName : undefined);

  if (state.settings.showEmotes.value) {
    return (
      <LogLineWithEmotes
        message={message}
        showChannel={showChannel}
        genuineColor={genuineColor}
      />
    );
  }

  return (
    <LogLineContainer className="logLine">
      {state.settings.showTimestamp.value &&
        (isGlobal && message.tags["room-id"] ? (
          <ClickableTimestamp message={message} channelName={channelName} />
        ) : (
          <span className="timestamp">
            {dayjs(message.timestamp).format("YYYY-MM-DD HH:mm:ss")}
          </span>
        ))}
      {showChannel && (
        <ClickableChannel
          channelName={channelName}
          channelId={message.tags["room-id"]}
          color={genuineColor || getChannelColor(channelName)}
        />
      )}
      {state.settings.showName.value && (
        <User
          displayName={message.displayName}
          color={message.tags["color"]}
          message={message}
        />
      )}
      <Message message={message} thirdPartyEmotes={[]} />
    </LogLineContainer>
  );
}

export function LogLineWithEmotes({
  message,
  showChannel,
  genuineColor,
}: {
  message: LogMessage;
  showChannel: string | false | undefined;
  genuineColor?: string | undefined;
}) {
  const { state } = useContext(store);
  const channels = useChannels();
  const isGlobal = !state.currentChannel;
  const thirdPartyEmotes = useThirdPartyEmotes(message.tags["room-id"]);

  const channelInfo = showChannel
    ? channels.find((c) => c.userID === message.tags["room-id"])
    : null;
  const channelName = channelInfo ? channelInfo.name : message.tags["room-id"];

  const fetchedColor = useChannelColor(showChannel ? channelName : undefined);
  const resolvedColor = genuineColor ?? fetchedColor;

  return (
    <LogLineContainer className="logLine">
      {state.settings.showTimestamp.value &&
        (isGlobal && message.tags["room-id"] ? (
          <ClickableTimestamp message={message} channelName={channelName} />
        ) : (
          <span className="timestamp">
            {dayjs(message.timestamp).format("YYYY-MM-DD HH:mm:ss")}
          </span>
        ))}
      {showChannel && (
        <ClickableChannel
          channelName={channelName}
          channelId={message.tags["room-id"]}
          color={resolvedColor || getChannelColor(channelName)}
        />
      )}
      {state.settings.showName.value && (
        <User
          displayName={message.displayName}
          color={message.tags["color"]}
          message={message}
        />
      )}
      <Message message={message} thirdPartyEmotes={thirdPartyEmotes} />
    </LogLineContainer>
  );
}
