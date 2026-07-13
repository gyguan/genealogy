from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, got {count}")
    file.write_text(text.replace(old, new, 1))


client = "frontend/genealogy-web/src/shared/api/client.ts"
if "export class ApiRequestError" not in Path(client).read_text():
    replace_once(
        client,
        """export type ApiError = {
  code?: string;
  message?: string;
  errorMessage?: string;
};
""",
        """export type ApiError = {
  code?: string;
  message?: string;
  errorMessage?: string;
};

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, code: string | undefined, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}
""",
    )
    replace_once(
        client,
        "function normalizeApiErrorMessage(message: string) {",
        """function extractApiErrorCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const code = String((payload as Record<string, unknown>).code ?? '').trim();
  return code || undefined;
}

function normalizeApiErrorMessage(message: string) {""",
    )
    replace_once(
        client,
        """  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
""",
        """  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedBody = normalizeJsonBody(path, body);
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
""",
    )
    replace_once(
        client,
        """    if (!res.ok || explicitFailure || implicitFailure) {
      throw new Error(extractApiErrorMessage(payload, res.status));
    }""",
        """    if (!res.ok || explicitFailure || implicitFailure) {
      throw new ApiRequestError(
        extractApiErrorMessage(payload, res.status),
        extractApiErrorCode(payload),
        res.status
      );
    }""",
    )
