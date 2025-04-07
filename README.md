# vite-plugin-proxy-logger

一个用于在开发环境中记录代理请求的 Vite 插件。

经过 proxy 代理后，在浏览器看不到接口域名，只能看到 `http://localhost:3000/api/xxx` 这种形式，
所以需要一个插件来记录接口的请求日志，方便开发人员调试。

控制台打印出当前真正请求的接口地址：

![](https://huangmingfu.github.io/drawing-bed/images/pic-go/202504071603231.png)

## 特性

- 🎯 仅在开发环境中生效
- 📝 详细的请求日志
- ⏱️ 请求响应时间统计
- 🎨 彩色输出
- 🔍 可选的请求头信息显示
- 🎛️ 灵活的配置选项

## 安装

```bash
npm install vite-plugin-proxy-logger -D
# 或
yarn add vite-plugin-proxy-logger -D
# 或
pnpm add vite-plugin-proxy-logger -D
```

## 使用方法

在你的 `vite.config.ts` 中配置：

```typescript
import { defineConfig } from 'vite'
import { proxyLogger } from 'vite-plugin-proxy-logger'

export default defineConfig({
  plugins: [
    proxyLogger()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://xxxxx.com',
        changeOrigin: true,
      },
      // ...
    }
  }
})
```

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| verbose | boolean | false | 是否显示详细日志 |
| showHeaders | boolean | false | 是否显示请求头信息 |
| showTiming | boolean | true | 是否显示响应时间 |
| showProxyPath | boolean | true | 是否显示代理路径前缀 |
| formatter | (info: ProxyLogInfo) => string | undefined | 自定义日志格式化函数 |
| filter | (req: IncomingMessage) => boolean | () => true | 过滤特定请求的日志 |

### 自定义日志格式

你可以通过 `formatter` 选项自定义日志输出格式：

```typescript
proxyLogger({
  formatter: (info) => {
    return `${info.method} ${info.url} -> ${info.target} (${info.duration}ms)`
  }
})
```

### 过滤请求

使用 `filter` 选项来过滤特定的请求：

```typescript
proxyLogger({
  filter: (req) => {
    // 只记录 GET 请求
    return req.method === 'GET'
  }
})
```

## 许可证

[MIT](./LICENSE)