import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import es from "./locales/es.json";

const userLocale = localStorage.getItem("user-locale") || "en";

const i18n = createI18n({
  legacy: false,
  locale: userLocale,
  fallbackLocale: "en",
  globalInjection: true,
  messages: {
    en,
    es,
  },
});

export default i18n;
