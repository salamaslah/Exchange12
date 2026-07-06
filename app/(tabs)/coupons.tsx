import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, SafeAreaView, Alert, Dimensions, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { couponService, currencyService } from '@/lib/supabase';

interface Coupon {
  id: string;
  code: string;
  type: 'currency_exchange' | 'bank_transfer';
  currency_code?: string;
  discounted_buy_rate?: number;
  discounted_sell_rate?: number;
  discount_percentage?: number;
  is_active: boolean;
  is_used: boolean;
  used_at?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
}

interface Currency {
  id: string;
  code: string;
  name_ar: string;
  buy_rate?: number;
  sell_rate?: number;
  is_active: boolean;
}

const DARK = '#1A2332';
const GOLD = '#C8A84B';
const GRAY = '#7A8A99';
const LIGHT = '#F4F6F9';
const WHITE = '#FFFFFF';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';
const TEAL = '#00695C';

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');

  // Form state
  const [formType, setFormType] = useState<'currency_exchange' | 'bank_transfer'>('currency_exchange');
  const [formCurrency, setFormCurrency] = useState('');
  const [formBuyRate, setFormBuyRate] = useState('');
  const [formSellRate, setFormSellRate] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedCurrencyObj, setSelectedCurrencyObj] = useState<Currency | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const router = useRouter();
  const { width } = Dimensions.get('window');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const lang = await AsyncStorage.getItem('selectedLanguage');
      if (lang && ['ar', 'he', 'en'].includes(lang)) setLanguage(lang as 'ar' | 'he' | 'en');

      const [fetchedCoupons, fetchedCurrencies] = await Promise.all([
        couponService.getAll(),
        currencyService.getAll(),
      ]);
      setCoupons(fetchedCoupons);
      setCurrencies(fetchedCurrencies.filter((c: Currency) => c.is_active));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    const code = couponService.generateCode('currency_exchange');
    setGeneratedCode(code);
    setFormType('currency_exchange');
    setFormCurrency('');
    setFormBuyRate('');
    setFormSellRate('');
    setFormDiscount('');
    setFormExpiry('');
    setFormNotes('');
    setSelectedCurrencyObj(null);
    setShowModal(true);
  };

  const regenerateCode = () => {
    setGeneratedCode(couponService.generateCode(formType));
  };

  const handleTypeChange = (t: 'currency_exchange' | 'bank_transfer') => {
    setFormType(t);
    setGeneratedCode(couponService.generateCode(t));
    setFormCurrency('');
    setFormBuyRate('');
    setFormSellRate('');
    setFormDiscount('');
    setSelectedCurrencyObj(null);
  };

  const selectCurrency = (currency: Currency) => {
    setFormCurrency(currency.code);
    setSelectedCurrencyObj(currency);
    setFormBuyRate(currency.buy_rate?.toFixed(4) ?? '');
    setFormSellRate(currency.sell_rate?.toFixed(4) ?? '');
    setShowCurrencyPicker(false);
  };

  const handleSave = async () => {
    if (formType === 'currency_exchange') {
      if (!formCurrency) {
        Alert.alert('', language === 'ar' ? 'اختر العملة' : language === 'he' ? 'בחר מטבע' : 'Select currency');
        return;
      }
      if (!formBuyRate && !formSellRate) {
        Alert.alert('', language === 'ar' ? 'أدخل سعر الشراء أو البيع' : 'Enter buy or sell rate');
        return;
      }
    } else {
      if (!formDiscount || isNaN(parseFloat(formDiscount)) || parseFloat(formDiscount) <= 0 || parseFloat(formDiscount) > 100) {
        Alert.alert('', language === 'ar' ? 'أدخل نسبة خصم صحيحة (1-100)' : 'Enter a valid discount % (1-100)');
        return;
      }
    }

    try {
      setSaving(true);
      const payload: any = {
        code: generatedCode,
        type: formType,
        notes: formNotes || undefined,
        expires_at: formExpiry ? new Date(formExpiry).toISOString() : undefined,
      };
      if (formType === 'currency_exchange') {
        payload.currency_code = formCurrency;
        if (formBuyRate) payload.discounted_buy_rate = parseFloat(formBuyRate);
        if (formSellRate) payload.discounted_sell_rate = parseFloat(formSellRate);
      } else {
        payload.discount_percentage = parseFloat(formDiscount);
      }
      await couponService.create(payload);
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('', e?.message?.includes('duplicate') ? (language === 'ar' ? 'الرمز موجود مسبقاً، أعد التوليد' : 'Code already exists, regenerate') : String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await couponService.toggleActive(coupon.id, !coupon.is_active);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (coupon: Coupon) => {
    Alert.alert(
      language === 'ar' ? 'حذف الكوبون' : 'Delete Coupon',
      language === 'ar' ? `هل تريد حذف الكوبون ${coupon.code}؟` : `Delete coupon ${coupon.code}?`,
      [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ar' ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            await couponService.delete(coupon.id);
            await loadData();
          }
        }
      ]
    );
  };

  const statusLabel = (c: Coupon) => {
    if (c.is_used) return { label: language === 'ar' ? 'مستخدم' : 'Used', color: GRAY };
    if (!c.is_active) return { label: language === 'ar' ? 'معطّل' : 'Disabled', color: ERROR };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: language === 'ar' ? 'منتهي' : 'Expired', color: GRAY };
    return { label: language === 'ar' ? 'فعّال' : 'Active', color: SUCCESS };
  };

  const isRTL = language === 'ar' || language === 'he';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {language === 'ar' ? 'إدارة الكوبونات' : language === 'he' ? 'ניהול קופונים' : 'Coupon Management'}
        </Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreateModal}>
          <Text style={s.addBtnTxt}>+ {language === 'ar' ? 'جديد' : language === 'he' ? 'חדש' : 'New'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{coupons.length}</Text>
          <Text style={s.statLbl}>{language === 'ar' ? 'الكل' : 'Total'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: SUCCESS }]}>{coupons.filter(c => c.is_active && !c.is_used).length}</Text>
          <Text style={s.statLbl}>{language === 'ar' ? 'فعّال' : 'Active'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: GRAY }]}>{coupons.filter(c => c.is_used).length}</Text>
          <Text style={s.statLbl}>{language === 'ar' ? 'مستخدم' : 'Used'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={s.emptyTxt}>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</Text>
        ) : coupons.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🎟️</Text>
            <Text style={s.emptyTxt}>{language === 'ar' ? 'لا توجد كوبونات بعد' : 'No coupons yet'}</Text>
            <Text style={s.emptySubTxt}>{language === 'ar' ? 'اضغط + جديد لإنشاء كوبون خصم' : 'Press + New to create a discount coupon'}</Text>
          </View>
        ) : (
          coupons.map(coupon => {
            const st = statusLabel(coupon);
            return (
              <View key={coupon.id} style={[s.card, !coupon.is_active && s.cardDisabled]}>
                <View style={s.cardTop}>
                  <View style={s.codeBox}>
                    <Text style={s.codeTxt}>{coupon.code}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: st.color + '20', borderColor: st.color }]}>
                    <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.typeLbl}>
                    {coupon.type === 'currency_exchange'
                      ? (language === 'ar' ? 'صرافة عملات' : 'Currency Exchange')
                      : (language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer')}
                  </Text>
                  {coupon.type === 'currency_exchange' ? (
                    <View style={s.rateRow}>
                      <Text style={s.currencyCode}>{coupon.currency_code}</Text>
                      {coupon.discounted_buy_rate != null && (
                        <Text style={s.rateChip}>
                          {language === 'ar' ? 'شراء' : 'Buy'}: <Text style={s.rateValue}>{coupon.discounted_buy_rate.toFixed(4)}</Text>
                        </Text>
                      )}
                      {coupon.discounted_sell_rate != null && (
                        <Text style={s.rateChip}>
                          {language === 'ar' ? 'بيع' : 'Sell'}: <Text style={s.rateValue}>{coupon.discounted_sell_rate.toFixed(4)}</Text>
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={s.discountLbl}>
                      {language === 'ar' ? 'خصم' : 'Discount'}: <Text style={s.discountVal}>{coupon.discount_percentage}%</Text>
                    </Text>
                  )}
                  {coupon.notes ? <Text style={s.notes}>{coupon.notes}</Text> : null}
                  {coupon.used_at ? (
                    <Text style={s.usedAt}>{language === 'ar' ? 'استُخدم في' : 'Used at'}: {new Date(coupon.used_at).toLocaleDateString('ar-SA')}</Text>
                  ) : coupon.expires_at ? (
                    <Text style={s.expiry}>{language === 'ar' ? 'ينتهي' : 'Expires'}: {new Date(coupon.expires_at).toLocaleDateString('ar-SA')}</Text>
                  ) : null}
                </View>

                {!coupon.is_used && (
                  <View style={s.cardActions}>
                    <TouchableOpacity style={[s.actionBtn, coupon.is_active ? s.disableBtn : s.enableBtn]} onPress={() => handleToggle(coupon)}>
                      <Text style={s.actionBtnTxt}>{coupon.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Enable')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={() => handleDelete(coupon)}>
                      <Text style={s.actionBtnTxt}>{language === 'ar' ? 'حذف' : 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{language === 'ar' ? 'إنشاء كوبون جديد' : 'Create New Coupon'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Code */}
              <Text style={s.fieldLabel}>{language === 'ar' ? 'رمز الكوبون' : 'Coupon Code'}</Text>
              <View style={s.codeRow}>
                <View style={s.codeDisplay}>
                  <Text style={s.codeDisplayTxt}>{generatedCode}</Text>
                </View>
                <TouchableOpacity style={s.regenBtn} onPress={regenerateCode}>
                  <Text style={s.regenTxt}>{language === 'ar' ? 'توليد جديد' : 'Regenerate'}</Text>
                </TouchableOpacity>
              </View>

              {/* Type */}
              <Text style={s.fieldLabel}>{language === 'ar' ? 'نوع الكوبون' : 'Coupon Type'}</Text>
              <View style={s.typeRow}>
                <TouchableOpacity
                  style={[s.typeBtn, formType === 'currency_exchange' && s.typeBtnActive]}
                  onPress={() => handleTypeChange('currency_exchange')}
                >
                  <Text style={[s.typeBtnTxt, formType === 'currency_exchange' && s.typeBtnTxtActive]}>
                    {language === 'ar' ? 'صرافة عملات' : 'Currency Exchange'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, formType === 'bank_transfer' && s.typeBtnActive]}
                  onPress={() => handleTypeChange('bank_transfer')}
                >
                  <Text style={[s.typeBtnTxt, formType === 'bank_transfer' && s.typeBtnTxtActive]}>
                    {language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Currency Exchange fields */}
              {formType === 'currency_exchange' && (
                <>
                  <Text style={s.fieldLabel}>{language === 'ar' ? 'اختر العملة' : 'Select Currency'}</Text>
                  <TouchableOpacity style={s.currencySelect} onPress={() => setShowCurrencyPicker(true)}>
                    <Text style={formCurrency ? s.currencySelectTxt : s.currencySelectPlaceholder}>
                      {formCurrency
                        ? `${formCurrency} — ${selectedCurrencyObj?.name_ar ?? ''}`
                        : (language === 'ar' ? 'اضغط لاختيار العملة' : 'Tap to select currency')}
                    </Text>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>

                  {selectedCurrencyObj && (
                    <View style={s.currentRateBox}>
                      <Text style={s.currentRateLbl}>{language === 'ar' ? 'السعر الحالي:' : 'Current rate:'}</Text>
                      <Text style={s.currentRateVal}>
                        {language === 'ar' ? 'شراء' : 'Buy'} {selectedCurrencyObj.buy_rate?.toFixed(4)}
                        {'  •  '}
                        {language === 'ar' ? 'بيع' : 'Sell'} {selectedCurrencyObj.sell_rate?.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  <Text style={s.fieldLabel}>{language === 'ar' ? 'سعر الشراء المخفض (للزبون)' : 'Discounted Buy Rate (for customer)'}</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="decimal-pad"
                    value={formBuyRate}
                    onChangeText={setFormBuyRate}
                    placeholder={language === 'ar' ? 'مثال: 3.7200' : 'e.g. 3.7200'}
                    placeholderTextColor={GRAY}
                  />

                  <Text style={s.fieldLabel}>{language === 'ar' ? 'سعر البيع المخفض (للزبون)' : 'Discounted Sell Rate (for customer)'}</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="decimal-pad"
                    value={formSellRate}
                    onChangeText={setFormSellRate}
                    placeholder={language === 'ar' ? 'مثال: 3.7800' : 'e.g. 3.7800'}
                    placeholderTextColor={GRAY}
                  />
                </>
              )}

              {/* Bank Transfer fields */}
              {formType === 'bank_transfer' && (
                <>
                  <Text style={s.fieldLabel}>{language === 'ar' ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="decimal-pad"
                    value={formDiscount}
                    onChangeText={setFormDiscount}
                    placeholder={language === 'ar' ? 'مثال: 10' : 'e.g. 10'}
                    placeholderTextColor={GRAY}
                  />
                </>
              )}

              {/* Expiry */}
              <Text style={s.fieldLabel}>{language === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'Expiry Date (optional)'}</Text>
              <TextInput
                style={s.input}
                value={formExpiry}
                onChangeText={setFormExpiry}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={GRAY}
              />

              {/* Notes */}
              <Text style={s.fieldLabel}>{language === 'ar' ? 'ملاحظات داخلية (اختياري)' : 'Internal Notes (optional)'}</Text>
              <TextInput
                style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
                multiline
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder={language === 'ar' ? 'ملاحظة للموظفين...' : 'Note for staff...'}
                placeholderTextColor={GRAY}
              />

              <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                <Text style={s.saveBtnTxt}>{saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'إنشاء الكوبون' : 'Create Coupon')}</Text>
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} animationType="fade" transparent onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>{language === 'ar' ? 'اختر العملة' : 'Select Currency'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {currencies.map(c => (
                <TouchableOpacity key={c.code} style={s.pickerItem} onPress={() => selectCurrency(c)}>
                  <Text style={s.pickerCode}>{c.code}</Text>
                  <Text style={s.pickerName}>{c.name_ar}</Text>
                  <Text style={s.pickerRate}>{c.buy_rate?.toFixed(4)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 48 : 14,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backTxt: { color: WHITE, fontSize: 16, fontWeight: '700' },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '800' },
  addBtn: { backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: DARK, fontSize: 13, fontWeight: '800' },

  statsBar: {
    flexDirection: 'row', backgroundColor: WHITE, marginHorizontal: 16, marginTop: 14,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900', color: DARK },
  statLbl: { fontSize: 11, color: GRAY, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: LIGHT },

  list: { padding: 16, paddingTop: 12 },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { color: GRAY, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptySubTxt: { color: GRAY, fontSize: 12, textAlign: 'center', marginTop: 6 },

  card: {
    backgroundColor: WHITE, borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    overflow: 'hidden',
  },
  cardDisabled: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 },
  codeBox: { backgroundColor: DARK, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  codeTxt: { color: GOLD, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  statusBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 11, fontWeight: '700' },

  cardBody: { paddingHorizontal: 14, paddingBottom: 12 },
  typeLbl: { color: GRAY, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  currencyCode: { color: DARK, fontSize: 15, fontWeight: '800', marginRight: 4 },
  rateChip: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: GRAY, fontSize: 12, fontWeight: '600' },
  rateValue: { color: SUCCESS, fontWeight: '800' },
  discountLbl: { color: GRAY, fontSize: 13, fontWeight: '600' },
  discountVal: { color: TEAL, fontWeight: '800', fontSize: 15 },
  notes: { color: GRAY, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  usedAt: { color: GRAY, fontSize: 11, marginTop: 4 },
  expiry: { color: GRAY, fontSize: 11, marginTop: 4 },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: LIGHT },
  actionBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  disableBtn: { backgroundColor: '#FFF8E1' },
  enableBtn: { backgroundColor: '#E8F5E9' },
  deleteBtn: { backgroundColor: '#FFEBEE', borderLeftWidth: 1, borderLeftColor: LIGHT },
  actionBtnTxt: { fontSize: 13, fontWeight: '700', color: DARK },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  modalClose: { fontSize: 18, color: GRAY, fontWeight: '600', padding: 4 },

  fieldLabel: { color: DARK, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: LIGHT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DARK, borderWidth: 1, borderColor: '#E0E7EF',
  },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeDisplay: {
    flex: 1, backgroundColor: DARK, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
    alignItems: 'center',
  },
  codeDisplayTxt: { color: GOLD, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  regenBtn: { backgroundColor: LIGHT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#E0E7EF' },
  regenTxt: { color: DARK, fontSize: 12, fontWeight: '700' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#E0E7EF', alignItems: 'center' },
  typeBtnActive: { borderColor: GOLD, backgroundColor: '#FFF8E6' },
  typeBtnTxt: { color: GRAY, fontSize: 13, fontWeight: '700' },
  typeBtnTxtActive: { color: DARK },

  currencySelect: {
    backgroundColor: LIGHT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E0E7EF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  currencySelectTxt: { color: DARK, fontSize: 14, fontWeight: '700' },
  currencySelectPlaceholder: { color: GRAY, fontSize: 14 },
  chevron: { color: GRAY, fontSize: 20, fontWeight: '700' },

  currentRateBox: {
    backgroundColor: '#F0F7FF', borderRadius: 8, padding: 10, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: '#1565C0',
  },
  currentRateLbl: { color: '#1565C0', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  currentRateVal: { color: DARK, fontSize: 12, fontWeight: '600' },

  saveBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt: { color: DARK, fontSize: 16, fontWeight: '800' },

  // Currency Picker
  pickerSheet: {
    backgroundColor: WHITE, borderRadius: 20, margin: 20, padding: 20, maxHeight: '70%',
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: DARK, marginBottom: 14, textAlign: 'center' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: LIGHT,
  },
  pickerCode: { color: DARK, fontSize: 15, fontWeight: '800', width: 52 },
  pickerName: { flex: 1, color: GRAY, fontSize: 13, fontWeight: '600' },
  pickerRate: { color: SUCCESS, fontSize: 14, fontWeight: '700' },
});
