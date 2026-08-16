// src/apis/cloud.ts
import { getMessagesBySession } from "./messages.ts";
import { getSessionById } from "./sessions.ts";

const SILICONFLOW_API_KEY = "";
const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1/chat/completions";

export async function chatCompletion(params: {
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  model?: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  enable_thinking?: boolean;
  thinking_budget?: number;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}) {
  const {
    messages,
    model = "deepseek-ai/DeepSeek-V3.2",
    stream = false,
    temperature = 0.7,
    top_p = 0.9,
    max_tokens = 2048,
    enable_thinking,
    thinking_budget,
    ...extraParams
  } = params;

  // deno-lint-ignore no-explicit-any
  const requestBody: any = {
    model,
    messages,
    stream,
    temperature,
    top_p,
    max_tokens,
    ...extraParams,
  };
  if (enable_thinking !== undefined) requestBody.enable_thinking = enable_thinking;
  if (thinking_budget !== undefined) requestBody.thinking_budget = thinking_budget;

  const response = await fetch(SILICONFLOW_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud API error (${response.status}): ${errorText}`);
  }

  if (!stream) {
    const json = await response.json();
    const choice = json.choices?.[0];
    if (!choice) throw new Error("No choice in response");
    const assistantMsg = choice.message || {};
    return {
      role: "assistant",
      content: assistantMsg.content || "",
      reasoning_content: assistantMsg.reasoning_content || "",
      usage: json.usage,
    };
  }

  // 流式处理
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantContent = "";
  let reasoningContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) assistantContent += delta.content;
        if (delta?.reasoning_content) reasoningContent += delta.reasoning_content;
      } catch (e) {
        console.warn("Parse SSE error:", e);
      }
    }
  }

  return {
    role: "assistant",
    content: assistantContent,
    reasoning_content: reasoningContent,
  };
}

export async function sendMessage(
  sessionId: string,
  userContent: string,
  options?: Partial<Omit<Parameters<typeof chatCompletion>[0], "messages">>
) {
  const history = await getMessagesBySession(sessionId);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  const session = await getSessionById(sessionId);
  if (session?.system_prompt) {
    messages.push({ role: "system", content: session.system_prompt });
  }

  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // 如果最后一条 user 消息内容和当前输入相同，说明调用方已经保存了用户消息，不再重复追加
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
  if (!lastUserMsg || lastUserMsg.content !== userContent) {
    messages.push({ role: "user", content: userContent });
  }

  return chatCompletion({ messages, ...options });
}