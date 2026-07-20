const messages = {
  es: {
    feed: "Para vos", discover: "Descubrir", saved: "Guardadas", notifications: "Notificaciones", profile: "Mi perfil", settings: "Ajustes",
    share: "Compartir receta", enter: "Entrar a la comunidad", logout: "Salir", home: "Inicio", profileShort: "Perfil",
    tableToday: "La mesa de hoy", search: "Buscar receta o persona", whatCooked: "¿Qué cocinaste?", sharePrompt: "Compartí una receta, un recuerdo o ese truco que nunca falla.",
    loading: "Preparando la mesa…", empty: "Todavía no hay nada por acá.", publishFirst: "Publicar la primera", backFeed: "Volver al feed",
    discoverTitle: "Descubrir.", discoverIntro: "Buscá una idea, filtrá por idioma o contanos qué ingredientes tenés.", yourBook: "Tu recetario", saveIntro: "Guardá lo que quieras volver a cocinar y compartí lo que merece pasar de mano en mano.", viewSaved: "Ver mis guardadas", joinTable: "Sumate a la mesa", bookStarts: "Tu recetario empieza acá.", joinIntro: "Creá un perfil para guardar, comentar y compartir.", enterShort: "Entrar", tagsPeople: "Hashtags, personas y recetas", openDiscover: "Abrir Descubrir.", backLanding: "Volver a la landing",
  },
  en: {
    feed: "For you", discover: "Discover", saved: "Saved", notifications: "Notifications", profile: "My profile", settings: "Settings",
    share: "Share recipe", enter: "Join the community", logout: "Sign out", home: "Home", profileShort: "Profile",
    tableToday: "Today's table", search: "Search recipes or people", whatCooked: "What did you cook?", sharePrompt: "Share a recipe, a memory, or the trick that never fails.",
    loading: "Setting the table…", empty: "There is nothing here yet.", publishFirst: "Publish the first", backFeed: "Back to feed",
    discoverTitle: "Discover.", discoverIntro: "Find an idea, filter by language, or tell us which ingredients you have.", yourBook: "Your recipe book", saveIntro: "Save what you want to cook again and share what deserves to be passed on.", viewSaved: "View saved recipes", joinTable: "Join the table", bookStarts: "Your recipe book starts here.", joinIntro: "Create a profile to save, comment, and share.", enterShort: "Sign in", tagsPeople: "Hashtags, people, and recipes", openDiscover: "Open Discover.", backLanding: "Back to the landing page",
  },
  pt: {
    feed: "Para você", discover: "Descobrir", saved: "Salvas", notifications: "Notificações", profile: "Meu perfil", settings: "Ajustes",
    share: "Compartilhar receita", enter: "Entrar na comunidade", logout: "Sair", home: "Início", profileShort: "Perfil",
    tableToday: "A mesa de hoje", search: "Buscar receita ou pessoa", whatCooked: "O que você cozinhou?", sharePrompt: "Compartilhe uma receita, uma lembrança ou aquele truque que sempre funciona.",
    loading: "Preparando a mesa…", empty: "Ainda não há nada por aqui.", publishFirst: "Publicar a primeira", backFeed: "Voltar ao feed",
    discoverTitle: "Descobrir.", discoverIntro: "Busque uma ideia, filtre por idioma ou conte quais ingredientes você tem.", yourBook: "Seu receituário", saveIntro: "Salve o que deseja cozinhar novamente e compartilhe o que merece passar adiante.", viewSaved: "Ver receitas salvas", joinTable: "Junte-se à mesa", bookStarts: "Seu receituário começa aqui.", joinIntro: "Crie um perfil para salvar, comentar e compartilhar.", enterShort: "Entrar", tagsPeople: "Hashtags, pessoas e receitas", openDiscover: "Abrir Descobrir.", backLanding: "Voltar à landing page",
  },
};

export const t = (language, key) => messages[language]?.[key] || messages.es[key] || key;
export const languageNames = { es: "Español", en: "English", pt: "Português" };
