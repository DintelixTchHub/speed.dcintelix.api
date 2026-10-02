type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
const minimumLevel: LogLevel = configuredLevel && configuredLevel in levels
	? configuredLevel
	: process.env.NODE_ENV === "production" ? "info" : "debug";

function normalizeContext(context: LogContext): LogContext {
	return Object.fromEntries(
		Object.entries(context).map(([key, value]) => [
			key,
			value instanceof Error
				? { name: value.name, message: value.message, stack: value.stack }
				: value,
		]),
	);
}

function write(level: LogLevel, message: string, context?: LogContext) {
	if (levels[level] < levels[minimumLevel]) return;

	const record = {
		timestamp: new Date().toISOString(),
		level,
		message,
		...(context ? { context: normalizeContext(context) } : {}),
	};
	const output = JSON.stringify(record);

	if (level === "error") console.error(output);
	else if (level === "warn") console.warn(output);
	else if (level === "debug") console.debug(output);
	else console.info(output);
}

export const logger = {
	debug: (message: string, context?: LogContext) => write("debug", message, context),
	info: (message: string, context?: LogContext) => write("info", message, context),
	warn: (message: string, context?: LogContext) => write("warn", message, context),
	error: (message: string, context?: LogContext) => write("error", message, context),
};
