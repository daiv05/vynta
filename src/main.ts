import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";

const pinia = createPinia();

createApp(App).use(pinia).use(i18n).mount("#app");
