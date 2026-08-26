import { useEffect, useMemo, useRef, useState } from "react";

type DiagnosticRecord = {
  timestamp: string;
  event: string;
  target: string;
  targetType: string;
  active: string;
  activeId: string;
  valueLength: number | null;
  valuePreview: string;
  inputType?: string;
  dataLength?: number;
  errorMessage?: string;
};

type HeartbeatState = {
  last: string;
  gapMs: number;
};

const MAX_RECORDS = 250;
const PREVIEW_LIMIT = 8;

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function describeTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return { tag: "-", type: "-", id: "-", valueLength: null, preview: "" };
  }

  const input = target instanceof HTMLInputElement ? target : null;
  const textarea = target instanceof HTMLTextAreaElement ? target : null;
  const hasValue = input !== null || textarea !== null;
  const value = hasValue ? (input?.value ?? textarea?.value ?? "") : "";
  const isDiagnosticTarget = target.getAttribute("data-phone-input-diagnostic") === "true";

  return {
    tag: target.tagName,
    type: input?.type ?? (textarea ? "textarea" : target.getAttribute("contenteditable") === "true" ? "contenteditable" : "-"),
    id: target.id || target.getAttribute("name") || "-",
    valueLength: hasValue ? value.length : null,
    preview: isDiagnosticTarget ? value.slice(0, PREVIEW_LIMIT) : "[redacted]",
  };
}

function activeDescription() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return "-";
  return `${active.tagName}${active.id ? `#${active.id}` : active.getAttribute("name") ? `[name=${active.getAttribute("name")}]` : ""}`;
}

export function PhoneInputDiagnostics() {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [heartbeat, setHeartbeat] = useState<HeartbeatState>({ last: nowLabel(), gapMs: 0 });
  const [heartbeatGapDetected, setHeartbeatGapDetected] = useState(false);
  const recordsRef = useRef<DiagnosticRecord[]>([]);

  const append = (record: DiagnosticRecord) => {
    recordsRef.current = [...recordsRef.current, record].slice(-MAX_RECORDS);
    setRecords(recordsRef.current);
  };

  useEffect(() => {
    const recordEvent = (eventName: string, event: Event) => {
      const target = describeTarget(event.target);
      if (target.tag === "-") return;
      const inputEvent = event instanceof InputEvent ? event : null;
      append({
        timestamp: nowLabel(),
        event: eventName,
        target: target.tag,
        targetType: target.type,
        active: activeDescription(),
        activeId: target.id,
        valueLength: target.valueLength,
        valuePreview: target.preview,
        inputType: inputEvent?.inputType,
        dataLength: inputEvent?.data?.length ?? undefined,
      });
    };

    const onFocusIn = (event: FocusEvent) => recordEvent("focusin", event);
    const onBeforeInput = (event: InputEvent) => recordEvent("beforeinput", event);
    const onInput = (event: Event) => recordEvent("input", event);
    const onChange = (event: Event) => recordEvent("change", event);
    const onKeyDown = (event: KeyboardEvent) => recordEvent("keydown", event);
    const onKeyUp = (event: KeyboardEvent) => recordEvent("keyup", event);

    const onError = (event: ErrorEvent) => {
      append({
        timestamp: nowLabel(),
        event: "window error",
        target: "window",
        targetType: "error",
        active: activeDescription(),
        activeId: "-",
        valueLength: null,
        valuePreview: "",
        errorMessage: event.message || "Unknown error",
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unknown rejection");
      append({
        timestamp: nowLabel(),
        event: "unhandledrejection",
        target: "window",
        targetType: "promise",
        active: activeDescription(),
        activeId: "-",
        valueLength: null,
        valuePreview: "",
        errorMessage: reason,
      });
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const current = performance.now();
      const gapMs = Math.max(0, current - lastTick - 1000);
      lastTick = current;
      setHeartbeat({ last: nowLabel(), gapMs });
      if (gapMs >= 2500) {
        setHeartbeatGapDetected(true);
        append({
          timestamp: nowLabel(),
          event: "heartbeat gap",
          target: "window",
          targetType: "timer",
          active: activeDescription(),
          activeId: "-",
          valueLength: null,
          valuePreview: "",
          errorMessage: `Main-thread timer gap: ${Math.round(gapMs)}ms`,
        });
      }
    }, 1000);

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.clearInterval(interval);
    };
  }, []);

  const diagnosticData = useMemo(() => JSON.stringify({ heartbeat, heartbeatGapDetected, records }, null, 2), [heartbeat, heartbeatGapDetected, records]);

  const clearLogs = () => {
    recordsRef.current = [];
    setRecords([]);
    setHeartbeatGapDetected(false);
  };

  const copyData = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticData);
      append({
        timestamp: nowLabel(),
        event: "diagnostic copied",
        target: "window",
        targetType: "clipboard",
        active: activeDescription(),
        activeId: "-",
        valueLength: null,
        valuePreview: "",
      });
    } catch (error) {
      append({
        timestamp: nowLabel(),
        event: "copy failed",
        target: "window",
        targetType: "clipboard",
        active: activeDescription(),
        activeId: "-",
        valueLength: null,
        valuePreview: "",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open input pipeline diagnostics"
        style={{ position: "fixed", right: 12, bottom: 12, zIndex: 2147483646, padding: "8px 10px", borderRadius: 8, border: "1px solid #888", background: "#111", color: "#fff", fontSize: 12 }}
      >
        {open ? "Close diagnostics" : "Input diagnostics"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Input pipeline diagnostics"
          style={{ position: "fixed", inset: "8px", zIndex: 2147483645, overflow: "auto", padding: 12, borderRadius: 10, border: "2px solid #444", background: "#fff", color: "#111", fontFamily: "monospace", fontSize: 12 }}
        >
          <h2 style={{ margin: "0 0 8px" }}>INPUT PIPELINE TEST</h2>
          <div style={{ marginBottom: 8 }}>
            JS heartbeat: {heartbeatGapDetected ? "POSSIBLE JS/RENDERER FREEZE" : "ACTIVE"}
            <br />
            Last heartbeat: {heartbeat.last}
            {heartbeat.gapMs > 0 ? ` (gap ${Math.round(heartbeat.gapMs)}ms)` : ""}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}>Minimal diagnostic text input:</div>
            <input
              data-phone-input-diagnostic="true"
              aria-label="Diagnostic text input"
              type="text"
              autoComplete="off"
              style={{ width: "100%", boxSizing: "border-box", padding: 8, fontSize: 16 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}>Minimal diagnostic textarea:</div>
            <textarea
              data-phone-input-diagnostic="true"
              aria-label="Diagnostic textarea"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: 8, fontSize: 16 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={clearLogs}>Clear Logs</button>
            <button type="button" onClick={() => void copyData()}>Copy Diagnostic Data</button>
          </div>

          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "55vh", overflow: "auto", border: "1px solid #aaa", padding: 8 }}>
            {records.length === 0 ? "No events yet." : records.map((record, index) => (
              <div key={`${record.timestamp}-${index}`} style={{ marginBottom: 8 }}>
                <strong>{record.timestamp} {record.event}</strong>{"\n"}
                target: {record.target} type: {record.targetType} active: {record.active}{"\n"}
                value length: {record.valueLength ?? "-"}{record.valuePreview && record.valuePreview !== "[redacted]" ? ` preview: ${JSON.stringify(record.valuePreview)}` : ""}{"\n"}
                {record.inputType ? `inputType: ${record.inputType}\n` : ""}
                {typeof record.dataLength === "number" ? `data length: ${record.dataLength}\n` : ""}
                {record.errorMessage ? `detail: ${record.errorMessage}\n` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
