# qiyuan.icu 资源站 API 文档

所有接口前缀 `/api`，请求/响应均为 JSON。

> AI 发布助手系统提示词见 [ai-resources-publisher-prompt.md](./ai-resources-publisher-prompt.md)

---

## MCP 发布接口（博客专属）

### 1) POST /api/mcp/key

用账号密码换取 MCP Key（一次性明文返回）。

### 2) POST /api/mcp/<YOUR_MCP_KEY>

标准 JSON-RPC MCP 入口（支持 `tools/list`、`tools/call`、`publish_product` 等）。

### 3) POST /api/mcp/publish/<YOUR_MCP_KEY>

快捷发布入口（免 JSON-RPC 包装，直接传资源字段）。

**请求体：**

```json
{
  "name": "资源名称",
  "description": "资源描述",
  "category": "分类",
  "drive_link": "https://pan.quark.cn/s/xxx",
  "image_url": "/api/images/xxx.jpg",
  "thumb_url": "/api/images/xxx_thumb.jpg",
  "price": 0,
  "is_active": true
}
```

**必填字段：**

- `name`
- `drive_link`（也可用 `link` / `quark_link` / `pan_link` / `cloud_link`）
- `image_url`

---

## 固定密钥发布接口（不走登录 / 不用 MCP Key）

### POST /api/publish

用一个写在 **EdgeOne Functions 环境变量**里的固定密钥发布资源，适合“博客自用发布”。

**需要在 EdgeOne 配置：**

- `PUBLISH_KEY`：填一个**有效 MCP Key**（只在 EdgeOne 环境变量里保存）

**请求头：**

```
X-PUBLISH-KEY: <PUBLISH_KEY>
```

**请求体：**同上面的快捷发布字段（`name` / `drive_link` / `image_url` 必填）

## 认证

大部分接口需要 JWT 认证。在请求头中携带：

```
Authorization: Bearer <token>
```

Token 通过登录/注册接口获取，有效期 7 天。

---

## 密码规则

注册和修改密码时，密码必须同时满足以下全部条件：

- 至少一个大写字母（A-Z）
- 至少一个小写字母（a-z）
- 至少一个数字（0-9）
- 至少一个符号（非字母数字字符，如 !@#$%^&*）

修改密码时，新密码不能与旧密码相同。

前端在注册页和管理后台修改密码时会实时显示密码强度进度条和要求清单，按钮在条件不满足时禁用。

---

## 认证接口

### POST /api/auth/login

用户登录。

**请求体：**

```json
{
  "username": "用户名或邮箱",
  "password": "***"
}
```

**成功响应 (200)：**

```json
{
  "token": "***",
  "user": {
    "id": 1,
    "username": "violet",
    "email": "violet@example.com"
  }
}
```

**错误响应 (401)：**

```json
{
  "error": "用户名或密码错误"
}
```

---

### POST /api/auth/register

用户注册。密码必须满足复杂度要求。

**请求体：**

```json
{
  "username": "用户名",
  "email": "邮箱",
  "password": "***",
  "confirm_password": "确认密码"
}
```

**密码复杂度要求：**

- 必须包含至少一个大写字母
- 必须包含至少一个小写字母
- 必须包含至少一个数字
- 必须包含至少一个符号

**成功响应 (200)：**

```json
{
  "token": "***",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "new@example.com"
  }
}
```

**错误响应：**

- 400: 缺少必填字段
- 400: 密码不一致
- 400: 用户名至少3位
- 400: 密码需包含至少一个大写字母 / 小写字母 / 数字 / 符号
- 400: 用户名或邮箱已注册

---

### GET /api/auth/me

获取当前登录用户信息。需要认证。

**请求头：**

```
Authorization: Bearer <token>
```

**成功响应 (200)：**

```json
{
  "user": {
    "id": 1,
    "username": "violet",
    "email": "violet@example.com",
    "created_at": "2026-06-19T08:48:28+00:00"
  }
}
```

**错误响应 (401)：**

```json
{
  "error": "未登录"
}
```

---

### POST /api/auth/logout

退出登录。服务端无状态，客户端清除 localStorage 中的 token 即可。

**响应 (200)：**

```json
{
  "message": "已退出"
}
```

---

### POST /api/auth/change-password

修改密码。需要认证。

**请求体：**

```json
{
  "current_password": "当前密码",
  "new_password": "新密码",
  "confirm_password": "确认新密码"
}
```

**校验规则：**

1. 当前密码必须正确
2. 新密码必须满足复杂度要求（大写+小写+数字+符号）
3. 新密码不能与旧密码相同
4. 新密码与确认密码必须一致

**成功响应 (200)：**

```json
{
  "message": "密码修改成功"
}
```

**错误响应：**

- 401: 请先登录
- 401: 当前密码错误
- 400: 新密码需包含至少一个大写字母 / 小写字母 / 数字 / 符号
- 400: 新密码不一致
- 400: 新密码不能与旧密码相同

---

## 分类接口

### GET /api/categories

获取所有上架商品的去重分类列表。无需认证。

**成功响应 (200)：**

```json
{
  "categories": ["编程工具", "系统工具", "多媒体"]
}
```

---

## 商品接口

### GET /api/products

获取商品列表（首页用，返回所有上架商品）。

**注意：** 管理后台请使用 `?all=1` 参数（见下方）。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `q` | string | 空 | 搜索关键词（匹配名称和描述） |
| `cat` | string | 空 | 分类筛选，`all` 或空表示全部 |
| `page` | int | 1 | 页码 |
| `limit` | int | 20 | 每页数量 |
| `all` | string | 空 | 设为 `1` 时需登录，只返回当前用户的商品（含下架），管理后台用 |

**请求示例：**

```
GET /api/products?q=Python&cat=编程工具&page=1&limit=10
GET /api/products?all=1  （管理后台，需 Bearer token）
```

**成功响应 (200)：**

```json
{
  "products": [
    {
      "id": 16,
      "user_id": "uuid",
      "name": "Python练手项目合集",
      "description": "...",
      "price": 0,
      "image_url": "/api/images/python_projects.jpg",
      "thumb_url": null,
      "quark_link": "https://pan.quark.cn/s/xxx",
      "cloud_type": "quark",
      "category": "编程工具",
      "is_active": true,
      "created_at": "2026-06-19T08:48:28+00:00"
    }
  ],
  "total": 16,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/products/:id

获取单个商品详情及评论。无需认证。

**路径参数：**

| 参数 | 说明 |
|---|---|
| `id` | 商品 ID |

**成功响应 (200)：**

```json
{
  "product": {
    "id": 3,
    "user_id": "uuid",
    "name": "视频音频文案分离工具",
    "description": "...",
    "image_url": "/api/images/video_tool.jpg",
    "quark_link": "https://pan.quark.cn/s/xxx",
    "cloud_type": "quark",
    "category": "效率工具",
    "is_active": true,
    "created_at": "2026-06-19T08:48:28+00:00"
  },
  "reviews": [
    {
      "id": 1,
      "product_id": 3,
      "user_id": "uuid",
      "username": "violet",
      "rating": 5,
      "content": "很好用！",
      "created_at": "2026-06-20T10:00:00+00:00"
    }
  ]
}
```

---

### POST /api/products

创建商品。需要认证。

**请求体：**

```json
{
  "name": "商品名称",
  "description": "商品描述",
  "category": "分类",
  "image_url": "/api/images/xxx.jpg",
  "thumb_url": "/api/images/xxx_thumb.jpg",
  "quark_link": "https://pan.quark.cn/s/xxx",
  "is_active": true
}
```

**说明：**

- `user_id` 自动绑定当前登录用户
- `cloud_type` 根据 `quark_link` 自动识别
- `image_url` 和 `thumb_url` 使用 `/api/images/filename` 格式

**成功响应 (200)：**

```json
{
  "product": { "id": 17, "name": "...", ... }
}
```

---

### PUT /api/products/:id

编辑商品。需要认证，仅创建者可操作。

**请求体：** 同创建商品，字段可选。

**错误响应：**

- 403: 无权修改

---

### DELETE /api/products/:id

删除商品。需要认证，仅创建者可操作。会同时删除关联的评论。

**错误响应：**

- 403: 无权删除

---

### POST /api/products/:id/toggle

切换商品上下架状态。需要认证，仅创建者可操作。

**成功响应 (200)：**

```json
{
  "product": { "id": 3, "is_active": false, ... }
}
```

---

## 评论接口

### GET /api/products/:id/reviews

获取商品评论。无需认证。

---

### POST /api/products/:id/reviews

发表评论。需要认证。

**请求体：**

```json
{
  "rating": 5,
  "content": "评论内容"
}
```

**校验：** rating 必须在 1-5 之间。

**说明：** `username` 自动从当前用户信息同步，无需传入。

---

## 图片接口

### GET /api/images/:filename

图片代理。将请求转发到 Supabase Storage，返回图片内容。

**说明：**

- 设置了长期缓存 (`Cache-Control: public, max-age=31536000`)
- 不暴露 Supabase 直链

---

### POST /api/upload

上传图片。需要认证。

**请求：** `multipart/form-data`，字段名 `file`。

**限制：** 最大 5MB，支持 JPG/PNG。

**成功响应 (200)：**

```json
{
  "url": "/api/images/product_1234567890_abc123.jpg",
  "filename": "product_1234567890_abc123.jpg"
}
```
