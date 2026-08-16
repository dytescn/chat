// rout/render_msg.ts
import { user_msg_tpl, assistant_msg_tpl } from "../view/chat_msg.ts";
import type { Tpl } from "@funxdata/pages/tplstype";

const TplToHtml = (globalThis as any)["TplToHtml"] as Tpl;
const marked = (globalThis as any).marked;

export interface Message {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  duration?: string;
}

const getMessageContainer = (): HTMLElement => {
  const parent = document.getElementById("chat-content");
  if (!parent) throw new Error("#chat-content 不存在");

  if (!parent.style.flex) {
    parent.style.flex = "1";
    parent.style.display = "flex";
    parent.style.flexDirection = "column";
    parent.style.overflowY = "auto";
    parent.style.minHeight = "0";
  }

  let container = parent.querySelector(".aui-message-list") as HTMLElement;
  if (!container) {
    container = document.createElement("div");
    container.className = "aui-message-list flex flex-col gap-y-6";
    container.dataset.slot = "aui_message-group";
    parent.appendChild(container);
  }
  return container;
};

// ---------- 滚动到底部（统一入口） ----------
export const scrollChatToBottom = (smooth = false) => {
  const viewport = document.getElementById("chat-scroll-area");
  if (!viewport) return;

  const scroll = () => {
    viewport.scrollTop = viewport.scrollHeight;
  };

  // 多次 rAF 确保布局完成
  requestAnimationFrame(() => {
    scroll();
    requestAnimationFrame(() => {
      scroll();
      // 兜底：万一异步内容（如图片）导致高度变化，延迟再滚一次
      setTimeout(scroll, 100);
    });
  });
};

// ---------- 渲染单条消息 ----------
export const renderMessage = (msg: Message): string => {
  const rawHtml = marked.parse(msg.content);
  const tpl = msg.role === "user" ? user_msg_tpl : assistant_msg_tpl;
  const data = {
    messageId: msg.messageId,
    content: rawHtml || "",
    duration: msg.duration || "",
  };
  return TplToHtml.renderString(tpl, data);
};

// ---------- 批量渲染初始消息 ----------
export const renderInitMessage = (rows: any[]) => {
  const container = getMessageContainer();
  container.innerHTML = "";

  const messages: Message[] = rows.map((row: any) => ({
    role: row.role,
    content: row.content,
    messageId: row.id,
    duration: (() => {
      try {
        const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        return meta?.duration || undefined;
      } catch {
        return undefined;
      }
    })(),
  }));

  messages.forEach((msg) => {
    const html = renderMessage(msg);
    container.insertAdjacentHTML("beforeend", html);
  });

  // 使用统一滚动函数
  scrollChatToBottom();
};

// ---------- 追加消息（新消息） ----------
export const appendMessage = (msg: Message) => {
  const container = getMessageContainer();
  const html = renderMessage(msg);
  container.insertAdjacentHTML("beforeend", html);
  scrollChatToBottom();
};

// ---------- 向前插入（加载更早消息） ----------
export const prependMessage = (msg: Message) => {
  const container = getMessageContainer();
  const viewport = document.getElementById("chat-scroll-area");

  if (!viewport) {
    container.insertAdjacentHTML("afterbegin", renderMessage(msg));
    return;
  }

  const prevScrollHeight = viewport.scrollHeight;
  const prevScrollTop = viewport.scrollTop;

  const html = renderMessage(msg);
  const first = container.firstElementChild;
  if (first) {
    first.insertAdjacentHTML("beforebegin", html);
  } else {
    container.insertAdjacentHTML("afterbegin", html);
  }

  // 调整滚动位置，保持视觉稳定
  requestAnimationFrame(() => {
    const newScrollHeight = viewport.scrollHeight;
    viewport.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
  });
};