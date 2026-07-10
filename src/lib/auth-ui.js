import { ref } from "vue";

export const authOpen = ref(false);
export const authMode = ref("login");

export const openAuth = (mode = "login") => {
  authMode.value = mode === "register" ? "register" : "login";
  authOpen.value = true;
};

export const closeAuth = () => {
  authOpen.value = false;
};
