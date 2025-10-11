/*
  # تحديث سياسات RLS لجميع الجداول للسماح بالعمليات للمستخدمين المجهولين

  1. التعديلات
    - تحديث سياسات currencies
    - تحديث سياسات services
    - تحديث سياسات customers

  2. السبب
    - التطبيق يستخدم anon key
    - يجب السماح لـ anon بإجراء جميع العمليات
*/

-- ============ currencies ============
DROP POLICY IF EXISTS "Authenticated users can insert currencies" ON currencies;
DROP POLICY IF EXISTS "Authenticated users can update currencies" ON currencies;
DROP POLICY IF EXISTS "Authenticated users can delete currencies" ON currencies;

CREATE POLICY "Anyone can insert currencies"
  ON currencies FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update currencies"
  ON currencies FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete currencies"
  ON currencies FOR DELETE
  TO authenticated, anon
  USING (true);

-- ============ services ============
DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;

CREATE POLICY "Anyone can insert services"
  ON services FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update services"
  ON services FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete services"
  ON services FOR DELETE
  TO authenticated, anon
  USING (true);

-- ============ customers ============
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

CREATE POLICY "Anyone can insert customers"
  ON customers FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
  ON customers FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete customers"
  ON customers FOR DELETE
  TO authenticated, anon
  USING (true);