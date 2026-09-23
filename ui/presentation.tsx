import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ConversationStagePresentation } from "@modera/plugin-sdk";

const post = (message: unknown) => parent.postMessage(message, "*");
export function mountInterface(
  apply: (value: ConversationStagePresentation) => void,
) {
  const target = document.getElementById("interface");
  if (target) createRoot(target).render(<HomeInterface apply={apply} />);
}
function HomeInterface({
  apply,
}: {
  apply: (value: ConversationStagePresentation) => void;
}) {
  const [data, setData] = useState<ConversationStagePresentation>();
  const [letter, setLetter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const previous = useRef<ConversationStagePresentation | undefined>(undefined);
  const seen = useRef(new Set<string>());
  const log = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== parent || event.data?.type !== "stage:presentation")
        return;
      const next = event.data as ConversationStagePresentation;
      const old = previous.current;
      const changed = !old || old.contextId !== next.contextId;
      const key = `${next.contextId}:${next.completionId}`;
      if (changed) {
        setLetter(null);
        setExpanded(false);
        follow.current = true;
      }
      if (next.completionId && !seen.current.has(key)) {
        seen.current.add(key);
        if (!changed && next.placement === "immersive")
          setLetter(next.completionId);
      }
      if (old?.placement !== next.placement) setLetter(null);
      document.documentElement.classList.add("embedded");
      document.documentElement.classList.toggle(
        "docked",
        next.placement === "sidebar",
      );
      document.documentElement.style.setProperty(
        "--composer-space",
        `${next.composerHeight}px`,
      );
      previous.current = next;
      apply(next);
      setData(next);
    };
    window.addEventListener("message", receive);
    post({ type: "stage:ready" });
    return () => window.removeEventListener("message", receive);
  }, [apply]);
  useEffect(() => {
    post({ type: "stage:modal", open: !!letter });
    if (letter) close.current?.focus();
  }, [letter]);
  useEffect(() => {
    if (follow.current && log.current)
      log.current.scrollTop = log.current.scrollHeight;
  }, [data, expanded]);
  useEffect(() => {
    const section = log.current?.parentElement;
    if (!section) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--activity-height",
        `${section.offsetHeight}px`,
      ),
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [!!data]);
  const dismiss = () => {
    setLetter(null);
    setCopied(false);
    opener.current?.focus();
  };
  useEffect(() => {
    if (letter && data && !data.results.some((item) => item.id === letter))
      setLetter(null);
  }, [data, letter]);
  if (!data) return null;
  const zh = data.locale.startsWith("zh");
  const result = data.results.find((item) => item.id === letter);
  const labels = zh
    ? {
        user: "你",
        thinking: "思考",
        progress: "进展",
        tool: "工作",
        error: "提醒",
      }
    : {
        user: "You",
        thinking: "Thinking",
        progress: "Progress",
        tool: "Work",
        error: "Notice",
      };
  return (
    <>
      <div className="home-actions">
        <button
          ref={opener}
          disabled={!data.results.length}
          onClick={() => setLetter(data.results.at(-1)?.id ?? null)}
        >
          {zh ? "✉ 信箱" : "✉ Letters"}
          {data.results.length ? ` · ${data.results.length}` : ""}
        </button>
        <button
          onClick={() =>
            post({
              type: "stage:placement",
              placement: data.placement === "sidebar" ? "immersive" : "sidebar",
            })
          }
        >
          {data.placement === "sidebar"
            ? zh
              ? "回到小屋"
              : "Open home"
            : zh
              ? "移至侧边栏"
              : "Move to sidebar"}
        </button>
      </div>
      <section
        className={`activity-log${expanded ? " expanded" : ""}`}
        aria-label={zh ? "小屋工作记录" : "Activity"}
      >
        <button
          className="log-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {zh ? "小屋电台 · 工作记录" : "HOME RADIO · ACTIVITY"}{" "}
          {expanded ? "⌄" : "⌃"}
        </button>
        <div
          ref={log}
          className="log-lines"
          tabIndex={0}
          onScroll={() => {
            const el = log.current!;
            follow.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 35;
          }}
        >
          {data.activity.length ? (
            data.activity.map((item) => (
              <p key={item.id} className={`log-${item.kind}`}>
                <span>{labels[item.kind]}</span>
                {item.text}
              </p>
            ))
          ) : (
            <p className="log-empty">
              {zh
                ? "风从洞口吹进来，今天想一起做些什么？"
                : "A little breeze, a new day. What shall we do?"}
            </p>
          )}
        </div>
      </section>
      {letter && result && (
        <div
          className="letter-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
        >
          <article
            className="letter"
            role="dialog"
            aria-modal="true"
            aria-labelledby="letter-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") dismiss();
              if (event.key === "Tab") {
                const elements = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    "button, select, a[href], [tabindex='0']",
                  ),
                );
                const first = elements[0],
                  last = elements.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="letter-heading">
              <div>
                <span className="letter-stamp">L</span>
                <small>{zh ? "来自山丘小屋" : "FROM THE LITTLE HOME"}</small>
                <h2 id="letter-title">
                  {zh ? "卢卡给你的一封信" : "A letter from Luca"}
                </h2>
              </div>
              <button
                ref={close}
                aria-label={zh ? "关闭信件" : "Close letter"}
                onClick={dismiss}
              >
                ×
              </button>
            </div>
            {data.results.length > 1 && (
              <select
                aria-label={zh ? "历史信件" : "Previous letters"}
                value={letter}
                onChange={(event) => {
                  setLetter(event.target.value);
                  setCopied(false);
                }}
              >
                {data.results.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {index + 1} · {item.text.slice(0, 45)}
                  </option>
                ))}
              </select>
            )}
            <div className="letter-content" tabIndex={0}>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, href }) => (
                    <a
                      className="letter-link"
                      href={href}
                      onClick={(event) => {
                        event.preventDefault();
                        if (href && /^https?:\/\//.test(href)) {
                          dismiss();
                          post({ type: "stage:open-link", url: href });
                        }
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {result.text}
              </Markdown>
            </div>
            <footer>
              <span>
                {zh
                  ? "愿你的今天，也有一点小小的收获。"
                  : "A little something for your day."}
              </span>
              <button
                onClick={() => {
                  // Opaque sandbox clipboard APIs are unavailable: select the letter for native copy.
                  const range = document.createRange();
                  range.selectNodeContents(
                    document.querySelector(".letter-content")!,
                  );
                  const selection = getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  const success = document.execCommand("copy");
                  setCopied(success);
                  if (success) selection?.removeAllRanges();
                }}
              >
                {copied ? (zh ? "已复制" : "Copied") : zh ? "复制全文" : "Copy"}
              </button>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}
