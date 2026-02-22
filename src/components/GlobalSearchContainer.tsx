import React, { CSSProperties } from "react";
import styled from "styled-components";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
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
`;

export function GlobalSearchContainer({ query }: { query: string }) {
  const [logs, isFetching] = useGlobalSearch(query);

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

        {!isFetching && logs.length === 0 && (
          <div className="empty">No results found for "{query}"</div>
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
