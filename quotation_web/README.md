# 知底装修报价网页

一个适合团队内部直接分享的装修报价网页。打开链接后，同事输入统一团队密码，就能创建、编辑、复制、打印报价单，并维护按空间分类的项目库。

## 功能

- 团队密码登录
- 按空间组织的报价编辑器
- 从项目库快速勾选项目到不同空间
- 综合价 / 人工材料分拆价切换
- 自动保存与版本冲突保护
- 报价记录、复制报价、打印页
- 本地文件存储或 Supabase 存储

## 本地启动

1. 安装依赖

   ```bash
   pnpm install
   ```

2. 复制环境变量

   ```bash
   cp .env.example .env.local
   ```

3. 启动开发环境

   ```bash
   pnpm dev
   ```

4. 打开 [http://localhost:3000/login](http://localhost:3000/login)

默认不开 Supabase 时，数据会写入 `data/dev-db.json`。

## 环境变量

- `TEAM_PASSWORD`: 团队统一登录密码
- `SESSION_SECRET`: 会话签名密钥
- `QUOTATION_STORAGE`: `file` 或 `supabase`
- `QUOTATION_DATA_FILE`: 文件存储模式下的数据文件路径
- `SUPABASE_URL`: Supabase 项目地址
- `SUPABASE_SERVICE_ROLE_KEY`: 服务端写入用密钥

测试 Supabase 契约时额外使用：

- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`

## Supabase 初始化

在 Supabase SQL Editor 依次执行：

1. [supabase/schema.sql](/Users/liupei/Documents/zhidi/.worktrees/renovation-quotation-web/quotation_web/supabase/schema.sql)
2. [supabase/seed.sql](/Users/liupei/Documents/zhidi/.worktrees/renovation-quotation-web/quotation_web/supabase/seed.sql)

然后把环境变量改成：

```env
QUOTATION_STORAGE=supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 分享给同事

推荐两种方式：

1. 本地先验证完成后部署到 Vercel。
2. 在 Vercel 配好同样的环境变量，所有同事直接访问同一个网址。

至少要配置：

- `TEAM_PASSWORD`
- `SESSION_SECRET`
- `QUOTATION_STORAGE`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（如果用 Supabase）

## 验证命令

```bash
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build
pnpm verify
```
