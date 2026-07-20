export const defaultPreferences = Object.freeze({
  language: "es",
  colorMode: "default",
  textScale: 100,
  reduceMotion: false,
});

const allowedLanguages = new Set(["es", "en", "pt"]);
const allowedColorModes = new Set(["default", "red-green", "blue-yellow", "contrast"]);
const allowedTextScales = new Set([100, 115, 130]);

export const loadPreferences = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("recetitas-preferences") || "{}");
    return {
      language: allowedLanguages.has(stored.language) ? stored.language : defaultPreferences.language,
      colorMode: allowedColorModes.has(stored.colorMode) ? stored.colorMode : defaultPreferences.colorMode,
      textScale: allowedTextScales.has(Number(stored.textScale)) ? Number(stored.textScale) : defaultPreferences.textScale,
      reduceMotion: Boolean(stored.reduceMotion),
    };
  } catch {
    return { ...defaultPreferences };
  }
};

export const applyPreferences = (preferences) => {
  const root = document.documentElement;
  root.lang = preferences.language;
  root.dataset.colorMode = preferences.colorMode;
  root.dataset.motion = preferences.reduceMotion ? "reduced" : "system";
  root.style.fontSize = `${preferences.textScale}%`;
};

export const savePreferences = (preferences) => {
  localStorage.setItem("recetitas-preferences", JSON.stringify(preferences));
  applyPreferences(preferences);
};
