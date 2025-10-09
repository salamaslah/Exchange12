/*
  # إضافة خدمة صرافة الأموال

  1. التغييرات على جدول services
    - إضافة خدمة جديدة برقم 8 لصرافة الأموال
    - إضافة الترجمات بالعبرية والإنجليزية

  2. البيانات
    - إدراج خدمة صرافة الأموال الجديدة
*/

-- إضافة خدمة صرافة الأموال
INSERT INTO services (service_number, service_name, service_name_he, service_name_en) VALUES
(8, 'صرافة أموال', 'החלפת כספים', 'Money Exchange')
ON CONFLICT (service_number) DO UPDATE SET
  service_name = EXCLUDED.service_name,
  service_name_he = EXCLUDED.service_name_he,
  service_name_en = EXCLUDED.service_name_en,
  updated_at = now();