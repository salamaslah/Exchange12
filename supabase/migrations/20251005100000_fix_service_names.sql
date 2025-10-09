/*
  # إصلاح أسماء الخدمات في قاعدة البيانات

  1. المشكلة
    - جميع الخدمات يتم عرضها باسم واحد فقط
    - يجب التأكد من أن كل خدمة لها الاسم الصحيح بجميع اللغات

  2. الحل
    - تحديث جميع أسماء الخدمات بشكل صحيح
    - التأكد من وجود الترجمات العبرية والإنجليزية

  3. البيانات المحدثة
    - الخدمة 1: إنشاء فيزا / יצירת כרטיס / Create Card
    - الخدمة 2: تحويل للخارج / העברה לחו"ל / International Transfer
    - الخدمة 3: سحب حوالة / משיכת העברה / Receive Transfer
    - الخدمة 4: صرافة شيكات / פדיון צ'קים / Check Cashing
    - الخدمة 5: تحويل لحساب بنك / העברה לחשבון הבנק / Bank Account Transfer
    - الخدمة 6: سحب من الفيزا / משיכה מכרטיס / Card Withdrawal
    - الخدمة 7: إيداع في الفيزا / הפקדה בכרטיס / Card Deposit
    - الخدمة 8: صرافة أموال / החלפת כספים / Money Exchange
*/

-- تحديث جميع الخدمات بأسمائها الصحيحة
UPDATE services
SET
  service_name = 'إنشاء فيزا',
  service_name_he = 'יצירת כרטיס',
  service_name_en = 'Create Card',
  updated_at = now()
WHERE service_number = 1;

UPDATE services
SET
  service_name = 'تحويل للخارج',
  service_name_he = 'העברה לחו"ל',
  service_name_en = 'International Transfer',
  updated_at = now()
WHERE service_number = 2;

UPDATE services
SET
  service_name = 'سحب حوالة',
  service_name_he = 'משיכת העברה',
  service_name_en = 'Receive Transfer',
  updated_at = now()
WHERE service_number = 3;

UPDATE services
SET
  service_name = 'صرافة شيكات',
  service_name_he = 'פדיון צ\'קים',
  service_name_en = 'Check Cashing',
  updated_at = now()
WHERE service_number = 4;

UPDATE services
SET
  service_name = 'تحويل لحساب بنك صاحب المحل',
  service_name_he = 'העברה לחשבון הבנק',
  service_name_en = 'Bank Account Transfer',
  updated_at = now()
WHERE service_number = 5;

UPDATE services
SET
  service_name = 'سحب من الفيزا',
  service_name_he = 'משיכה מכרטיס',
  service_name_en = 'Card Withdrawal',
  updated_at = now()
WHERE service_number = 6;

UPDATE services
SET
  service_name = 'إيداع في الفيزا',
  service_name_he = 'הפקדה בכרטיס',
  service_name_en = 'Card Deposit',
  updated_at = now()
WHERE service_number = 7;

UPDATE services
SET
  service_name = 'صرافة أموال',
  service_name_he = 'החלפת כספים',
  service_name_en = 'Money Exchange',
  updated_at = now()
WHERE service_number = 8;
