export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'en' | 'es';

export interface UserPreferences {
  theme: AppTheme;
  language: AppLanguage;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends';
    data_sharing: boolean;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'es',
  notifications: { email: true, push: false, marketing: false },
  privacy: { profile_visibility: 'private', data_sharing: false },
};
