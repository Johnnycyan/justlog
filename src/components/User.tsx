import React, { useState, useRef } from "react";
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
  const userRef = useRef<HTMLDivElement>(null);
  const renderColor = color !== "" ? color : "grey";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message) {
      setShowCard(true);
    }
  };

  return (
    <>
      <UserContainer
        ref={userRef}
        color={renderColor}
        className="user"
        onClick={handleClick}
      >
        {displayName}:
      </UserContainer>
      {showCard && message && (
        <UserCard
          userId={message.tags["user-id"] || ""}
          displayName={displayName}
          lastTimestamp={message.timestamp}
          lastChannelId={message.tags["room-id"] || ""}
          anchorEl={userRef.current}
          onClose={() => setShowCard(false)}
        />
      )}
    </>
  );
}
