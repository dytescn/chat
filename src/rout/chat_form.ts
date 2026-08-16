// rout/chat_form.ts
import { chat_form_tpl } from "../view/chat_form.ts";
import { sendMessage } from "../apis/cloud.ts";
import { createSession } from "../apis/sessions.ts";
import { createMessage } from "../apis/messages.ts";
import { generateUUID } from "../utils/uuid.ts";
import { appendMessage } from "./render_msg.ts";
import { initChatInput } from "../utils/input_watch.ts";
import { init_slidebar } from "./slidebar.ts";
import type { Tpl } from "@funxdata/pages/tplstype";
import type { Message } from "./render_msg.ts";

// deno-lint-ignore no-explicit-any
const TplToHtml = (globalThis as any)["TplToHtml"] as Tpl;

/**
 * 初始化聊天输入框
 * @param uid 会话ID
 */
export const chat_form_init = (uid: string = "") => {
  const footer = document.querySelector("#chat-footer") as HTMLElement;
  if (!footer) return console.warn("[chat_form] #chat-footer 不存在");
  footer.innerHTML = TplToHtml.renderString(chat_form_tpl, { uid });

  let currentUid = uid;
  const isFirstSend = !uid;

  /**
   * 实际发送逻辑：负责会话创建、消息持久化、调用云端
   */
  const handleSend = async (text: string) => {
    const shouldAppend = !isFirstSend; // 非首次发送时才插入 DOM

    // 1. 首次发送时先创建会话（不会显示消息区域）
    if (!currentUid) {
      const newId = generateUUID();
      await createSession({
        id: newId,
        title: text.slice(0, 30) || "新对话",
        model_name: "deepseek-ai/DeepSeek-V3.2",
      });
      currentUid = newId;
    }

    // 2. 保存用户消息（始终保存到数据库，但首次不显示）
    const userMessageId = generateUUID();
    await createMessage({
      id: userMessageId,
      session_id: currentUid,
      role: "user",
      content: text,
    });
    const userMsg: Message = { role: "user", content: text, messageId: userMessageId };
    if (shouldAppend) appendMessage(userMsg);

    // 3. 调用云端
    const reply = await sendMessage(currentUid, text, {
      stream: false,
      model: "deepseek-ai/DeepSeek-V3.2",
    });

    // 4. 保存助手消息（始终保存，首次不显示）
    const assistantMessageId = generateUUID();
    await createMessage({
      id: assistantMessageId,
      session_id: currentUid,
      role: "assistant",
      content: reply.content,
      metadata: { reasoning_content: reply.reasoning_content || "" },
      prompt_tokens: reply.usage?.prompt_tokens || 0,
      completion_tokens: reply.usage?.completion_tokens || 0,
      total_tokens: reply.usage?.total_tokens || 0,
      status: "completed",
    });
    const assistantMsg: Message = {
      role: "assistant",
      content: reply.content,
      messageId: assistantMessageId,
      duration: reply.usage?.total_tokens
        ? `${(reply.usage.total_tokens / 100).toFixed(2)}s`
        : undefined,
    };
    if (shouldAppend) appendMessage(assistantMsg);

    // 5. 刷新侧边栏（仅对已有会话，首次发送成功后会跳转）
    if (!isFirstSend) {
      init_slidebar(currentUid);
    }

    // 6. 首次发送成功后才跳转
    if (isFirstSend && currentUid) {
      location.href = `/chat?uid=${currentUid}`;
    }
  };

  // 初始化输入框事件，并传入发送回调
  initChatInput(footer, {
    onSend: async (text) => {
      try {
        await handleSend(text);
      } catch (err) {
        console.error("[chat_form] 发送失败，详细错误:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (isFirstSend) {
          // 首次发送失败时，使用 alert 提示，不插入 DOM
          alert(`发送失败：${errorMsg || "未知错误，请检查网络或 API 配置"}`);
        } else {
          appendMessage({
            role: "assistant",
            content: `发送失败：${errorMsg || "未知错误，请检查网络或 API 配置"}`,
            messageId: "error-" + Date.now(),
          });
        }
        // 重新抛出错误，让 input_watch 捕获并保留用户输入
        throw err;
      }
    },
  });
};