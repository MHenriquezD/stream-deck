import { defineStore } from "pinia";
import { ref } from "vue";

export const useServerUrlStore = defineStore("serverUrl", () => {
  const serverUrl = ref(
    localStorage.getItem("serverUrl") || "http://localhost:8765"
  );
  function setServerUrl(url: string) {
    serverUrl.value = url;
    localStorage.setItem("serverUrl", url);
  }
  return { serverUrl, setServerUrl };
});
