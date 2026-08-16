// tests/sessions.test.ts
// 测试 sessions.ts 的 CRUD 操作

import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from "../src/apis/sessions.ts";

const TEST_SESSION_ID = crypto.randomUUID();

async function testSessions() {
  console.log("========== 测试 Sessions API ==========\n");

  // 1. 创建会话
  console.log("1. 创建会话...");
  await createSession({
    id: TEST_SESSION_ID,
    title: "测试会话",
    model_name: "llama3:8b",
    system_prompt: "你是一个测试助手",
    model_config: { temperature: 0.7 },
  });
  console.log("   ✅ 创建成功");

  // 2. 查询所有会话（未归档）
  console.log("\n2. 查询所有会话...");
  const sessions = await getSessions();
  console.log(`   共 ${sessions.length} 个会话`);
  console.log("   最新会话:", sessions[0]);

  // 3. 按 ID 查询
  console.log("\n3. 按 ID 查询会话...");
  const session = await getSessionById(TEST_SESSION_ID);
  console.log("   查询结果:", session);

  // 4. 更新会话
  console.log("\n4. 更新会话标题和置顶状态...");
  await updateSession(TEST_SESSION_ID, {
    title: "更新后的标题",
    is_pinned: true,
  });
  console.log("   ✅ 更新成功");

  // 5. 再次查询确认
  console.log("\n5. 确认更新...");
  const updated = await getSessionById(TEST_SESSION_ID);
  console.log("   更新后数据:", updated);

  // 6. 删除会话（级联删除）
  console.log("\n6. 删除会话...");
  await deleteSession(TEST_SESSION_ID);
  console.log("   ✅ 删除成功");

  // 7. 验证已删除
  console.log("\n7. 验证已删除...");
  const deleted = await getSessionById(TEST_SESSION_ID);
  console.log("   查询结果:", deleted === null ? "null (已删除)" : deleted);

  console.log("\n========== Sessions 测试完成 ==========");
}

testSessions().catch(console.error);