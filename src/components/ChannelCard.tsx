import React, { useContext, useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { store } from "../store";

interface ChannelCardProps {
  channelName: string;
  channelId: string;
  clickX: number;
  clickY: number;
  onClose: () => void;
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
  min-width: 240px;
  max-width: 320px;
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    background: #333;
  }

  .card-name {
    font-size: 16px;
    font-weight: bold;
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
`;

export function ChannelCard({
  channelName,
  channelId,
  clickX,
  clickY,
  onClose,
}: ChannelCardProps) {
  const { setCurrents } = useContext(store);
  const cardRef = useRef<HTMLDivElement>(null);
  const [profilePic, setProfilePic] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfilePic() {
      try {
        const res = await fetch(
          `https://api.ivr.fi/v2/twitch/user?id=${channelId}`,
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].logo) {
            setProfilePic(data[0].logo);
          }
        }
      } catch {
        // ignore
      }
    }

    fetchProfilePic();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const cardWidth = 280;
    const cardHeight = 240;

    let top = clickY + 8;
    let left = clickX;

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

  const handleOpenChannelLogs = () => {
    onClose();
    setCurrents(channelName, null, null);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <CardContainer
        ref={cardRef}
        style={{ top: position.top, left: position.left }}
      >
        <div className="card-header">
          {profilePic ? (
            <img className="profile-pic" src={profilePic} alt={channelName} />
          ) : (
            <div className="profile-pic" />
          )}
          <div>
            <div className="card-name">{channelName}</div>
          </div>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">Channel Name</div>
            <div className="card-value">{channelName}</div>
          </div>
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(channelName, "channelName")}
          >
            {copiedField === "channelName" ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="card-row">
          <div>
            <div className="card-label">Channel ID</div>
            <div className="card-value">{channelId}</div>
          </div>
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(channelId, "channelId")}
          >
            {copiedField === "channelId" ? "Copied!" : "Copy"}
          </button>
        </div>

        <button className="action-btn" onClick={handleOpenChannelLogs}>
          Open Channel Logs
        </button>
      </CardContainer>
    </>
  );
}
