// src/apis/messages.ts
// 消息表 CRUD + 全文搜索，完全自包含

const API_URL = "http://127.0.0.1:44944/database";
const DIALOGUE_DB = "./dialogue";

// ---------- 基础数据库操作 ----------
const dbFetch = async (symbol: string, body: any) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/libary',
      'FFI-Symbol': symbol,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const dbQuery = async (sql: string, path: string = DIALOGUE_DB) => {
  const raw = await dbFetch('db_query', { path, sql });
  if (raw?.data && Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
};

const dbInsert = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_insert', { path, sql });
};

const dbUpdate = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_update', { path, sql });
};

const dbDelete = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_delete', { path, sql });
};

// ========== Messages CRUD ==========

// 创建消息
export const createMessage = async (data: {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parent_id?: string;
  metadata?: any;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  first_token_time_ms?: number;
  total_time_ms?: number;
  status?: string;
  error_message?: string;
}) => {
  const sql = `
    INSERT INTO messages (
      id, session_id, parent_id, role, content, metadata,
      prompt_tokens, completion_tokens, total_tokens,
      first_token_time_ms, total_time_ms, status, error_message
    ) VALUES (
      '${data.id}',
      '${data.session_id}',
      ${data.parent_id ? `'${data.parent_id}'` : 'NULL'},
      '${data.role}',
      '${data.content.replace(/'/g, "''")}',
      '${JSON.stringify(data.metadata || {})}',
      ${data.prompt_tokens || 0},
      ${data.completion_tokens || 0},
      ${data.total_tokens || 0},
      ${data.first_token_time_ms || 0},
      ${data.total_time_ms || 0},
      '${data.status || 'completed'}',
      ${data.error_message ? `'${data.error_message.replace(/'/g, "''")}'` : 'NULL'}
    )
  `;
  const insertResult = await dbInsert(sql);

  // 更新会话的 updated_at，确保侧边栏排序正确
  const updateSessionSql = `UPDATE sessions SET updated_at = datetime('now') WHERE id = '${data.session_id}'`;
  try {
    await dbUpdate(updateSessionSql);
  } catch (err) {
    console.warn("[createMessage] 更新会话时间失败:", err);
  }

  return insertResult;
};

// 获取某会话的所有消息（按时间升序）
export const getMessagesBySession = async (sessionId: string) => {
  const sql = `
    SELECT * FROM messages 
    WHERE session_id = '${sessionId}' 
    ORDER BY created_at ASC
  `;
  return await dbQuery(sql);
};

// 更新消息内容
export const updateMessageContent = async (id: string, content: string) => {
  const sql = `UPDATE messages SET content = '${content.replace(/'/g, "''")}' WHERE id = '${id}'`;
  return await dbUpdate(sql);
};

// 更新消息状态（如 streaming → completed）
export const updateMessageStatus = async (id: string, status: string, error_message?: string) => {
  const fields = [`status = '${status}'`];
  if (error_message !== undefined) {
    fields.push(`error_message = '${error_message.replace(/'/g, "''")}'`);
  }
  const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = '${id}'`;
  return await dbUpdate(sql);
};

// 删除消息
export const deleteMessage = async (id: string) => {
  const sql = `DELETE FROM messages WHERE id = '${id}'`;
  return await dbDelete(sql);
};

// ========== 全文搜索（基于 FTS5） ==========
// 全文搜索（不包含 snippet，避免参数错误）
export const searchMessages = async (keyword: string, sessionId?: string) => {
  let sql = `
    SELECT 
      m.id,
      m.session_id,
      m.role,
      m.content,
      m.created_at
    FROM messages_fts fts
    JOIN messages m ON fts.message_id = m.id
    WHERE fts.content MATCH '${keyword.replace(/'/g, "''")}'
  `;
  if (sessionId) {
    sql += ` AND fts.session_id = '${sessionId}'`;
  }
  sql += ' ORDER BY m.created_at DESC';
  const result = await dbQuery(sql);
  if (Array.isArray(result)) {
    return result;
  }
  console.warn("[searchMessages] 返回结果不是数组，可能查询失败:", result);
  return [];
};

// apis/messages.ts（新增）
/**
 * 分页获取会话消息（按时间倒序取前 N 条，再反转升序）
 * @param sessionId 会话 ID
 * @param limit 每页数量
 * @param before 可选，获取早于该时间戳的消息（用于向上加载）
 * @returns 消息数组（按 created_at 升序排列）
 */
export const getMessagesBySessionWithLimit = async (
  sessionId: string,
  limit: number = 10,
  before?: string
) => {
  let sql = `
    SELECT * FROM messages 
    WHERE session_id = '${sessionId}'
  `;
  if (before) {
    sql += ` AND created_at < '${before}'`;
  }
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  const rows = await dbQuery(sql);
  if (!Array.isArray(rows)) return [];
  return rows.reverse();
};