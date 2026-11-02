export class SpeakingError extends Error { constructor(public readonly code: string, message: string, public readonly status: number) { super(message); } }
export class NotFoundError extends SpeakingError { constructor(message: string) { super("NOT_FOUND", message, 404); } }
export class LimitError extends SpeakingError { constructor() { super("DAILY_AI_LIMIT", "오늘 대화 한도를 다 썼어요. 내일 초기화돼요.", 429); } }
export class ConfigurationError extends SpeakingError { constructor(message: string) { super("PROVIDER_NOT_CONFIGURED", message, 503); } }
