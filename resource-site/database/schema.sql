-- resources.qiyuan.icu Supabase Schema
-- Migrated from MySQL software_shop database

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_order_done BOOLEAN DEFAULT FALSE,
  mcp_key_hash VARCHAR(255),
  mcp_key_prefix VARCHAR(24),
  mcp_key_created_at TIMESTAMP WITH TIME ZONE,
  mcp_key_revoked BOOLEAN DEFAULT FALSE
);

-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  image_url VARCHAR(500),
  thumb_url VARCHAR(500),
  quark_link VARCHAR(500),
  cloud_type VARCHAR(20),
  contact_tg VARCHAR(100),
  category VARCHAR(50) DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  rating SMALLINT DEFAULT 5,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_no VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quark orders table
CREATE TABLE quark_orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  share_url VARCHAR(500) NOT NULL,
  pwd_id VARCHAR(50) NOT NULL,
  stoken VARCHAR(200),
  fid VARCHAR(100) NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  file_size BIGINT DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  cos_path VARCHAR(500),
  download_url VARCHAR(1000),
  error_msg TEXT,
  payment_no VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_quark_orders_user_id ON quark_orders(user_id);
CREATE INDEX idx_quark_orders_status ON quark_orders(status);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quark_orders ENABLE ROW LEVEL SECURITY;

-- Public read access for products (active only)
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (is_active = TRUE);

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Authenticated users can insert products
CREATE POLICY "Authenticated users can insert products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own products
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own products
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quark orders policies
CREATE POLICY "Users can view own quark orders" ON quark_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quark orders" ON quark_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies
CREATE POLICY "Product images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() = owner);
