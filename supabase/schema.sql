-- Run this in Supabase: SQL Editor → New query → paste → Run.
-- Then add DATABASE_URL to .env.local (Project Settings → Database → Connection string → URI).

CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  gender TEXT,
  city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  customer_segment TEXT,
  loyalty_tier TEXT
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,
  price DOUBLE PRECISION NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (customer_id),
  order_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  billing_zip TEXT,
  shipping_zip TEXT,
  shipping_state TEXT,
  payment_method TEXT,
  device_type TEXT,
  ip_country TEXT,
  promo_used INTEGER NOT NULL DEFAULT 0,
  promo_code TEXT,
  order_subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  shipping_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  order_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_fraud INTEGER,
  predicted_is_fraud INTEGER
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (product_id),
  quantity INTEGER NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  line_total DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- Seed (safe to re-run)
INSERT INTO customers (full_name, email, gender, city, customer_state, customer_zip, customer_segment, loyalty_tier, is_active)
VALUES
  ('Alice Carter', 'alice@example.com', 'F', 'Seattle', 'WA', '98101', 'standard', 'gold', 1),
  ('Bob Singh', 'bob@example.com', 'M', 'Portland', 'OR', '97201', 'premium', 'silver', 1),
  ('Charlie Nguyen', 'charlie@example.com', 'M', 'Austin', 'TX', '78701', 'standard', 'bronze', 1)
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (product_name, price, is_active)
VALUES
  ('Notebook', 6.99, 1),
  ('Pen Set', 4.99, 1),
  ('Backpack', 45.99, 1),
  ('Water Bottle', 15.99, 1)
ON CONFLICT (product_name) DO NOTHING;
