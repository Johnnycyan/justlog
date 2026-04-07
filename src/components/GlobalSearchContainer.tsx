import React, { CSSProperties, useContext } from "react";
import styled from "styled-components";
import { useGlobalSearch, GlobalSearchFilters } from "../hooks/useGlobalSearch";
import { useChannels } from "../hooks/useChannels";
import { isUserId, getUserId } from "../services/isUserId";
import { store } from "../store";
import { LogLine } from "./LogLine";
import { FixedSizeList as List } from "react-window";
import { CircularProgress } from "@mui/material";

const GlobalSearchWrapper = styled.div`
  color: white;
  padding: 2rem;
  padding-top: 0;
  width: 100%;
`;

const ContentLogContainer = styled.ul`
  padding: 0;
  margin: 0;
  position: relative;
  background: var(--bg-bright);
  border-radius: 3px;
  padding: 0.5rem;
  margin-top: 2rem;

  .logLine {
    white-space: nowrap;
  }

  .list {
    scrollbar-color: dark;
  }

  .loading {
    padding: 2rem;
    text-align: center;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-dark);
  }

  .filter-info {
    padding: 0.5rem 1rem;
    color: var(--text-dark);
    font-size: 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 0.5rem;
  }
`;

export function GlobalSearchContainer({ query }: { query: string }) {
  const { state } = useContext(store);
  const channels = useChannels();

  // Resolve channel/username to IDs for filtering
  const filters: GlobalSearchFilters = {};
  if (state.currentChannel) {
    if (isUserId(state.currentChannel)) {
      filters.channelId = getUserId(state.currentChannel);
    } else {
      const ch = channels.find(
        (c) => c.name.toLowerCase() === state.currentChannel!.toLowerCase(),
      );
      if (ch) {
        filters.channelId = ch.userID;
      }
    }
  }
  if (state.currentUsername) {
    if (isUserId(state.currentUsername)) {
      filters.userId = getUserId(state.currentUsername);
    }
    // Note: filtering by username string isn't reliable since tags use user-id.
    // If the user typed a name (not id:), we skip user filtering and show all results.
  }

  const [logs, isFetching] = useGlobalSearch(query, filters);

  const hasFilters = !!(state.currentChannel || state.currentUsername);
  const filterLabel = [
    state.currentChannel ? `#${state.currentChannel}` : null,
    state.currentUsername ? `@${state.currentUsername}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <LogLine
        key={logs[index].id ? logs[index].id : index}
        message={logs[index]}
      />
    </div>
  );

  return (
    <GlobalSearchWrapper>
      <ContentLogContainer>
        {isFetching && (
          <div className="loading">
            <CircularProgress />
          </div>
        )}

        {!isFetching && hasFilters && (
          <div className="filter-info">
            Searching for &quot;{query}&quot; in {filterLabel}
          </div>
        )}

        {!isFetching && logs.length === 0 && (
          <div className="empty">No results found for &quot;{query}&quot;</div>
        )}

        {!isFetching && logs.length > 0 && (
          <List
            className="list"
            height={800}
            itemCount={logs.length}
            itemSize={20}
            width={"100%"}
          >
            {Row}
          </List>
        )}
      </ContentLogContainer>
    </GlobalSearchWrapper>
  );
}
