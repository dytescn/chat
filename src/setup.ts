// setup-chat.ts

// 清理旧 AI 路由
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_insert",
  },
  body: JSON.stringify({
    path: "router",
    sql: "DELETE FROM routers WHERE parent_id IN (SELECT id FROM routers WHERE title = 'AI')",
  }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_insert",
  },
  body: JSON.stringify({
    path: "router",
    sql: "DELETE FROM routers WHERE title = 'AI'",
  }),
});

// 插入 AI 父路由
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_insert",
  },
  body: JSON.stringify({
    path: "router",
    sql: `
        INSERT INTO routers (id, title, icon, hide, path, parent_id, level)
        VALUES (1, 'AI', 'ic-message', 0, '/chat', 0, 1)
    `,
  }),
});

// 插入 AI 子路由
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_insert",
  },
  body: JSON.stringify({
    path: "router",
    sql: `
        INSERT INTO routers (id, title, icon, hide, path, url, show, parent_id, level)
        VALUES (2, 'instro', '', 0, '/chat', '/chat/chat.js', 1, 1, 2)
    `,
  }),
});

// 1. PRAGMA 配置
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({ path: "./dialogue", sql: "PRAGMA foreign_keys = ON;" }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({ path: "./dialogue", sql: "PRAGMA journal_mode = WAL;" }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({ path: "./dialogue", sql: "PRAGMA cache_size = -64000;" }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({ path: "./dialogue", sql: "PRAGMA synchronous = NORMAL;" }),
});

// 2. 创建 prompts 表
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        is_system BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
  }),
});

// 3. 创建 sessions 表
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        model_name TEXT NOT NULL,
        system_prompt TEXT,
        model_config TEXT,
        is_pinned INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
  }),
});

// 4. 创建 messages 表
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        parent_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        first_token_time_ms INTEGER DEFAULT 0,
        total_time_ms INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );`,
  }),
});

// 5. 创建全文搜索虚拟表
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        message_id UNINDEXED,
        session_id UNINDEXED,
        content
    );`,
  }),
});

// 6. 添加 FTS 同步触发器（可选，保持全文索引一致）
await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts (message_id, session_id, content)
        VALUES (new.id, new.session_id, new.content);
    END;`,
  }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE message_id = old.id;
    END;`,
  }),
});

await fetch("http://127.0.0.1:44944/database", {
  method: "POST",
  headers: {
    "Content-Type": "application/libary",
    "FFI-Symbol": "db_update",
  },
  body: JSON.stringify({
    path: "./dialogue",
    sql: `CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        UPDATE messages_fts SET content = new.content WHERE message_id = new.id;
    END;`,
  }),
});

console.log("聊天模块初始化完成");
