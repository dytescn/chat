// test/seedchatdata.ts
// 用法：deno run --allow-net test/seedchatdata.ts

const API_URL = "http://127.0.0.1:44944/database";
const DIALOGUE_DB = "./dialogue";
const sessionId = "d335525d-3756-4ea4-a789-38aa510a5ec2";
const total = 300; // 插入 300 条

// 简易数据库请求封装（保持与原项目一致）
async function dbFetch(symbol: string, sql: string, path: string = DIALOGUE_DB) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/libary",
      "FFI-Symbol": symbol,
    },
    body: JSON.stringify({ path, sql }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// 生成随机 Markdown 内容
function generateContent(role: string, index: number): string {
  const topics = [
    "JavaScript 性能优化",
    "Deno 部署最佳实践",
    "数据库索引优化",
    "前端状态管理",
    "RESTful API 设计",
    "CSS 布局技巧",
    "TypeScript 类型体操",
    "网络安全基础",
    "微服务架构",
    "容器化与 Docker"
  ];

  const topic = topics[index % topics.length];

  if (role === "user") {
    return `你好，我想请教一个关于 **${topic}** 的问题。

我目前遇到了一些困难，具体描述如下：

- **现象**：最近在项目中遇到了性能瓶颈，具体表现为响应时间明显变长。
- **尝试过的方案**：已经尝试了缓存、懒加载等常规手段，但效果不明显。
- **期望的结果**：希望了解更深层次的优化思路，最好能结合代码示例。

你能详细解释一下并给出一些可落地的建议吗？`;
  }

  // assistant 角色生成较长 markdown 回复
  return `好的，关于 **${topic}**，我来详细解答一下。

## 概述

${topic} 是开发中经常遇到的问题，通常可以从以下几个维度进行思考和优化。

### 1. 基本概念

首先我们需要明确问题的本质。在大多数情况下，${topic} 的核心在于对资源的合理利用和避免不必要的开销。

### 2. 常见优化方案

以下是一些经过验证的有效策略：

- **方案 A**：通过算法改进减少时间复杂度。
- **方案 B**：利用缓存机制降低重复计算。
- **方案 C**：异步处理避免阻塞主线程。
- **方案 D**：数据库查询优化，例如添加合适的索引。

### 3. 代码示例

下面是一段简单的 TypeScript 示例，演示了基本的优化思路：

\`\`\`ts
// 优化前：多次重复计算
function processData(data: number[]) {
  for (let i = 0; i < data.length; i++) {
    // 耗时操作
    heavyOperation(data[i]);
  }
}

// 优化后：缓存结果，减少重复调用
const cache = new Map<number, Result>();
function processDataOptimized(data: number[]) {
  for (const item of data) {
    if (!cache.has(item)) {
      cache.set(item, heavyOperation(item));
    }
  }
}
\`\`\`

### 4. 注意事项

> **重要提醒**：优化一定要基于实际测量数据，不要盲目进行。建议使用性能分析工具定位真正的瓶颈。

### 5. 总结

${topic} 的优化需要结合具体场景，通常需要权衡时间、空间和复杂度。希望以上内容对你有帮助，如果有进一步的问题，欢迎继续讨论。`;
}

// 检查会话是否存在
const checkRaw = await dbFetch(
  "db_query",
  `SELECT id FROM sessions WHERE id = '${sessionId}'`
);

if (!checkRaw?.data || !Array.isArray(checkRaw.data) || checkRaw.data.length === 0) {
  console.error(`会话不存在：${sessionId}`);
  Deno.exit(1);
}

console.log(`会话存在，开始插入 ${total} 条测试消息...`);

// 时间基准：2024-01-01，每条消息间隔 10 秒，保证 created_at 递增有序
const startTime = new Date("2024-01-01T00:00:00Z").getTime();

for (let i = 0; i < total; i++) {
  const id = crypto.randomUUID();
  const role = i % 2 === 0 ? "user" : "assistant";
  const content = generateContent(role, i);
  const createdAt = new Date(startTime + i * 10_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const sql = `INSERT INTO messages (id, session_id, role, content, created_at)
               VALUES ('${id}', '${sessionId}', '${role}', '${content.replace(/'/g, "''")}', '${createdAt}')`;

  try {
    await dbFetch("db_insert", sql);
  } catch (err) {
    console.error(`插入第 ${i + 1} 条失败：`, err);
    Deno.exit(1);
  }

  if ((i + 1) % 50 === 0) {
    console.log(`已插入 ${i + 1} 条...`);
  }
}

console.log("插入完成！");