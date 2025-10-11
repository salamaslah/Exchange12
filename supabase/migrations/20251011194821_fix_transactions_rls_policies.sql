/*
  # تعديل سياسات RLS لجدول transactions للسماح بالعمليات للمستخدمين المجهولين

  1. التعديلات
    - تحديث سياسة INSERT للسماح لـ anon و authenticated
    - تحديث سياسة UPDATE للسماح لـ anon و authenticated
    - تحديث سياسة DELETE للسماح لـ anon و authenticated

  2. السبب
    - التطبيق يستخدم anon key وليس authenticated user
    - السياسات الحالية تمنع anon من إضافة أو تعديل أو حذف المعاملات
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON transactions;

-- إنشاء سياسات جديدة تسمح لـ anon و authenticated
CREATE POLICY "Anyone can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update transactions"
  ON transactions
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete transactions"
  ON transactions
  FOR DELETE
  TO authenticated, anon
  USING (true);