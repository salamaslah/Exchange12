/*
  # جعل حقل تاريخ الميلاد اختياري في جدول customers

  1. التغييرات
    - جعل حقل `birth_date` في جدول `customers` اختياري (NULL)
    - هذا يسمح بإضافة زبائن بدون تاريخ ميلاد

  2. السبب
    - بعض الخدمات لا تتطلب تاريخ ميلاد
    - يمكن إضافة تاريخ الميلاد لاحقاً عند الحاجة
*/

-- جعل حقل birth_date اختياري
ALTER TABLE customers
ALTER COLUMN birth_date DROP NOT NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN customers.birth_date IS 'تاريخ ميلاد الزبون (اختياري - يتم ملؤه عند الحاجة)';
