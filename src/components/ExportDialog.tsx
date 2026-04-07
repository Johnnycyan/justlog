import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import React, { useContext, useState } from "react";
import styled from "styled-components";
import { getUserId, isUserId } from "../services/isUserId";
import { store } from "../store";

type ExportFormat = "txt" | "json" | "ndjson" | "yaml" | "html";
type Verbosity = "minimal" | "basic" | "full";

const StyledDialogContent = styled(DialogContent)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 360px;
  padding-top: 16px !important;
`;

const VerbosityHint = styled(Typography)`
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px !important;
  margin-top: -8px !important;
`;

function toYaml(obj: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return pad + "null\n";
  if (typeof obj === "string") {
    if (obj.includes("\n") || obj.includes(":") || obj.includes("#")) {
      return `"${obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\n`;
    }
    return `${obj}\n`;
  }
  if (typeof obj === "number" || typeof obj === "boolean") return `${obj}\n`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]\n";
    let result = "\n";
    for (const item of obj) {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item);
        result += `${pad}- ${entries[0][0]}: ${toYaml(entries[0][1], 0)}`;
        for (let i = 1; i < entries.length; i++) {
          result += `${pad}  ${entries[i][0]}: ${toYaml(entries[i][1], indent + 2)}`;
        }
      } else {
        result += `${pad}- ${toYaml(item, indent + 1)}`;
      }
    }
    return result;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}\n";
    let result = "\n";
    for (const [key, value] of entries) {
      if (
        typeof value === "object" &&
        value !== null &&
        (Array.isArray(value) || Object.keys(value).length > 0)
      ) {
        result += `${pad}${key}:${toYaml(value, indent + 1)}`;
      } else {
        result += `${pad}${key}: ${toYaml(value, indent + 1)}`;
      }
    }
    return result;
  }
  return `${obj}\n`;
}

function buildExportUrl(
  apiBaseUrl: string,
  channel: string | null,
  username: string | null,
  from: string,
  to: string,
  format: ExportFormat,
): string {
  if (!channel && !username) return "";

  let path = apiBaseUrl;

  const channelIsId = channel ? isUserId(channel) : false;
  const usernameIsId = username ? isUserId(username) : false;

  if (channel && !username) {
    const ch = channelIsId ? getUserId(channel) : channel;
    path += `/${channelIsId ? "channelid" : "channel"}/${ch}`;
  } else if (channel && username) {
    const ch = channelIsId ? getUserId(channel) : channel;
    path += `/${channelIsId ? "channelid" : "channel"}/${ch}`;
    const us = usernameIsId ? getUserId(username) : username;
    path += `/${usernameIsId ? "userid" : "user"}/${us}`;
  } else if (username && !channel) {
    const us = usernameIsId ? getUserId(username) : username;
    path += `/global/users/${usernameIsId ? "userid" : "user"}/${us}/all`;
  }

  const url = new URL(path);
  url.searchParams.set("from", new Date(from).toISOString());
  url.searchParams.set("to", new Date(to).toISOString());

  if (format === "txt") {
    // plain text, no json param needed
  } else if (format === "ndjson") {
    url.searchParams.set("ndjson", "1");
  } else {
    url.searchParams.set("json", "1");
  }

  return url.toString();
}

function buildSearchExportUrl(
  apiBaseUrl: string,
  query: string,
  from: string,
  to: string,
): string {
  const url = new URL(`${apiBaseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("json", "1");
  url.searchParams.set("from", new Date(from).toISOString());
  url.searchParams.set("to", new Date(to).toISOString());
  return url.toString();
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripToMinimal(
  messages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return messages.map((msg) => ({
    timestamp: msg.timestamp,
    channel: msg.channel,
    displayName: msg.displayName,
    text: msg.text,
  }));
}

function stripToBasic(
  messages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return messages.map((msg) => ({
    text: msg.text,
    channel: msg.channel,
    displayName: msg.displayName,
    timestamp: msg.timestamp,
    id: msg.id,
    tags: msg.tags,
  }));
}

const VERBOSITY_HINTS: Record<Verbosity, string> = {
  minimal: "Timestamp, channel, display name, and message text only",
  basic: "Text, channel, display name, timestamp, message ID, and tags",
  full: "Everything including raw IRC, username, channel, and message type",
};

function getDefaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return formatDatetimeLocal(d);
}

function getDefaultTo(): string {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return formatDatetimeLocal(d);
}

function formatDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoFromLocal(val: string | null): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    return formatDatetimeLocal(d);
  } catch {
    return "";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ParsedEmote {
  id: string;
  startIndex: number;
  endIndex: number;
}

function parseEmotesFromTag(emotesTag: string | undefined): ParsedEmote[] {
  if (!emotesTag) return [];
  const parsed: ParsedEmote[] = [];
  const groups = emotesTag.split("/");
  for (const group of groups) {
    const [id, positions] = group.split(":");
    if (!positions) continue;
    for (const pos of positions.split(",")) {
      const [start, end] = pos.split("-");
      parsed.push({
        id,
        startIndex: Number(start),
        endIndex: Number(end) + 1,
      });
    }
  }
  parsed.sort((a, b) => a.startIndex - b.startIndex);
  return parsed;
}

function renderMessageHtml(text: string, emotes: ParsedEmote[]): string {
  if (emotes.length === 0) return escapeHtml(text);

  // Use Array.from to handle multi-byte characters correctly
  const chars = Array.from(text);
  let result = "";
  let charIndex = 0;

  for (const emote of emotes) {
    // Add text before this emote
    if (charIndex < emote.startIndex) {
      result += escapeHtml(chars.slice(charIndex, emote.startIndex).join(""));
    }
    const emoteText = chars.slice(emote.startIndex, emote.endIndex).join("");
    result += `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${escapeHtml(emote.id)}/default/dark/1.0" alt="${escapeHtml(emoteText)}" title="${escapeHtml(emoteText)}">`;
    charIndex = emote.endIndex;
  }

  // Add remaining text
  if (charIndex < chars.length) {
    result += escapeHtml(chars.slice(charIndex).join(""));
  }

  return result;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return ts;
  }
}

function buildThemedHtml(
  messages: Array<Record<string, unknown>>,
  title: string,
): string {
  const lines = messages
    .map((msg) => {
      const tags = (msg.tags as Record<string, string>) || {};
      const color = tags["color"] || "#FFFFFF";
      const displayName = escapeHtml(String(msg.displayName || ""));
      const timestamp = formatTimestamp(String(msg.timestamp || ""));
      const channel = msg.channel ? escapeHtml(String(msg.channel)) : null;

      const emotes = parseEmotesFromTag(tags["emotes"]);
      const messageHtml = renderMessageHtml(String(msg.text || ""), emotes);

      const channelHtml = channel
        ? `<span class="channel">#${channel}</span> `
        : "";

      return `<div class="msg"><span class="ts">${escapeHtml(timestamp)}</span> ${channelHtml}<span class="user" style="color:${escapeHtml(color)}">${displayName}</span><span class="sep">:</span> <span class="text">${messageHtml}</span></div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0e0e10;
    color: #efeff1;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    padding: 0;
  }
  .header {
    background: #18181b;
    border-bottom: 1px solid #2f2f35;
    padding: 16px 24px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 600;
    color: #efeff1;
  }
  .header .meta {
    font-size: 12px;
    color: #adadb8;
    margin-top: 4px;
  }
  .messages {
    padding: 8px 16px;
  }
  .msg {
    padding: 2px 8px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .msg:hover {
    background: #26262c;
  }
  .ts {
    color: #7a7a85;
    font-family: 'Cascadia Code', 'Consolas', monospace;
    font-size: 12px;
    user-select: none;
    margin-right: 6px;
  }
  .channel {
    color: #bf94ff;
    font-weight: 600;
    margin-right: 4px;
  }
  .user {
    font-weight: 700;
    cursor: default;
  }
  .sep {
    color: #7a7a85;
    margin-right: 4px;
  }
  .text {
    color: #efeff1;
  }
  .text a {
    color: #bf94ff;
    text-decoration: none;
  }
  .text a:hover {
    text-decoration: underline;
  }
  img.emote {
    max-height: 20px;
    width: auto;
    margin: 0 2px;
    vertical-align: middle;
  }
</style>
</head>
<body>
<div class="header">
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${messages.length.toLocaleString()} messages &middot; Exported ${escapeHtml(new Date().toISOString())}</div>
</div>
<div class="messages">
${lines}
</div>
</body>
</html>`;
}

export function ExportDialog() {
  const { state } = useContext(store);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("txt");
  const [verbosity, setVerbosity] = useState<Verbosity>("basic");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleOpen = () => {
    setFrom(isoFromLocal(state.timeFrom) || getDefaultFrom());
    setTo(isoFromLocal(state.timeTo) || getDefaultTo());
    setOpen(true);
  };

  const hasTarget = !!(
    state.currentChannel ||
    state.currentUsername ||
    state.currentSearchQuery
  );
  const isSearchExport =
    !!state.currentSearchQuery &&
    !state.currentChannel &&
    !state.currentUsername;
  const showVerbosity = format !== "txt" && format !== "html";

  const handleExport = async () => {
    if (!from || !to) return;

    const ch = state.currentChannel || "all";
    const us = state.currentUsername ? `_${state.currentUsername}` : "";
    const sq = state.currentSearchQuery
      ? `_search_${state.currentSearchQuery.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`
      : "";
    const dateTag = `${from.slice(0, 10)}_to_${to.slice(0, 10)}`;
    const baseFilename = `logs_${ch}${us}${sq}_${dateTag}`;

    // HTML export always fetches JSON data and renders client-side
    if (format === "html") {
      setExporting(true);
      try {
        let url: string;
        if (isSearchExport) {
          url = buildSearchExportUrl(
            state.apiBaseUrl,
            state.currentSearchQuery!,
            from,
            to,
          );
        } else {
          url = buildExportUrl(
            state.apiBaseUrl,
            state.currentChannel,
            state.currentUsername,
            from,
            to,
            "json",
          );
        }
        if (!url) return;

        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        const messages = data.messages ?? data;

        const titleParts = [];
        if (state.currentChannel) titleParts.push(`#${state.currentChannel}`);
        if (state.currentUsername) titleParts.push(`@${state.currentUsername}`);
        if (state.currentSearchQuery)
          titleParts.push(`Search: "${state.currentSearchQuery}"`);
        const title = titleParts.join(" / ") || "Log Export";

        const html = buildThemedHtml(messages, title);
        triggerDownload(html, `${baseFilename}.html`, "text/html");
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(false);
        setOpen(false);
      }
      return;
    }

    // Search-based export (non-HTML)
    if (isSearchExport) {
      const url = buildSearchExportUrl(
        state.apiBaseUrl,
        state.currentSearchQuery!,
        from,
        to,
      );

      if (format === "txt") {
        // For search TXT, fetch JSON data and format as plain text
        setExporting(true);
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(response.statusText);
          const data = await response.json();
          const messages: Array<Record<string, unknown>> =
            data.messages ?? data;
          const content = messages
            .map(
              (msg) =>
                `[${msg.timestamp}] ${msg.channel ? `#${msg.channel} ` : ""}${msg.displayName}: ${msg.text}`,
            )
            .join("\n");
          triggerDownload(content, `${baseFilename}.txt`, "text/plain");
        } catch (err) {
          console.error("Export failed:", err);
        } finally {
          setExporting(false);
          setOpen(false);
        }
        return;
      }

      // JSON-based search export
      setExporting(true);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        let messages = data.messages ?? data;

        if (verbosity === "minimal" && Array.isArray(messages)) {
          messages = stripToMinimal(messages);
        } else if (verbosity === "basic" && Array.isArray(messages)) {
          messages = stripToBasic(messages);
        }

        const exportData = data.messages ? { messages } : messages;
        let content: string;
        let ext: string;
        let mime: string;

        if (format === "ndjson") {
          content =
            (Array.isArray(messages) ? messages : [messages])
              .map((m: unknown) => JSON.stringify(m))
              .join("\n") + "\n";
          ext = "ndjson";
          mime = "application/x-ndjson";
        } else if (format === "yaml") {
          content = toYaml(exportData).trimStart();
          ext = "yaml";
          mime = "text/yaml";
        } else {
          content = JSON.stringify(exportData, null, 2);
          ext = "json";
          mime = "application/json";
        }

        triggerDownload(content, `${baseFilename}.${ext}`, mime);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(false);
        setOpen(false);
      }
      return;
    }

    // Channel/user export (original behavior)
    const url = buildExportUrl(
      state.apiBaseUrl,
      state.currentChannel,
      state.currentUsername,
      from,
      to,
      format,
    );
    if (!url) return;

    if (format === "txt") {
      window.open(url, "_blank", "noopener,noreferrer");
      setOpen(false);
      return;
    }

    setExporting(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(response.statusText);

      if (format === "ndjson") {
        const text = await response.text();
        let content = text;

        if (verbosity === "minimal" || verbosity === "basic") {
          const lines = text.trim().split("\n").filter(Boolean);
          content =
            lines
              .map((line) => {
                const obj = JSON.parse(line);
                if (verbosity === "minimal") {
                  return JSON.stringify({
                    timestamp: obj.timestamp,
                    channel: obj.channel,
                    displayName: obj.displayName,
                    text: obj.text,
                  });
                }
                if (verbosity === "basic") {
                  return JSON.stringify({
                    text: obj.text,
                    channel: obj.channel,
                    displayName: obj.displayName,
                    timestamp: obj.timestamp,
                    id: obj.id,
                    tags: obj.tags,
                  });
                }
                return line;
              })
              .join("\n") + "\n";
        }

        triggerDownload(
          content,
          `${baseFilename}.ndjson`,
          "application/x-ndjson",
        );
      } else {
        const data = await response.json();
        let messages = data.messages ?? data;

        if (verbosity === "minimal" && Array.isArray(messages)) {
          messages = stripToMinimal(messages);
        } else if (verbosity === "basic" && Array.isArray(messages)) {
          messages = stripToBasic(messages);
        }

        const exportData = data.messages ? { messages } : messages;

        let content: string;
        let ext: string;
        let mime: string;

        if (format === "yaml") {
          content = toYaml(exportData).trimStart();
          ext = "yaml";
          mime = "text/yaml";
        } else {
          content = JSON.stringify(exportData, null, 2);
          ext = "json";
          mime = "application/json";
        }

        triggerDownload(content, `${baseFilename}.${ext}`, mime);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        size="large"
        startIcon={<Download />}
        onClick={handleOpen}
        disabled={!hasTarget}
      >
        Export
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Export Logs</DialogTitle>
        <StyledDialogContent>
          {isSearchExport && (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Exporting search results for &quot;{state.currentSearchQuery}
              &quot;
            </Typography>
          )}
          <TextField
            label="From"
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="To"
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <MenuItem value="txt">Plain Text (.txt)</MenuItem>
              <MenuItem value="html">Themed HTML (.html)</MenuItem>
              <MenuItem value="json">JSON (.json)</MenuItem>
              <MenuItem value="ndjson">NDJSON (.ndjson)</MenuItem>
              <MenuItem value="yaml">YAML (.yaml)</MenuItem>
            </Select>
          </FormControl>
          {format === "html" && (
            <VerbosityHint variant="body2">
              Self-contained HTML file with Twitch-themed styling, emotes, and
              user colors
            </VerbosityHint>
          )}
          {showVerbosity && (
            <>
              <FormControl fullWidth>
                <InputLabel>Detail Level</InputLabel>
                <Select
                  value={verbosity}
                  label="Detail Level"
                  onChange={(e) => setVerbosity(e.target.value as Verbosity)}
                >
                  <MenuItem value="minimal">Minimal</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="full">Full</MenuItem>
                </Select>
              </FormControl>
              <VerbosityHint variant="body2">
                {VERBOSITY_HINTS[verbosity]}
              </VerbosityHint>
            </>
          )}
        </StyledDialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={!from || !to || exporting}
          >
            {exporting ? "Exporting..." : "Download"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
