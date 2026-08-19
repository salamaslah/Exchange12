import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

interface Advertisement {
  id: string;
  position: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  username?: string;
}

export default function AdsManagementScreen() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: ''
  });
  const router = useRouter();

  useEffect(() => {
    loadAdvertisements();
  }, []);

  const loadAdvertisements = async () => {
    try {
      setLoading(true);
      const shopUsername = await AsyncStorage.getItem('shopUsername') || '';
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('username', shopUsername)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdvertisements(data || []);
    } catch (error) {
      console.log('Error loading advertisements:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image:', error);
      return null;
    }
  };

  const pickAndCreateAd = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('خطأ', 'يجب السماح بالوصول للصور');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const imageUri = result.assets[0].uri;
      const base64 = await convertImageToBase64(imageUri);

      if (!base64) {
        Alert.alert('خطأ', 'فشل في معالجة الصورة');
        return;
      }

      const shopUsername = await AsyncStorage.getItem('shopUsername') || '';
      const { error } = await supabase
        .from('advertisements')
        .insert({
          title: '',
          description: '',
          image_url: base64,
          is_active: true,
          position: 'bottom',
          username: shopUsername,
        });

      if (error) throw error;

      await loadAdvertisements();
      Alert.alert('تم', 'تم إضافة الإعلان بنجاح');
    } catch (error) {
      console.log('Error creating advertisement:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة الإعلان');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAd(null);
    setFormData({
      title: '',
      description: '',
      image_url: ''
    });
  };

  const saveAdvertisement = async () => {
    if (!formData.image_url.trim()) {
      Alert.alert('خطأ', 'يرجى إضافة صورة');
      return;
    }

    try {
      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update({
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url
          })
          .eq('id', editingAd.id);

        if (error) throw error;

        await loadAdvertisements();
        Alert.alert('تم', 'تم تحديث الإعلان بنجاح');
      }

      closeEditModal();
    } catch (error) {
      console.log('Error saving advertisement:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ الإعلان');
    }
  };

  const toggleAdStatus = async (adId: string) => {
    try {
      const ad = advertisements.find(a => a.id === adId);
      if (!ad) return;

      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !ad.is_active })
        .eq('id', adId);

      if (error) throw error;

      await loadAdvertisements();
      Alert.alert('تم', `تم ${!ad.is_active ? 'تفعيل' : 'تعطيل'} الإعلان`);
    } catch (error) {
      console.log('Error toggling ad status:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث حالة الإعلان');
    }
  };

  const deleteAdvertisement = async (adId: string) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا الإعلان؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('advertisements')
                .delete()
                .eq('id', adId);

              if (error) throw error;

              await loadAdvertisements();
              Alert.alert('تم', 'تم حذف الإعلان بنجاح');
            } catch (error) {
              console.log('Error deleting advertisement:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف الإعلان');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    router.replace('/(tabs)/accounting');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>جاري تحميل الإعلانات...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>إدارة الإعلانات</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addAdButton}
          onPress={pickAndCreateAd}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.addAdIcon}>+</Text>
              <Text style={styles.addAdText}>إضافة إعلان جديد</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>الإعلانات الحالية ({advertisements.length})</Text>

          {advertisements.length === 0 && (
            <Text style={styles.emptyText}>لا توجد إعلانات. اضغط "إضافة إعلان جديد" لإضافة صورة.</Text>
          )}

          {advertisements.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
              <View style={styles.adHeader}>
                <View style={styles.adInfo}>
                  <Text style={styles.adTitle}>{ad.title || 'إعلان'}</Text>
                </View>
                <View style={styles.adActions}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      ad.is_active ? styles.activeButton : styles.inactiveButton
                    ]}
                    onPress={() => toggleAdStatus(ad.id)}
                  >
                    <Text style={styles.statusButtonText}>
                      {ad.is_active ? 'مفعل' : 'معطل'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(ad)}
                  >
                    <Text style={styles.editButtonText}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteAdvertisement(ad.id)}
                  >
                    <Text style={styles.deleteButtonText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.adContent}>
                <Image
                  source={{ uri: ad.image_url }}
                  style={styles.adImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Edit Advertisement Modal */}
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeEditModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>تعديل إعلان</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeEditModal}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <Text style={styles.inputLabel}>عنوان الإعلان (اختياري):</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="أدخل عنوان الإعلان"
                  textAlign="right"
                />

                <Text style={styles.inputLabel}>وصف الإعلان (اختياري):</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="أدخل وصف الإعلان"
                  textAlign="right"
                  multiline={true}
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>رابط الصورة:</Text>
                <TextInput
                  style={styles.input}
                  value={formData.image_url}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, image_url: text }))}
                  placeholder="https://example.com/image.jpg"
                  textAlign="left"
                />

                {formData.image_url ? (
                  <View style={styles.imagePreview}>
                    <Text style={styles.previewLabel}>معاينة الصورة:</Text>
                    <Image
                      source={{ uri: formData.image_url }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity style={styles.saveButton} onPress={saveAdvertisement}>
                  <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  addAdButton: {
    backgroundColor: '#065F46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  addAdIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  addAdText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 30,
  },
  adCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  adActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#059669',
  },
  inactiveButton: {
    backgroundColor: '#6B7280',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#065F46',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePreview: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#065F46',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
