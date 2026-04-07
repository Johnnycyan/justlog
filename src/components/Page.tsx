import React, { useContext } from "react";
import styled from "styled-components";
import { store } from "../store";
import { Filters } from "./Filters";
import { LogContainer } from "./LogContainer";
import { OptoutPanel } from "./Optout";
import { GlobalSearchContainer } from "./GlobalSearchContainer";

const PageContainer = styled.div``;

export function Page() {
  const { state } = useContext(store);

  const hasSearchQuery = !!state.currentSearchQuery;

  return (
    <PageContainer>
      <Filters />
      {state.showOptout && <OptoutPanel />}
      {hasSearchQuery ? (
        <GlobalSearchContainer query={state.currentSearchQuery!} />
      ) : (
        <LogContainer />
      )}
    </PageContainer>
  );
}
