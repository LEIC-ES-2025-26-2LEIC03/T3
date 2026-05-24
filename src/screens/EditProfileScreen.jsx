import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../utils/firebaseConfig';
import { getProfile, updateProfile, updateProfilePhoto } from '../services/profileService';
import { useProfile } from '../context/ProfileContext';

export default function EditProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const userId = auth.currentUser?.uid;
    const { refreshProfile } = useProfile();

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [photoUri, setPhotoUri] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [nameError, setNameError] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const profile = await getProfile(userId);
            setDisplayName(profile.displayName ?? '');
            setBio(profile.bio ?? '');
            setPhotoUri(profile.photoUrl ?? null);
            setLoading(false);
        })();
    }, []);

    const handleNameChange = (text) => {
        setDisplayName(text);
        if (text.trim() === '') {
            setNameError('Name is required and cannot be empty.');
        } else if (text.trim().length > 30) {
            setNameError('Name too long — max 30 characters.');
        } else {
            setNameError('');
        }
    };

    const handlePickImage = async () => {
        setPhotoError('');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        const uri = asset.uri.toLowerCase();
        const mimeType = asset.mimeType?.toLowerCase?.() ?? '';
        const isValidType =
            uri.endsWith('.jpg') ||
            uri.endsWith('.jpeg') ||
            uri.endsWith('.png') ||
            uri.endsWith('.webp') ||
            uri.endsWith('.gif') ||
            mimeType === 'image/jpeg' ||
            mimeType === 'image/png' ||
            mimeType === 'image/webp' ||
            mimeType === 'image/gif';
        if (!isValidType) {
            setPhotoError('Invalid file format. Please upload a JPG or PNG.');
            return;
        }
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            setPhotoError('File too large — max 5 MB allowed.');
            return;
        }
        setPhotoUri(asset.uri);
        setPhotoFile({
            uri: asset.uri,
            mimeType: asset.mimeType,
            sizeBytes: asset.fileSize ?? 0,
        });
    };

    const handleSave = async () => {
        if (displayName.trim() === '') { setNameError('Name is required and cannot be empty.'); return; }
        if (displayName.trim().length > 30) { setNameError('Name too long — max 30 characters.'); return; }
        if (nameError || photoError) return;

        setSaving(true);
        try {
            const profileResult = await updateProfile(userId, { displayName: displayName.trim(), bio: bio.trim() });
            if (!profileResult.success) { setNameError(profileResult.error); return; }

            if (photoFile) {
                const photoResult = await updateProfilePhoto(userId, photoFile);
                if (!photoResult.success) { setPhotoError(photoResult.error); return; }
            }

            await refreshProfile(); // update Home + Profile screens instantly

            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => handleBack() },
            ]);
        } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isSaveDisabled = saving || !!nameError || !!photoError || displayName.trim() === '';

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('ProfileTab', { screen: 'ProfileMenu' });
        }
    };

    if (loading) {
        return (
            <View style={[styles.safe, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#C8FF00" />
            </View>
        );
    }

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                <View style={{ width: 60 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrap}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>📷</Text>
                                </View>
                            )}
                            <View style={styles.avatarEditBadge}>
                                <Text style={styles.avatarEditBadgeText}>✎</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap to change photo</Text>
                        {photoError !== '' && <Text style={styles.errorText}>{photoError}</Text>}
                    </View>

                    <Text style={styles.fieldLabel}>Display Name</Text>
                    <TextInput
                        style={[styles.input, nameError !== '' && styles.inputError]}
                        value={displayName}
                        onChangeText={handleNameChange}
                        placeholder="Your name"
                        placeholderTextColor="#444"
                        maxLength={31}
                    />
                    <View style={styles.nameFooter}>
                        {nameError !== '' ? (
                            <Text style={styles.errorText}>{nameError}</Text>
                        ) : (
                            <Text style={styles.charCount}>{displayName.trim().length}/30</Text>
                        )}
                    </View>

                    <Text style={styles.fieldLabel}>Bio</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell us a bit about yourself..."
                        placeholderTextColor="#444"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, isSaveDisabled && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={isSaveDisabled}
                    >
                        {saving ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0A0A0A' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#181818' },
    backBtn: { width: 60 },
    backText: { fontSize: 17, color: '#C8FF00', fontWeight: '600' },
    title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
    scroll: { padding: 20, paddingBottom: 60 },
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarWrap: { position: 'relative', marginBottom: 8 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#C8FF00' },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#141414', borderWidth: 2, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
    avatarPlaceholderText: { fontSize: 36 },
    avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#C8FF00', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    avatarEditBadgeText: { fontSize: 13, color: '#0A0A0A', fontWeight: '700' },
    avatarHint: { fontSize: 12, color: '#555', fontWeight: '500' },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
    input: { backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
    inputError: { borderColor: '#FF6B6B' },
    textArea: { minHeight: 100, marginBottom: 24, textAlignVertical: 'top' },
    nameFooter: { minHeight: 20, marginTop: 4, marginBottom: 20 },
    errorText: { color: '#FF6B6B', fontSize: 12, fontWeight: '500' },
    charCount: { color: '#444', fontSize: 12, textAlign: 'right' },
    saveBtn: { backgroundColor: '#C8FF00', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
