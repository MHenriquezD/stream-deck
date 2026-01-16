import { definePreset } from "@primevue/themes";
import Lara from "@primevue/themes/lara";
import "primeicons/primeicons.css";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { createPinia } from "pinia";

// Define el preset personalizado con colores para tema oscuro
const StreamDeckPreset = definePreset(Lara, {
  semantic: {
    primary: {
      50: "{purple.50}",
      100: "{purple.100}",
      200: "{purple.200}",
      300: "{purple.300}",
      400: "{purple.400}",
      500: "{purple.500}",
      600: "{purple.600}",
      700: "{purple.700}",
      800: "{purple.800}",
      900: "{purple.900}",
      950: "{purple.950}",
    },
  },
});

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: StreamDeckPreset,
    options: {
      darkModeSelector: ".dark",
      cssLayer: false,
    },
  },
});

const pinia = createPinia();
app.use(pinia);

// Registro global de componentes
app.component("Toast", Toast);
app.component("ConfirmDialog", ConfirmDialog);

// Servicios
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
