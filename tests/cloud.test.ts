// tests/cloud.test.ts
// 云端调用测试（自动执行，无需用户交互）

import { sendMessage, chatCompletion } from "../src/apis/cloud.ts";
import { createSession, deleteSession } from "../src/apis/sessions.ts";
import { getMessagesBySession } from "../src/apis/messages.ts";

// 测试前请确保 cloud.ts 中的 SILICONFLOW_API_KEY 已设置为有效值
// 若模型不可用，可替换下方 MODEL_NAME
const MODEL_NAME = "deepseek-ai/DeepSeek-V3.2";
const TEST_SESSION_ID = crypto.randomUUID();

async function testCloud() {
  console.log("========== 测试 Cloud API ==========\n");

  // 1. 创建会话
  console.log("1. 创建测试会话...");
  await createSession({
    id: TEST_SESSION_ID,
    title: "云端测试会话",
    model_name: MODEL_NAME,
  });
  console.log("   [OK] 会话已创建");

  // 2. 非流式调用
  console.log("\n2. 非流式调用（发送固定消息）...");
  let nonStreamReply: any = null;
  try {
    nonStreamReply = await sendMessage(
      TEST_SESSION_ID,
      "你好，请介绍一下你自己",
      {
        model: MODEL_NAME,
        stream: false,
        temperature: 0.7,
      }
    );
    console.log(`   [OK] 回复长度: ${nonStreamReply.content.length} 字符`);
    console.log(`   [INFO] 内容预览: ${nonStreamReply.content.slice(0, 100)}...`);
    console.log(`   [INFO] Tokens:`, nonStreamReply.usage);
  } catch (e: any) {
    console.error("   [FAIL] 非流式调用失败:", e.message);
    console.log("   跳过流式测试。");
    await deleteSession(TEST_SESSION_ID);
    return;
  }

  // 3. 流式调用（使用固定的简短消息）
  console.log("\n3. 流式调用（发送固定消息：'讲一个简短的笑话'）...");
  try {
    const streamReply = await chatCompletion({
      sessionId: TEST_SESSION_ID,
      messages: [{ role: "user", content: "讲一个简短的笑话" }],
      stream: true,
      model: MODEL_NAME,
    });
    console.log(`   [OK] 流式回复内容: ${streamReply.content}`);
  } catch (e: any) {
    console.error("   [FAIL] 流式调用失败:", e.message);
  }

  // 4. 查询会话历史（验证消息已保存）
  console.log("\n4. 查询会话历史...");
  const history = await getMessagesBySession(TEST_SESSION_ID);
  console.log(`   [INFO] 共 ${history.length} 条消息`);
  history.forEach((m: any) => {
    const preview = m.content.length > 50 ? m.content.slice(0, 50) + "..." : m.content;
    console.log(`   - ${m.role}: ${preview}`);
  });

  // 清理
  console.log("\n清理：删除测试会话...");
  await deleteSession(TEST_SESSION_ID);
  console.log("   [OK] 清理完成");

  console.log("\n========== Cloud 测试完成 ==========");
}

testCloud().catch(console.error);