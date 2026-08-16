// tests/prompts.test.ts
// 测试 prompts.ts 的 CRUD 操作

import {
  createPrompt,
  getPrompts,
  deletePrompt,
} from "../src/apis/prompts.ts";

let createdId: number;

async function testPrompts() {
  console.log("========== 测试 Prompts API ==========\n");

  // 1. 创建预设
  console.log("1. 创建预设...");
  const result = await createPrompt({
    title: "测试预设",
    content: "你是一个测试助手，请用中文回复。",
    category: "测试",
    is_system: true,
  });
  console.log("   创建结果:", result);

  // 获取刚创建的 ID（由于 createPrompt 返回的是响应，不直接返回 ID，我们通过查询获取）
  // 这里简单起见，我们查询所有预设，取最新的一条
  console.log("\n2. 查询所有预设...");
  const prompts = await getPrompts();
  console.log(`   共 ${prompts.length} 个预设`);
  const latest = prompts[prompts.length - 1];
  console.log("   最新预设:", latest);
  if (latest) {
    createdId = latest.id;
  } else {
    throw new Error("未找到预设");
  }

  // 3. 按分类查询
  console.log("\n3. 按分类 '测试' 查询...");
  const testPrompts = await getPrompts("测试");
  console.log(`   找到 ${testPrompts.length} 个`);

  // 4. 删除预设
  console.log(`\n4. 删除预设 ID=${createdId}...`);
  await deletePrompt(createdId);
  console.log("   ✅ 删除成功");

  // 5. 验证删除
  console.log("\n5. 验证删除...");
  const after = await getPrompts();
  const exists = after.some((p:any) => p.id === createdId);
  console.log(`   是否存在: ${exists ? '是' : '否（已删除）'}`);

  console.log("\n========== Prompts 测试完成 ==========");
}

testPrompts().catch(console.error);