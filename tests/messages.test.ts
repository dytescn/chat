// tests/messages.test.ts
// 测试 messages.ts 的 CRUD 和全文搜索

import {
  createMessage,
  getMessagesBySession,
  updateMessageContent,
  updateMessageStatus,
  deleteMessage,
  searchMessages,
} from "../src/apis/messages.ts";
import { createSession, deleteSession } from "../src/apis/sessions.ts";

// ---------- 辅助：确保表存在 ----------
async function ensureDialogueTables() {
  const API_URL = "http://127.0.0.1:44944/database";
  const DB_PATH = "./dialogue";

  const dbExec = async (sql: string) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/libary", "FFI-Symbol": "db_update" },
      body: JSON.stringify({ path: DB_PATH, sql }),
    });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return res.json();
  };

  const createStatements = [
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model_name TEXT NOT NULL,
      system_prompt TEXT,
      model_config TEXT DEFAULT '{}',
      is_pinned BOOLEAN DEFAULT 0,
      is_archived BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_pinned_updated ON sessions(is_pinned DESC, updated_at DESC);`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      parent_id TEXT,
      role TEXT CHECK(role IN ('user','assistant','system','tool')) NOT NULL,
      content TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      first_token_time_ms INTEGER,
      total_time_ms INTEGER,
      status TEXT DEFAULT 'completed',
      error_message TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at ASC);`,
    `CREATE TABLE IF NOT EXISTS message_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      file_type TEXT CHECK(file_type IN ('image','audio','document','other')) NOT NULL,
      file_name TEXT NOT NULL,
      file_path_or_url TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id);`,
    `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      message_id UNINDEXED,
      session_id UNINDEXED,
      content,
      tokenize = 'porter unicode61'
    );`,
    `CREATE TRIGGER IF NOT EXISTS trig_messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(message_id, session_id, content) 
      VALUES (new.id, new.session_id, new.content);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS trig_messages_ad AFTER DELETE ON messages BEGIN
      DELETE FROM messages_fts WHERE message_id = old.id;
    END;`,
    `CREATE TRIGGER IF NOT EXISTS trig_messages_au AFTER UPDATE ON messages BEGIN
      UPDATE messages_fts SET content = new.content WHERE message_id = new.id;
    END;`,
  ];

  for (const sql of createStatements) {
    await dbExec(sql);
  }
  console.log("   ✅ 数据库表结构已确保存在");
}

// ---------- 测试 ----------
const SESSION_ID = crypto.randomUUID();
const MESSAGE_ID = crypto.randomUUID();
const MESSAGE_ID2 = crypto.randomUUID();

async function testMessages() {
  console.log("========== 测试 Messages API ==========\n");

  // 0. 确保表存在（独立于 setup.ts）
  console.log("准备：确保数据库表存在...");
  await ensureDialogueTables();

  // 1. 创建测试会话
  console.log("准备：创建测试会话...");
  await createSession({
    id: SESSION_ID,
    title: "消息测试会话",
    model_name: "test",
  });

  // 2. 创建用户消息
  console.log("\n1. 创建用户消息...");
  await createMessage({
    id: MESSAGE_ID,
    session_id: SESSION_ID,
    role: "user",
    content: "Hello, world!",
  });
  console.log("   ✅ 用户消息创建成功");

  // 3. 创建助手回复
  console.log("\n2. 创建助手回复...");
  await createMessage({
    id: MESSAGE_ID2,
    session_id: SESSION_ID,
    role: "assistant",
    content: "Hi there! How can I help?",
    parent_id: MESSAGE_ID,
  });
  console.log("   ✅ 助手消息创建成功");

  // 4. 查询会话消息
  console.log("\n3. 查询会话消息列表...");
  const messages = await getMessagesBySession(SESSION_ID);
  if (!Array.isArray(messages)) {
    console.error("   ❌ 返回结果不是数组，原始数据:", messages);
    return;
  }
  console.log(`   共 ${messages.length} 条消息`);
  messages.forEach(m => console.log(`   - ${m.role}: ${m.content}`));

  // 5. 更新消息内容
  console.log("\n4. 更新第一条消息内容...");
  await updateMessageContent(MESSAGE_ID, "Hello, world! (updated)");
  console.log("   ✅ 更新成功");

  // 6. 更新消息状态
  console.log("\n5. 更新助手消息状态为 'completed'...");
  await updateMessageStatus(MESSAGE_ID2, "completed");
  console.log("   ✅ 状态更新成功");

  // 7. 全文搜索
  console.log("\n6. 全文搜索关键词 'Hello'...");
  const searchResults = await searchMessages("Hello");
  console.log(`   找到 ${searchResults.length} 条匹配`);
  // deno-lint-ignore no-explicit-any
  searchResults.forEach((r:any) => console.log(`   - ${r.snippet}`));

  // 8. 删除消息
  console.log("\n7. 删除第一条消息...");
  await deleteMessage(MESSAGE_ID);
  console.log("   ✅ 删除成功");

  // 9. 验证剩余消息
  console.log("\n8. 剩余消息...");
  const remaining = await getMessagesBySession(SESSION_ID);
  console.log(`   剩余 ${remaining.length} 条`);
  // deno-lint-ignore no-explicit-any
  remaining.forEach((m:any) => console.log(`   - ${m.role}: ${m.content}`));

  // 10. 清理：删除会话
  console.log("\n清理：删除测试会话...");
  await deleteSession(SESSION_ID);
  console.log("   ✅ 清理完成");

  console.log("\n========== Messages 测试完成 ==========");
}

testMessages().catch(console.error);