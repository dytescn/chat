一、文件总览
文件	职责	主要操作
messages.ts	消息表 CRUD + 全文搜索 + 分页查询	db_query / db_insert / db_update / db_delete
sessions.ts	会话表 CRUD	db_query / db_insert / db_update / db_delete
prompts.ts	预设表 CRUD	db_query / db_insert / db_delete
cloud.ts	云端大模型 API 交互（SiliconFlow）	外部 HTTP 请求，读取本地 DB 组装上下文
二、messages.ts 接口明细
导出函数
函数	签名	说明
createMessage	(data: {...}) => Promise<any>	插入一条消息
getMessagesBySession	(sessionId: string) => Promise<any[]>	获取某会话全部消息（升序）
getMessagesBySessionWithLimit	(sessionId: string, limit?: number, before?: string) => Promise<any[]>	分页获取消息（倒序取 limit 条后反转为升序）
updateMessageContent	(id: string, content: string) => Promise<any>	更新消息内容
updateMessageStatus	(id: string, status: string, error_message?: string) => Promise<any>	更新消息状态
deleteMessage	(id: string) => Promise<any>	删除消息
searchMessages	(keyword: string, sessionId?: string) => Promise<any[]>	全文搜索消息（基于 FTS5）
数据库交互细节
函数	FFI-Symbol	SQL 类型	主要表
createMessage	db_insert	INSERT	messages
getMessagesBySession	db_query	SELECT	messages
getMessagesBySessionWithLimit	db_query	SELECT	messages
updateMessageContent	db_update	UPDATE	messages
updateMessageStatus	db_update	UPDATE	messages
deleteMessage	db_delete	DELETE	messages
searchMessages	db_query	SELECT	messages_fts + messages
三、sessions.ts 接口明细
导出函数
函数	签名	说明
createSession	(data: {...}) => Promise<any>	新建会话
getSessions	(archived?: boolean) => Promise<any[]>	获取会话列表，按置顶、更新时间排序
getSessionById	(id: string) => Promise<any|null>	按 ID 查询单个会话
updateSession	(id: string, updates: {...}) => Promise<any>	更新会话字段
deleteSession	(id: string) => Promise<any>	删除会话（级联删除消息）
数据库交互细节
函数	FFI-Symbol	SQL 类型	主要表
createSession	db_insert	INSERT	sessions
getSessions	db_query	SELECT	sessions
getSessionById	db_query	SELECT	sessions
updateSession	db_update	UPDATE	sessions
deleteSession	db_delete	DELETE	sessions
四、prompts.ts 接口明细
导出函数
函数	签名	说明
createPrompt	(data: {...}) => Promise<any>	新建预设
getPrompts	(category?: string) => Promise<any[]>	获取预设列表（可按分类过滤）
deletePrompt	(id: number) => Promise<any>	删除预设
数据库交互细节
函数	FFI-Symbol	SQL 类型	主要表
createPrompt	db_insert	INSERT	prompts
getPrompts	db_query	SELECT	prompts
deletePrompt	db_delete	DELETE	prompts
五、cloud.ts 接口明细
导出函数
函数	签名	说明
chatCompletion	(params: {...}) => Promise<any>	直接调用云端聊天补全（纯 HTTP 请求）
sendMessage	(sessionId: string, userContent: string, options?: {...}) => Promise<any>	读取本地历史并组装上下文后调用云端，返回 AI 回复
与本地 DB 交互
函数	读取操作	说明
sendMessage	getSessionById	获取 system_prompt
sendMessage	getMessagesBySession	获取历史消息（仅 user/assistant）
chatCompletion	无	不触碰数据库，只发 HTTP 请求