import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '@/lib/store';
import { updateUser } from '@/lib/api';
import { useUpload } from '@/utils/useUpload';
import { toast } from 'sonner-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, setUser } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
      if (uploadResult.url) {
        setAvatarUrl(uploadResult.url);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = await updateUser(user.email, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      });

      setUser({
        ...user,
        name: updatedUser.name,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
      });

      toast.success('Profile updated successfully!');
      setTimeout(() => {
        handleBack();
      }, 800);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={uploadLoading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User size={40} color="#94a3b8" />
              </View>
            )}
            <View style={styles.cameraButton}>
              {uploadLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Camera size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Mail size={20} color="#94a3b8" />
              <Text style={styles.inputDisabledText}>{user?.email}</Text>
            </View>
            <Text style={styles.inputHint}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarHint: {
    fontSize: 13,
    color: '#64748b',
  },
  form: {
    columnGap: 20,
  },
  inputGroup: {
    columnGap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    columnGap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  inputDisabledText: {
    flex: 1,
    fontSize: 16,
    color: '#64748b',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  saveButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
