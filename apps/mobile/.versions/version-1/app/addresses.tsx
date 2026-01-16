import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, MapPin, Home, Briefcase, Edit2, Trash2, X } from 'lucide-react-native';
import { useUserStore } from '@/lib/store';

interface Address {
  id: number;
  user_id: number;
  type: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export default function AddressesScreen() {
  const { user } = useUserStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    type: 'home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_APP_URL}/api/addresses?user_id=${user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!formData.full_name || !formData.phone || !formData.address_line1 || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const method = editingAddress ? 'PUT' : 'POST';
      const body = editingAddress
        ? { ...formData, id: editingAddress.id }
        : { ...formData, user_id: user?.id };

      const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/addresses`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setModalVisible(false);
        setEditingAddress(null);
        resetForm();
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/addresses`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
              });
              if (response.ok) {
                fetchAddresses();
              }
            } catch (error) {
              console.error('Error deleting address:', error);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    resetForm();
    setEditingAddress(null);
    setModalVisible(true);
  };

  const openEditModal = (address: Address) => {
    setFormData({
      type: address.type,
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      is_default: address.is_default,
    });
    setEditingAddress(address);
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'home',
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      is_default: false,
    });
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home size={20} color="#FF6B35" strokeWidth={2} />;
      case 'work':
        return <Briefcase size={20} color="#4A90E2" strokeWidth={2} />;
      default:
        return <MapPin size={20} color="#50C878" strokeWidth={2} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1C1C1E" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1C1C1E" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Plus size={24} color="#FF6B35" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={60} color="#CCC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Saved Addresses</Text>
            <Text style={styles.emptyText}>Add your delivery addresses for faster checkout</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
              <Text style={styles.addFirstButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    {getAddressIcon(address.type)}
                    <Text style={styles.addressType}>{address.type.toUpperCase()}</Text>
                  </View>
                  {address.is_default && <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>}
                </View>
                
                <Text style={styles.addressName}>{address.full_name}</Text>
                <Text style={styles.addressPhone}>{address.phone}</Text>
                <Text style={styles.addressText}>
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ''}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>

                <View style={styles.addressActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(address)}
                  >
                    <Edit2 size={18} color="#4A90E2" strokeWidth={2} />
                    <Text style={[styles.actionButtonText, { color: '#4A90E2' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
                    <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#666" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Address Type */}
              <Text style={styles.label}>Address Type</Text>
              <View style={styles.typeButtons}>
                {['home', 'work', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Fields */}
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter full name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Address Line 1 *</Text>
              <TextInput
                style={styles.input}
                value={formData.address_line1}
                onChangeText={(text) => setFormData({ ...formData, address_line1: text })}
                placeholder="House No., Building Name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={formData.address_line2}
                onChangeText={(text) => setFormData({ ...formData, address_line2: text })}
                placeholder="Road name, Area, Colony"
                placeholderTextColor="#999"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                    placeholder="City"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                    placeholder="State"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text style={styles.label}>Pincode *</Text>
              <TextInput
                style={styles.input}
                value={formData.pincode}
                onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                placeholder="Enter pincode"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={styles.defaultCheckbox}
                onPress={() => setFormData({ ...formData, is_default: !formData.is_default })}
              >
                <View
                  style={[styles.checkbox, formData.is_default && styles.checkboxActive]}
                />
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  addButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFirstButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  addFirstButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressList: {
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: '#50C878',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    marginTop: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
