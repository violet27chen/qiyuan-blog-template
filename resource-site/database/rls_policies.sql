-- =============================================
-- resources.qiyuan.icu RLS 安全策略
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. users 表：禁止匿名读写，仅允许已登录用户读自己
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果有）
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_auth" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_public" ON users;
DROP POLICY IF EXISTS "users_insert_public" ON users;

-- 已登录用户只能读自己的信息
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- 允许注册（匿名用户插入）
CREATE POLICY "users_insert_public" ON users
  FOR INSERT WITH CHECK (true);

-- 2. products 表：公开读上架商品，登录用户管理自己的
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public" ON products;
DROP POLICY IF EXISTS "products_insert_auth" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;

-- 公开读上架商品
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (is_active = true);

-- 已登录用户可创建商品
CREATE POLICY "products_insert_auth" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 已登录用户只能改自己的
CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 已登录用户只能删自己的
CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- 3. reviews 表：公开读，登录用户可写
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_auth" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;

-- 公开读评论
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (true);

-- 已登录用户可写评论
CREATE POLICY "reviews_insert_auth" ON reviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 已登录用户只能删自己的评论
CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- 4. orders 表：仅登录用户读写自己的
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_auth" ON orders;

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "orders_insert_auth" ON orders
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 5. quark_orders 表：仅登录用户读写自己的
ALTER TABLE quark_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quark_orders_select_own" ON quark_orders;
DROP POLICY IF EXISTS "quark_orders_insert_auth" ON quark_orders;

CREATE POLICY "quark_orders_select_own" ON quark_orders
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "quark_orders_insert_auth" ON quark_orders
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 完成！
SELECT 'RLS policies applied successfully' AS result;
