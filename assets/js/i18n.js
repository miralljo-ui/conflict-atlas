const LANGS = {
  es:{title:'Monitor Geopolítico Global · 2025',activeConflicts:'Conflictos activos',activeWars:'Guerras activas',highIntensity:'Alta intensidad',medIntensity:'Media intensidad',latentTension:'Tensión latente',liveLabel:'DATOS 2025',filterAll:'TODOS',filterWar:'GUERRA',filterHigh:'ALTO',filterMed:'MEDIO',filterLow:'BAJO',searchPlaceholder:'BUSCAR CONFLICTO…',conflicts:'conflictos',currentStatus:'Estado actual',intensity:'Intensidad',since:'Desde',casualties:'Bajas estimadas',displaced:'Desplazados',parties:'Partes involucradas',description:'Descripción',type:'Tipo',recentNews:'NOTICIAS RECIENTES',fetchNews:'⚡ BUSCAR NOTICIAS CON IA',searchingNews:'Buscando noticias con IA…',noNews:'No se encontraron noticias. Intenta de nuevo.',aiError:'Error al conectar con la IA.',clickToFetch:'Haz click en “Buscar noticias” para cargar noticias con IA',selectConflict:'Selecciona un conflicto y busca noticias',clickDetail:'Click para ver detalle y noticias',source:'Fuente',chartTitle:'EVOLUCIÓN TEMPORAL',chartCas:'Bajas acumuladas',exportPdf:'PDF ↓',region:'REGIÓN',fromYear:'DESDE',level:'NIVEL',casShort:'BAJAS EST.',legendTitle:'Intensidad',legWar:'Guerra activa',legHigh:'Alta intensidad',legMed:'Media intensidad',legLow:'Tensión latente',newsTimeout:'Tiempo de espera agotado al cargar noticias.',backendConfigHint:'Configura un backend en'},
  en:{title:'Global Geopolitical Monitor · 2025',activeConflicts:'Active conflicts',activeWars:'Active wars',highIntensity:'High intensity',medIntensity:'Medium intensity',latentTension:'Latent tension',liveLabel:'2025 DATA',filterAll:'ALL',filterWar:'WAR',filterHigh:'HIGH',filterMed:'MED',filterLow:'LOW',searchPlaceholder:'SEARCH CONFLICT…',conflicts:'conflicts',currentStatus:'Current status',intensity:'Intensity',since:'Since',casualties:'Est. casualties',displaced:'Displaced',parties:'Parties involved',description:'Description',type:'Type',recentNews:'RECENT NEWS',fetchNews:'⚡ FETCH NEWS WITH AI',searchingNews:'Searching news with AI…',noNews:'No news found. Try again.',aiError:'Error connecting to AI.',clickToFetch:'Click “Fetch news” to load recent news with AI',selectConflict:'Select a conflict to search for news',clickDetail:'Click to see details and news',source:'Source',chartTitle:'TEMPORAL EVOLUTION',chartCas:'Cumulative casualties',exportPdf:'PDF ↓',region:'REGION',fromYear:'SINCE',level:'LEVEL',casShort:'EST. CASUALTIES',legendTitle:'Intensity',legWar:'Active war',legHigh:'High intensity',legMed:'Medium intensity',legLow:'Latent tension',newsTimeout:'Request timed out while loading news.',backendConfigHint:'Set up a backend at'},
  fr:{title:'Moniteur Géopolitique Mondial · 2025',activeConflicts:'Conflits actifs',activeWars:'Guerres actives',highIntensity:'Haute intensité',medIntensity:'Intensité moyenne',latentTension:'Tension latente',liveLabel:'DONNÉES 2025',filterAll:'TOUS',filterWar:'GUERRE',filterHigh:'HAUT',filterMed:'MOY',filterLow:'BAS',searchPlaceholder:'CHERCHER CONFLIT…',conflicts:'conflits',currentStatus:'Situation actuelle',intensity:'Intensité',since:'Depuis',casualties:'Victimes est.',displaced:'Déplacés',parties:'Parties impliquées',description:'Description',type:'Type',recentNews:'ACTUALITÉS RÉCENTES',fetchNews:'⚡ ACTUALITÉS IA',searchingNews:"Recherche d'actualités…",noNews:'Aucune actualité. Réessayez.',aiError:"Erreur de connexion à l'IA.",clickToFetch:'Cliquez pour charger les dernières actualités',selectConflict:'Sélectionnez un conflit pour les actualités',clickDetail:'Cliquer pour voir les détails',source:'Source',chartTitle:'ÉVOLUTION TEMPORELLE',chartCas:'Victimes cumulées',exportPdf:'PDF ↓',region:'RÉGION',fromYear:'DEPUIS',level:'NIVEAU',casShort:'VICTIMES EST.',legendTitle:'Intensité',legWar:'Guerre active',legHigh:'Haute intensité',legMed:'Intensité moyenne',legLow:'Tension latente',newsTimeout:'Délai dépassé lors du chargement des actualités.',backendConfigHint:'Configurez un backend sur'},
};

const SUPPORTED_LANGS = ['es','en','fr'];

function createI18n(initialLang = 'es') {
  let currentLang = SUPPORTED_LANGS.includes(initialLang) ? initialLang : 'es';

  const t = (key) => (LANGS[currentLang] || LANGS.es)[key] || key;

  function setLang(nextLang) {
    if (SUPPORTED_LANGS.includes(nextLang)) currentLang = nextLang;
    return currentLang;
  }

  function getLang() {
    return currentLang;
  }

  function getSupportedLangs() {
    return [...SUPPORTED_LANGS];
  }

  return { t, setLang, getLang, getSupportedLangs };
}

export { LANGS, createI18n };
