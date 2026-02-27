import React, { useState } from "react";
import styled from "styled-components";
import { LogMessage } from "../types/log";
import { UserCard } from "./UserCard";

const UserContainer = styled.div.attrs((props) => ({
  style: {
    color: props.color,
  },
}))`
  display: inline;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export function User({
  displayName,
  color,
  message,
}: {
  displayName: string;
  color: string;
  message?: LogMessage;
}): JSX.Element {
  const [showCard, setShowCard] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const renderColor = color !== "" ? color : "grey";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message) {
      setClickPos({ x: e.clientX, y: e.clientY });
      setShowCard(true);
    }
  };

  return (
    <>
      <UserContainer color={renderColor} className="user" onClick={handleClick}>
        {displayName}:
      </UserContainer>
      {showCard && message && (
        <UserCard
          userId={message.tags["user-id"] || ""}
          displayName={displayName}
          lastTimestamp={message.timestamp}
          lastChannelId={message.tags["room-id"] || ""}
          clickX={clickPos.x}
          clickY={clickPos.y}
          onClose={() => setShowCard(false)}
        />
      )}
    </>
  );
}
