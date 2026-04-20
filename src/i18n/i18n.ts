import i18next from 'i18next';
import en from './en.json';
import fr from './fr.json';
import rn from './rn.json';

export async function initI18n(defaultLng = 'fr') {
  await i18next.init({
    lng: defaultLng,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      rn: { translation: rn },

    },
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18next;
