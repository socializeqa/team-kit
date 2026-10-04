/**
 * One call to an HQ door with the app's hub key. Never throws: a refusal, a
 * page that is not JSON or a lost line comes back as `ok: false` with HQ's
 * own words when it sent any, and the rest of what it sent beside them.
 */
export declare function callHq<T extends {
    ok: boolean;
    error?: string;
}>(url: string, key: string, init: RequestInit, timeoutMs: number): Promise<T>;
