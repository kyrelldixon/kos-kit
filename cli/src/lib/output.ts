export interface NextAction {
	command: string;
	description: string;
	params?: Record<
		string,
		{
			description?: string;
			value?: string | number;
			default?: string | number;
			enum?: string[];
			required?: boolean;
		}
	>;
}

export interface SuccessResponse {
	ok: true;
	command: string;
	result: unknown;
	next_actions: NextAction[];
}

export interface ErrorResponse {
	ok: false;
	command: string;
	error: { message: string; code: string };
	fix: string;
	next_actions: NextAction[];
}

export type CLIResponse = SuccessResponse | ErrorResponse;

export function success(
	command: string,
	result: unknown,
	next_actions: NextAction[],
): SuccessResponse {
	return { ok: true, command, result, next_actions };
}

export function error(
	command: string,
	code: string,
	message: string,
	fix: string,
	next_actions: NextAction[],
): ErrorResponse {
	return { ok: false, command, error: { message, code }, fix, next_actions };
}

/** Print a CLIResponse as JSON to stdout and exit with appropriate code. */
export function output(response: CLIResponse): never {
	console.log(JSON.stringify(response, null, 2));
	process.exit(response.ok ? 0 : 1);
}
