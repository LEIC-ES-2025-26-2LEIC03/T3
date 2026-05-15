import React, { createContext, useContext, useState, useCallback } from 'react';
import { getProfile } from '../services/profileService';
import { auth } from '../utils/firebaseConfig';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
    const [profile, setProfile] = useState({ displayName: '', photoUrl: null, bio: '' });

    const refreshProfile = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const p = await getProfile(userId);
        setProfile(p);
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, refreshProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    return useContext(ProfileContext);
}
