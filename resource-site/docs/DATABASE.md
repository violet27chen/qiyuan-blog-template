# resources.qiyuan.icu 数据库文档

Supabase PostgreSQL 数据库，项目 ID：`your-project`

## 表结构

### users 用户表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | UUID | 主键，自动生成 |
| `username` | TEXT | 用户名，唯一 |
| `email` | TEXT | 邮箱，唯一 |
| `password_hash` | TEXT | SHA-256 密码哈希 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**索引：**
- `users_username_key` (UNIQUE ON username)
- `users_email_key` (UNIQUE ON email)

**安全策略：**
- `REVOKE ALL ON users FROM anon` — 匿名用户完全无法访问
- 仅 `service_role`（边缘函数）可读写

---

### products 商品表

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  image_url TEXT,
  thumb_url TEXT,
  quark_link TEXT,
  cloud_type TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `user_id` | UUID | 创建者，关联 users.id |
| `name` | TEXT | 商品名称 |
| `description` | TEXT | 商品描述 |
| `price` | NUMERIC | 价格，默认 0（免费） |
| `image_url` | TEXT | 商品图片 URL（`/api/images/xxx`） |
| `thumb_url` | TEXT | 缩略图 URL |
| `quark_link` | TEXT | 网盘下载链接 |
| `cloud_type` | TEXT | 网盘类型（自动识别） |
| `category` | TEXT | 分类 |
| `is_active` | BOOLEAN | 是否上架，默认 true |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**支持的 cloud_type 值：**

| 国内 | 国际 |
|---|---|
| quark, baidu, aliyun, lanzou, ctfile, 115, tianyi, weiyun, nutstore | onedrive, gdrive, mega, pcloud, mediafire, wetransfer, box, dropbox |

**图片 URL 格式：**
- `image_url` 和 `thumb_url` 统一存储 `/api/images/filename` 格式
- 通过 Edge Function 图片代理访问，不暴露 Supabase 直链

**安全策略：**
- 匿名用户只能读取 `is_active = true` 的商品
- 写入/编辑/删除需通过边缘函数（service_role）

---

### reviews 评论表

```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  username TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `product_id` | INTEGER | 关联商品，删除商品时级联删除 |
| `user_id` | UUID | 评论者 |
| `username` | TEXT | 评论者用户名（发评论时从 users 表同步） |
| `rating` | INTEGER | 评分 1-5 |
| `content` | TEXT | 评论内容 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**安全策略：**
- 匿名用户可读取所有评论
- 写入需通过边缘函数（service_role）

---

### orders 订单表

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `user_id` | UUID | 用户 |
| `product_id` | INTEGER | 关联商品 |
| `status` | TEXT | 订单状态，默认 pending |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**安全策略：**
- 仅 `service_role` 可访问

---

### quark_orders 夸克代下载表

```sql
CREATE TABLE quark_orders (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**安全策略：**
- 仅 `service_role` 可访问

---

## RLS 安全策略

执行 `database/rls_policies.sql` 配置行级安全：

```sql
-- 撤销 anon 对敏感表的权限
REVOKE ALL ON users FROM anon;
REVOKE ALL ON orders FROM anon;
REVOKE ALL ON quark_orders FROM anon;

-- 只给 anon 读上架商品和评论
GRANT SELECT ON products TO anon;
GRANT SELECT ON reviews TO anon;

-- service_role 保持完整权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quark_orders ENABLE ROW LEVEL SECURITY;

-- products: anon 只读上架
CREATE POLICY products_select_public ON products FOR SELECT USING (is_active = true);

-- reviews: anon 只读
CREATE POLICY reviews_select_public ON reviews FOR SELECT USING (true);
```

## 数据迁移

如需从其他数据源迁移数据，可参考以下脚本：

```bash
# 迁移商品
python3 migrate_products.py

# 迁移用户
python3 migrate_users.py

# 迁移图片到 Supabase Storage
python3 migrate_images.py
```
