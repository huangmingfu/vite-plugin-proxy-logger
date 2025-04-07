import { Plugin, ProxyOptions } from 'vite';
import type { IncomingMessage } from 'http';
import chalk from 'chalk';

export interface ProxyLoggerOptions {
    /** 是否启用详细日志 */
    verbose?: boolean;
    /** 是否显示请求头信息 */
    showHeaders?: boolean;
    /** 是否显示响应时间 */
    showTiming?: boolean;
    /** 是否显示代理路径前缀 */
    showProxyPath?: boolean;
    /** 自定义日志格式化函数 */
    formatter?: (info: ProxyLogInfo) => string;
    /** 过滤特定请求的日志 */
    filter?: (req: IncomingMessage) => boolean;
}

interface ProxyLogInfo {
    method: string;
    url: string;
    target: string;
    proxyPath?: string;
    statusCode?: number;
    duration?: number;
    headers?: Record<string, string | string[] | undefined>;
    timestamp: Date;
}

const defaultOptions: ProxyLoggerOptions = {
    verbose: false,
    showHeaders: false,
    showTiming: true,
    showProxyPath: true,
    filter: () => true,
};

function normalizeProxyOptions(target: string | ProxyOptions): ProxyOptions {
    return typeof target === 'string' ? { target } : target;
}

export function proxyLogger(options: ProxyLoggerOptions = {}): Plugin {
    const opts = { ...defaultOptions, ...options } as Required<ProxyLoggerOptions>;
    const requestTimes = new Map<string, number>();

    function formatLog(info: ProxyLogInfo): string {
        if (opts.formatter) {
            return opts.formatter(info);
        }

        const timestamp = info.timestamp.toLocaleTimeString();
        const method = chalk.bold(info.method.padEnd(7));
        const status = info.statusCode
            ? info.statusCode < 400
                ? chalk.green(info.statusCode)
                : chalk.red(info.statusCode)
            : '';
        const timing = info.duration ? chalk.gray(`${info.duration}ms`) : '';
        const proxyPath = info.proxyPath ? chalk.yellow(`[${info.proxyPath}] `) : '';
        const target = chalk.cyan(`${info.target}${info.url}`);

        return `[${timestamp}] ${method} ${proxyPath}${target} ${status} ${timing}`.trim();
    }

    return {
        name: 'vite-plugin-proxy-logger',
        apply: 'serve',
        config(config) {
            if (process.env.NODE_ENV !== 'development') return;

            const rawProxy = config.server?.proxy || {};
            const proxy: Record<string, ProxyOptions> = {};

            for (const [key, value] of Object.entries(rawProxy)) {
                proxy[key] = normalizeProxyOptions(value);
                const originalConfigure = proxy[key].configure;

                proxy[key].configure = (proxyServer: any, options: ProxyOptions) => {
                    // 请求开始
                    proxyServer.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
                        if (!opts.filter(req)) return;

                        const reqId = `${req.method}-${req.url}-${Date.now()}`;
                        requestTimes.set(reqId, Date.now());

                        if (opts.verbose) {
                            const logInfo: ProxyLogInfo = {
                                method: req.method || 'UNKNOWN',
                                url: req.url || '',
                                target: String(options.target || ''),
                                proxyPath: opts.showProxyPath ? key : undefined,
                                headers: opts.showHeaders ? req.headers : undefined,
                                timestamp: new Date(),
                            };
                            console.log(formatLog(logInfo));
                        }
                    });

                    // 请求完成
                    proxyServer.on('proxyRes', (proxyRes: any, req: IncomingMessage) => {
                        if (!opts.filter(req)) return;

                        const reqId = `${req.method}-${req.url}-${Date.now()}`;
                        const startTime = requestTimes.get(reqId);
                        const duration = startTime ? Date.now() - startTime : undefined;
                        requestTimes.delete(reqId);

                        const logInfo: ProxyLogInfo = {
                            method: req.method || 'UNKNOWN',
                            url: req.url || '',
                            target: String(options.target || ''),
                            proxyPath: opts.showProxyPath ? key : undefined,
                            statusCode: proxyRes.statusCode,
                            duration: opts.showTiming ? duration : undefined,
                            headers: opts.showHeaders ? proxyRes.headers : undefined,
                            timestamp: new Date(),
                        };

                        console.log(formatLog(logInfo));
                    });

                    // 错误处理
                    proxyServer.on('error', (err: Error, req: IncomingMessage) => {
                        console.error(chalk.red(`Proxy Error: ${err.message}`));
                        console.error(chalk.red(`  URL: ${options.target}${req.url}`));
                        if (opts.showProxyPath) {
                            console.error(chalk.red(`  Proxy Path: ${key}`));
                        }
                    });

                    if (typeof originalConfigure === 'function') {
                        originalConfigure(proxyServer, options);
                    }
                };
            }

            return {
                server: {
                    ...config.server,
                    proxy,
                },
            };
        },
    };
}
