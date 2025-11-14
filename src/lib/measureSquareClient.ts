import crypto from 'crypto';

type HeaderStyle = 'authorization-bearer' | 'x-api-key' | 'basic';

export interface MeasureSquareClientOptions {
  baseUrl?: string;
  apiKey?: string;
  headerStyle?: HeaderStyle; // default: 'authorization-bearer'
  defaultHeaders?: Record<string, string>;
  xApplication?: string;
  secretKey?: string;
  basicIncludeColon?: boolean; // whether to append ':' in Basic auth encoding
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildQuery(params?: RequestOptions['query']): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export class MeasureSquareClient {
  private baseUrl: string;
  private apiKey: string;
  private headerStyle: HeaderStyle;
  private defaultHeaders: Record<string, string>;
  private xApplication?: string;
  private secretKey?: string;
  private basicIncludeColon: boolean;

  constructor(opts: MeasureSquareClientOptions = {}) {
    const envBase = process.env.MEASURE_SQUARE_API_URL;
    const envKey = process.env.MEASURE_SQUARE_API_KEY;
    const envHeader =
      (process.env.MEASURE_SQUARE_HEADER_STYLE as HeaderStyle) || undefined;
    const envApp = process.env.MEASURE_SQUARE_X_APPLICATION;
    const envSecret = process.env.MEASURE_SQUARE_SECRET_KEY;
    const envBasicColon = process.env.MEASURE_SQUARE_BASIC_INCLUDE_COLON;

    this.baseUrl = (opts.baseUrl || envBase || '').replace(/\/$/, '');
    if (!this.baseUrl) throw new Error('Missing MEASURE_SQUARE_API_URL');

    this.apiKey = opts.apiKey || envKey || '';
    if (!this.apiKey) throw new Error('Missing MEASURE_SQUARE_API_KEY');

    this.headerStyle = opts.headerStyle || envHeader || 'authorization-bearer';
    this.xApplication = opts.xApplication || envApp || undefined;
    this.secretKey = opts.secretKey || envSecret || undefined;
    this.basicIncludeColon =
      typeof opts.basicIncludeColon === 'boolean'
        ? opts.basicIncludeColon
        : envBasicColon === '1' || envBasicColon === 'true';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json, */*;q=0.8',
      ...opts.defaultHeaders,
    };
  }

  private authHeader(): Record<string, string> {
    if (this.headerStyle === 'x-api-key') {
      return { 'x-api-key': this.apiKey };
    }
    if (this.headerStyle === 'basic') {
      const raw = this.basicIncludeColon ? `${this.apiKey}:` : this.apiKey;
      const b64 = Buffer.from(raw, 'utf8').toString('base64');
      return { Authorization: `Basic ${b64}` };
    }
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private xHeaders(): Record<string, string> {
    // These headers are required by Measure Square Cloud API
    const app = this.xApplication;
    const secret = this.secretKey;
    if (!app || !secret) return {};
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp, 'utf8');
    const signature = hmac.digest('base64');
    return {
      'X-Application': app,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
  }

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<{ status: number; ok: boolean; data: T; response: Response }> {
    if (!path.startsWith('/')) path = `/${path}`;
    const url = `${this.baseUrl}${path}${buildQuery(options.query)}`;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.authHeader(),
      ...this.xHeaders(),
      ...options.headers,
    };

    const init: RequestInit = {
      method: options.method || 'GET',
      headers,
      signal: options.signal,
    };

    if (options.body !== undefined) {
      init.body =
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
    }

    const res = await fetch(url, init);
    const isJson = res.headers
      .get('content-type')
      ?.includes('application/json');
    const data = (isJson
      ? await res.json().catch(() => null)
      : await res.text()) as unknown as T;
    return { status: res.status, ok: res.ok, data: data as T, response: res };
  }
}

export default function getMeasureSquareClient(
  opts: MeasureSquareClientOptions = {}
) {
  return new MeasureSquareClient(opts);
}
