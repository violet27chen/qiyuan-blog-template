# resources.qiyuan.icu Serverless

网盘资源分享站，基于 EdgeOne Pages + 边缘函数 + Supabase 的纯无服务器架构。

https://resources.qiyuan.icu

## 架构图

```
用户浏览器
  │
  ├─ 静态页面 ──→ EdgeOne Pages (public/)
  │
  └─ API 请求 ──→ EdgeOne Edge Function (edge-functions/api/[[default]].js)
                    │
                    ├─ 认证 (JWT)
                    ├─ 业务逻辑
                    ├─ 图片代理 (/api/images/*)
                    │
                    └─ Supabase
                         ├─ PostgreSQL (users, products, reviews, orders, quark_orders)
                         └─ Storage (product-images 桶)
```

## 核心原则

- ✅ 纯 Serverless，无需运维自己的服务器
- ✅ SEO 友好，首页和详情页公开访问
- ✅ 安全的 RLS 策略 + 边缘函数校验
- ✅ 支持多种网盘链接自动识别

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 纯 HTML/CSS/JS，无框架 |
| 边缘函数 | EdgeOne Edge Function (Web API) |
| 数据库 | Supabase PostgreSQL |
| 对象存储 | Supabase Storage |
| 认证 | JWT (Edge Function 内签发验证) |
| 部署 | GitHub → EdgeOne Pages 自动部署 |

## 项目结构

```
resource-site/
├── edge-functions/
│   └── api/
│       └── [[default]].js    # 边缘函数主入口 (通配符路由)
├── public/                    # 静态前端文件（本模板未含，需自建或从原站取用）
│   ├── index.html             # 首页（商品列表）
│   ├── dashboard.html         # 管理后台（商品 CRUD + MCP 配置）
│   ├── product.html           # 商品详情（公开访问）
│   ├── ai/mcp-publisher-skill.md # 在线 MCP Skill 文档
│   └── ...
├── database/
│   ├── schema.sql             # 数据库建表 SQL
│   └── rls_policies.sql       # RLS 安全策略
└── docs/
    ├── API.md                 # API 接口文档
    ├── DATABASE.md            # 数据库文档
    └── DEPLOYMENT.md          # 部署指南
```

## 功能亮点

### 1. 商品管理
- 创建/编辑/删除/上下架商品
- 支持多种网盘链接自动识别
- 图片上传（最大 5MB）

### 2. MCP 集成
- 用户在管理后台可生成个人 MCP Key
- 支持三种图片上传方式
  - ✅ 直接文件上传 (`/api/mcp/upload/{MCP_KEY}`)
  - ✅ URL 上传 (`upload_product_image_from_url`)
  - ✅ Base64 上传 (`upload_product_image`)
- 在线 Skill 文档供智能体调用

### 3. 密码安全
- SHA-256 哈希存储密码
- 密码必须包含：大写 + 小写 + 数字 + 符号
- 修改密码必须验证旧密码

### 4. SEO 友好
- 首页和详情页公开访问，无需登录
- 支持分类和搜索

## 支持的网盘类型

| 国内网盘 | 国际网盘 |
|---|---|
| 夸克、百度、阿里云、蓝奏、城通、115、天翼、微云、坚果云、迅雷、光鸭 | OneDrive、Google Drive、MEGA、pCloud、MediaFire、WeTransfer、Box、Dropbox |

## API 接口

所有接口前缀 `/api`，完整文档见 [docs/API.md](docs/API.md)。

| 类别 | 说明 |
|---|---|
| 认证 | 登录、注册、退出、修改密码 |
| 商品 | 列表、详情、CRUD、上下架 |
| 图片 | 代理访问、上传 |
| MCP | JSON-RPC 2.0 接口 + 直接文件上传 |

## 环境变量

在 EdgeOne 控制台配置：

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # 服务端密钥
JWT_SECRET=***               # JWT 签名密钥
```

## 部署

详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

> 本目录为**资源站后端**（边缘函数 + 数据库 Schema + 文档），需作为**独立项目单独部署**，与博客分开。博客通过 `RESOURCES_API_PROXY` / 共用同一套 Supabase 数据库来引用本站数据。前端页面（`public/`）未随模板附带，可自行编写或从原站取用。
