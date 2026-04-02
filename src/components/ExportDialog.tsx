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

type ExportFormat = "txt" | "json" | "ndjson" | "yaml";
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
  verbosity: Verbosity,
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
  } else if (verbosity === "full") {
    url.searchParams.set("json", "1");
  } else {
    // basic and minimal both fetch jsonBasic; minimal is trimmed client-side
    url.searchParams.set("jsonBasic", "1");
  }

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
    displayName: msg.displayName,
    text: msg.text,
  }));
}

const VERBOSITY_HINTS: Record<Verbosity, string> = {
  minimal: "Timestamp, display name, and message text only",
  basic: "Text, display name, timestamp, message ID, and tags",
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

  const hasTarget = !!(state.currentChannel || state.currentUsername);
  const showVerbosity = format !== "txt";

  const handleExport = async () => {
    if (!from || !to) return;

    const url = buildExportUrl(
      state.apiBaseUrl,
      state.currentChannel,
      state.currentUsername,
      from,
      to,
      format,
      verbosity,
    );
    if (!url) return;

    const ch = state.currentChannel || "all";
    const us = state.currentUsername ? `_${state.currentUsername}` : "";
    const dateTag = `${from.slice(0, 10)}_to_${to.slice(0, 10)}`;
    const baseFilename = `logs_${ch}${us}_${dateTag}`;

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
          // NDJSON: each line is a JSON object, filter fields client-side
          const lines = text.trim().split("\n").filter(Boolean);
          content =
            lines
              .map((line) => {
                const obj = JSON.parse(line);
                if (verbosity === "minimal") {
                  return JSON.stringify({
                    timestamp: obj.timestamp,
                    displayName: obj.displayName,
                    text: obj.text,
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
              <MenuItem value="json">JSON (.json)</MenuItem>
              <MenuItem value="ndjson">NDJSON (.ndjson)</MenuItem>
              <MenuItem value="yaml">YAML (.yaml)</MenuItem>
            </Select>
          </FormControl>
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
