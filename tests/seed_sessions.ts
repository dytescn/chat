// test/seed_sessions.ts
// 用法：deno run --allow-net test/seed_sessions.ts

const API_URL = "http://127.0.0.1:44944/database";
const DIALOGUE_DB = "./dialogue";
const totalSessions = 300; // 创建 300 个会话
const messagesPerSession = 5; // 每个会话插入 5 条消息

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

// 生成随机标题
function generateTitle(index: number): string {
  const topics = [
    "JavaScript 性能优化",
    "Deno 部署",
    "数据库索引",
    "状态管理",
    "RESTful API",
    "CSS 布局",
    "TypeScript 类型",
    "网络安全",
    "微服务",
    "容器化",
  ];
  return `${topics[index % topics.length]} - 会话 #${index + 1}`;
}

// 生成随机内容（简单即可）
function generateContent(sessionIndex: number, messageIndex: number): string {
  const roles = ["user", "assistant"];
  const role = roles[messageIndex % 2];
  return `${role === "user" ? "用户" : "助手"}消息 #${messageIndex + 1}，来自会话 ${sessionIndex + 1}`;
}

// 主函数
async function main() {
  console.log(`开始创建 ${totalSessions} 个会话，每个会话 ${messagesPerSession} 条消息...`);

  // 基准时间
  const baseTime = Date.now();
  let sessionCounter = 0;

  for (let i = 0; i < totalSessions; i++) {
    const sessionId = crypto.randomUUID();
    const title = generateTitle(i);
    // 会话创建时间稍作递增，避免排序完全颠倒（但 updated_at 会在插入消息时更新为最新）
    const createdAt = new Date(baseTime - (totalSessions - i) * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // 插入会话
    await dbFetch("db_insert", `
      INSERT INTO sessions (id, title, model_name, created_at, updated_at)
      VALUES ('${sessionId}', '${title.replace(/'/g, "''")}', 'deepseek-ai/DeepSeek-V3.2', '${createdAt}', '${createdAt}')
    `);

    // 插入该会话的消息
    for (let j = 0; j < messagesPerSession; j++) {
      const messageId = crypto.randomUUID();
      const role = j % 2 === 0 ? "user" : "assistant";
      const content = generateContent(i, j);
      const msgCreatedAt = new Date(baseTime - (totalSessions - i) * 1000 + j * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      await dbFetch("db_insert", `
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES ('${messageId}', '${sessionId}', '${role}', '${content.replace(/'/g, "''")}', '${msgCreatedAt}')
      `);

      // 每次插入消息都更新会话的 updated_at（这里显式更新一次，模拟正常消息保存流程）
      // 注意：在实际项目中由 createMessage 自动更新，这里为了测试排序，手动更新
      await dbFetch("db_update", `
        UPDATE sessions SET updated_at = '${msgCreatedAt}' WHERE id = '${sessionId}'
      `);
    }

    sessionCounter++;
    if (sessionCounter % 50 === 0) {
      console.log(`已创建 ${sessionCounter} 个会话...`);
    }
  }

  console.log("会话创建完成！");
}

await main();