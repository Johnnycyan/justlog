import React, { useContext, useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import dayjs from "dayjs";
import { store } from "../store";
import { useChannels } from "../hooks/useChannels";

interface UserCardProps {
  userId: string;
  displayName: string;
  lastTimestamp: Date;
  lastChannelId: string;
  clickX: number;
  clickY: number;
  onClose: () => void;
}

interface PreviousName {
  user_login: string;
  last_timestamp: string;
  first_timestamp: string;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
`;

const CardContainer = styled.div`
  position: fixed;
  z-index: 10000;
  background: var(--bg-bright, #1e1e2e);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 16px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 13px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .profile-pic {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    background: #333;
  }

  .card-name {
    font-size: 16px;
    font-weight: bold;
  }

  .card-subname {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    gap: 8px;
  }

  .card-label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-value {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }

  .copy-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }

  .names-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .names-list {
    max-height: 120px;
    overflow-y: auto;
    margin-top: 4px;
    padding: 0;
    list-style: none;

    li {
      padding: 3px 0;
      font-family: monospace;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .action-btn {
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 8px 16px;
    background: #6441a5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s ease;

    &:hover {
      background: #7b5bb9;
    }
  }

  .loading {
    text-align: center;
    padding: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
`;

export function UserCard({
  userId,
  displayName,
  lastTimestamp,
  lastChannelId,
  clickX,
  clickY,
  onClose,
}: UserCardProps) {
  const { state, setCurrents } = useContext(store);
  const channels = useChannels();
  const cardRef = useRef<HTMLDivElement>(null);
  const [nameHistory, setNameHistory] = useState<PreviousName[]>([]);
  const [profilePic, setProfilePic] = useState<string>("");
  const [currentUsername, setCurrentUsername] = useState<string>(displayName);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const channelInfo = channels.find((c) => c.userID === lastChannelId);
  const lastChannelName = channelInfo ? channelInfo.name : lastChannelId;

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      // Fetch name history
      try {
        const nameRes = await fetch(
          `${state.apiBaseUrl}/namehistory/${userId}`,
        );
        if (nameRes.ok && !cancelled) {
          const names: PreviousName[] = await nameRes.json();
          setNameHistory(names);
        }
      } catch {
        // ignore
      }

      // Fetch current username and profile picture from ivr.fi
      try {
        const profileRes = await fetch(
          `https://api.ivr.fi/v2/twitch/user?id=${userId}`,
        );
        if (profileRes.ok && !cancelled) {
          const data = await profileRes.json();
          if (data && data.length > 0) {
            if (data[0].logo) {
              setProfilePic(data[0].logo);
            }
            if (data[0].login) {
              setCurrentUsername(data[0].displayName || data[0].login);
            }
          }
        }
      } catch {
        // ignore
      }

      if (!cancelled) setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [userId, state.apiBaseUrl]);

  // Position the card near the click coordinates
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const cardWidth = 320;
    const cardHeight = 420;

    let top = clickY + 8;
    let left = clickX;

    // Keep card within viewport
    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 8) left = 8;
    if (top + cardHeight > window.innerHeight) {
      top = clickY - cardHeight - 8;
      if (top < 0) top = 8;
    }

    setPosition({ top, left });
  }, [clickX, clickY]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  const handleViewGlobalMessages = () => {
    onClose();
    // Use the current username from the Twitch API for the search
    setCurrents(null, currentUsername.toLowerCase(), null);
  };

  return ReactDOM.createPortal(
    <>
      <Overlay onClick={onClose} />
      <CardContainer
        ref={cardRef}
        style={{ top: position.top, left: position.left }}
      >
        <div className="card-header">
          {profilePic ? (
            <img
              className="profile-pic"
              src={profilePic}
              alt={currentUsername}
            />
          ) : (
            <div className="profile-pic" />
          )}
          <div>
            <div className="card-name">{currentUsername}</div>
            {currentUsername.toLowerCase() !== displayName.toLowerCase() && (
              <div className="card-subname">Message as: {displayName}</div>
            )}
          </div>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">User ID</div>
            <div className="card-value">{userId}</div>
          </div>
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(userId, "userId")}
          >
            {copiedField === "userId" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">Current Username</div>
            <div className="card-value">{currentUsername}</div>
          </div>
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(currentUsername, "currentName")}
          >
            {copiedField === "currentName" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">Last Message</div>
            <div className="card-value">
              {dayjs(lastTimestamp).format("YYYY-MM-DD HH:mm:ss")}
            </div>
          </div>
          <button
            className="copy-btn"
            onClick={() =>
              copyToClipboard(
                dayjs(lastTimestamp).format("YYYY-MM-DD HH:mm:ss"),
                "lastMessage",
              )
            }
          >
            {copiedField === "lastMessage" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">Last Channel</div>
            <div className="card-value">{lastChannelName}</div>
          </div>
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(lastChannelName, "lastChannel")}
          >
            {copiedField === "lastChannel" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="names-section">
          <div className="card-label">Previous Usernames</div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : nameHistory.length > 0 ? (
            <ul className="names-list">
              {nameHistory.map((name, i) => (
                <li key={i}>
                  <span>{name.user_login}</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyToClipboard(name.user_login, `name-${i}`)
                    }
                  >
                    {copiedField === `name-${i}` ? "Copied!" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="loading">No previous names found</div>
          )}
        </div>

        <button className="action-btn" onClick={handleViewGlobalMessages}>
          View Global Messages
        </button>
      </CardContainer>
    </>,
    document.body,
  );
}
