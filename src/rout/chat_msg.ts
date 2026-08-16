// rout/chat_msg.ts
import { renderInitMessage, prependMessage, scrollChatToBottom } from "./render_msg.ts";
import { getMessagesBySessionWithLimit } from "../apis/messages.ts";
import type { Message } from "./render_msg.ts";

export const chat_msg_init = async (uid: string) => {
  if (!uid) return null;

  // 使用实际的滚动容器
  const viewport = document.getElementById("chat-scroll-area") as HTMLElement;
  if (!viewport) {
    console.warn("[chat_msg_init] #chat-scroll-area 不存在（可能为新对话）");
    return null;
  }

  let isLoadingMore = false;
  let oldestCreatedAt: string | undefined = undefined;
  const limit = 10;

  // ---------- 初始加载 ----------
  try {
    const rows = await getMessagesBySessionWithLimit(uid, limit);
    if (rows && rows.length > 0) {
      renderInitMessage(rows);
      // 记录最早一条消息的 created_at 作为分页游标
      oldestCreatedAt = rows[0].created_at;
      // 确保滚动到底部（renderInitMessage 内部已调用，但再次确保）
      scrollChatToBottom();
    } else {
      renderInitMessage([]);
    }
  } catch (err) {
    console.error("[chat_msg_init] 初始加载失败:", err);
  }

  // ---------- 滚动加载更早消息 ----------
  viewport.addEventListener("scroll", async () => {
    // 当滚动到顶部附近（阈值 50px）且没有正在加载、还有更早数据时触发
    if (viewport.scrollTop <= 50 && !isLoadingMore && oldestCreatedAt) {
      isLoadingMore = true;
      try {
        const moreRows = await getMessagesBySessionWithLimit(uid, limit, oldestCreatedAt);
        if (moreRows && moreRows.length > 0) {
          // moreRows 是升序（旧→新），需要反转后插入，确保容器顶部顺序正确
          const rowsDesc = [...moreRows].reverse();
          for (const row of rowsDesc) {
            const message: Message = {
              role: row.role as "user" | "assistant",
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
            };
            prependMessage(message);
          }

          // 更新游标为这批数据中最旧的一条（即原数组第一个元素的 created_at）
          oldestCreatedAt = moreRows[0].created_at;

          // 如果返回数量小于 limit，说明没有更早数据了
          if (moreRows.length < limit) {
            oldestCreatedAt = undefined;
          }
        } else {
          oldestCreatedAt = undefined; // 没有更早数据
        }
      } catch (err) {
        console.error("[chat_msg_init] 加载更早消息失败:", err);
      } finally {
        isLoadingMore = false;
      }
    }
  });
};