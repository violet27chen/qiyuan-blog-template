# resources.qiyuan.icu 部署指南

## 前置条件

- GitHub 仓库：`your-username/resource-site`（可任意命名）
- EdgeOne 账号（腾讯云）
- Supabase 账号（项目 `your-project`）

## 部署流程

### 1. 代码推送

```bash
cd ~/resource-site
git add -A
git commit -m "feat: xxx"
git push origin main
```

EdgeOne 自动拉取 `main` 分支并部署：
- `public/` 目录 → 静态页面
- `edge-functions/` 目录 → 边缘函数

### 2. 环境变量配置

在 EdgeOne 控制台 → 边缘函数 → 环境变量 中配置：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=***
```

### 3. Supabase 数据库

在 Supabase SQL 编辑器中执行：
1. `database/schema.sql` — 建表
2. `database/rls_policies.sql` — RLS 安全策略

### 4. Supabase Storage

1. 创建 Storage Bucket：`product-images`
2. 设置为公开访问（或通过 API 代理访问）

## 边缘函数路由

EdgeOne 通过目录结构自动生成路由：

```
edge-functions/
└── api/
    └── [[default]].js    → 匹配 /api/* 所有路径
```

**重要：** 路由自动生成，不可手动配置。修改路由需修改 `[[default]].js` 中的路径匹配逻辑。

## 环境变量读取

在边缘函数中通过 `context.env` 读取：

```javascript
export default async function onRequest(context) {
  const env = context.env || {};
  const SUPABASE_URL = env.SUPABASE_URL || '';
  // ...
}
```

## 权限模型

### 用户隔离

| 操作 | 权限 |
|---|---|
| 首页商品列表 `GET /api/products` | 公开，返回所有上架商品 |
| 管理后台列表 `GET /api/products?all=1` | 需登录，**只返回当前用户的商品**（含下架） |
| 创建商品 `POST /api/products` | 需登录，自动绑定 `user_id` |
| 编辑商品 `PUT /api/products/:id` | 需登录，校验 `user_id`，仅创建者 |
| 删除商品 `DELETE /api/products/:id` | 需登录，校验 `user_id`，仅创建者 |
| 上下架切换 `POST /api/products/:id/toggle` | 需登录，校验 `user_id`，仅创建者 |
| 发表评论 `POST /api/products/:id/reviews` | 需登录 |
| 获取网盘链接 | 需登录（商品详情页"免费获取"按钮） |
| 修改密码 `POST /api/auth/change-password` | 需登录，验证当前密码 + 新密码复杂度 |

### 数据库安全 (RLS)

- `users` 表：`REVOKE ALL FROM anon`，匿名完全不可访问
- `products` 表：匿名只读上架商品
- `reviews` 表：匿名只读
- `orders` / `quark_orders`：仅 service_role 访问

### 认证流程

```
登录/注册 → 服务端签发 JWT（含 user_id） → 前端存 localStorage
请求时 → Authorization: Bearer <token> → 服务端解码获取 user_id → 校验权限
```

## 密码安全

- 密码使用 SHA-256 哈希存储
- **复杂度要求**：必须同时包含大写字母、小写字母、数字和符号
- **修改密码**：新密码不能与旧密码相同
- **前端校验**：注册和修改密码页面实时显示密码强度，按钮在条件不满足时禁用

## 静态文件缓存

EdgeOne CDN 对静态文件有缓存。更新后如需立即生效：

- 添加版本号参数：`style.css?v=13`
- 或等待 CDN 缓存过期

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Supabase 凭据
```

## 常见问题

### 图片 404

- 检查图片是否在 Supabase Storage 中
- 检查数据库中 `image_url` 是否为 `/api/images/xxx` 格式
- 检查边缘函数 `/api/images/*` 路由是否正常

### 登录失败

- 检查密码哈希算法是否匹配（新站用 SHA-256）
- 检查 JWT_SECRET 环境变量是否配置

### 注册失败

- 检查密码是否满足复杂度要求（大写+小写+数字+符号）
- 检查用户名或邮箱是否已注册

### 边缘函数 500

- 检查 SUPABASE_SERVICE_KEY 是否正确
- 检查环境变量是否在 EdgeOne 控制台配置（不是 .env 文件）
