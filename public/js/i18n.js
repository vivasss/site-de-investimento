/**
 * FinançasPro - Internationalization (i18n) Module
 * Supports Portuguese (BR), English (US), and Spanish (ES)
 * Handles currency formatting, dates, numbers, and locale storage.
 */
window.I18n = (() => {
  const STORAGE_LANG_KEY = 'financasPro_lang';
  const STORAGE_CURRENCY_KEY = 'financasPro_currency';

  const translations = {
    'pt-BR': {
      // Search & Navigation
      'search.placeholder': 'Pesquisar ações... (ex: AAPL, PETR4.SA, VALE3.SA)',
      'search.button': 'Pesquisar',
      'search.noResults': 'Nenhum ativo encontrado',
      'search.popular': 'Ativos Populares',
      'nav.search': 'Pesquisar',
      'nav.portfolio': 'Minha Carteira',

      // Welcome Screen
      'welcome.title': 'Bem-vindo ao FinançasPro',
      'welcome.subtitle': 'Pesquise qualquer ação das bolsas de valores do mundo',

      // Quote & Key Statistics
      'quote.price': 'Preço Atual',
      'quote.change': 'Variação',
      'quote.open': 'Abertura',
      'quote.high': 'Máxima (Dia)',
      'quote.low': 'Mínima (Dia)',
      'quote.volume': 'Volume',
      'quote.avgVolume': 'Vol. Médio (3m)',
      'quote.marketCap': 'Valor de Mercado',
      'quote.peRatio': 'P/L (P/E)',
      'quote.forwardPE': 'P/L Futuro',
      'quote.priceToBook': 'P/VP (P/B)',
      'quote.52weekHigh': 'Máx. 52 Semanas',
      'quote.52weekLow': 'Mín. 52 Semanas',
      'quote.beta': 'Beta',
      'quote.addToPortfolio': 'Adicionar à Carteira',
      'quote.marketState': 'Status do Mercado',
      'quote.currency': 'Moeda da Ação',

      // Targets & Recommendations
      'targets.title': 'Alvos dos Analistas',
      'targets.meanTarget': 'Preço Alvo Médio',
      'targets.highTarget': 'Alvo Máximo',
      'targets.lowTarget': 'Alvo Mínimo',
      'targets.medianTarget': 'Alvo Mediano',
      'targets.upside': 'Potencial de Valorização',
      'targets.downside': 'Risco de Queda',
      'targets.recommendation': 'Consenso dos Analistas',
      'targets.analysts': 'Total de Analistas',
      'targets.strongBuy': 'Forte Compra',
      'targets.buy': 'Compra',
      'targets.hold': 'Manter',
      'targets.sell': 'Venda',
      'targets.strongSell': 'Forte Venda',
      'targets.recommendationTrend': 'Tendência de Recomendações',

      // Dividends
      'dividends.title': 'Dividendos e Proventos',
      'dividends.yield': 'Dividend Yield (DY)',
      'dividends.lastAmount': 'Último Dividendo',
      'dividends.exDate': 'Data Ex-Dividendo',
      'dividends.payoutRatio': 'Payout Ratio',
      'dividends.history': 'Histórico de Pagamentos',
      'dividends.noHistory': 'Sem histórico recente de dividendos',
      'dividends.nextExpected': 'Próximo Provento Previsto',
      'dividends.confirmed': 'Data Com Confirmada',
      'dividends.estimated': 'Previsão Estimada',
      'dividends.countdownDays': 'dias restantes para a data com',
      'dividends.passed': 'Data recente / em apuração',
      'dividends.frequency': 'Frequência Observada',
      'targets.consensusScore': 'Pontuação de Consenso',
      'targets.breakdown': 'Distribuição dos Analistas',
      'targets.scoreScale': '1.0 (Compra Forte) a 5.0 (Venda)',
      'nav.news': 'Notícias',
      'news.title': 'Notícias do Mercado Financeiro',
      'news.subtitle': 'Principais acontecimentos econômicos, bolsas e mercado global',
      'news.companyTitle': 'Notícias e Fatos Relevantes',
      'news.companySubtitle': 'Cobertura recente sobre',
      'news.readMore': 'Acessar notícia',
      'news.noNews': 'Nenhuma notícia recente encontrada para este ativo.',
      'news.timeAgo': 'Publicado',

      // Portfolio
      'portfolio.title': 'Minha Carteira de Investimentos',
      'portfolio.add': 'Adicionar Ativo',
      'portfolio.ticker': 'Código (Ticker)',
      'portfolio.name': 'Empresa / Nome',
      'portfolio.quantity': 'Quantidade',
      'portfolio.buyPrice': 'Preço Médio / Compra',
      'portfolio.buyDate': 'Data da Compra',
      'portfolio.totalInvested': 'Total Investido',
      'portfolio.currentValue': 'Valor Atual',
      'portfolio.totalProfit': 'Lucro / Prejuízo',
      'portfolio.totalReturn': 'Rentabilidade Total',
      'portfolio.stock': 'Ativo',
      'portfolio.shares': 'Qtd.',
      'portfolio.avgPrice': 'Preço Médio',
      'portfolio.currentPrice': 'Preço Atual',
      'portfolio.profit': 'Lucro / Prejuízo',
      'portfolio.return': 'Retorno',
      'portfolio.actions': 'Ações',
      'portfolio.dividendsReceived': 'Dividendos Recebidos',
      'portfolio.projectedDividends': 'Projeção de Proventos (12 meses)',
      'portfolio.allocation': 'Alocação da Carteira',
      'portfolio.empty': 'Sua carteira está vazia',
      'portfolio.emptyDesc': 'Pesquise ativos e adicione-os para acompanhar o desempenho da sua carteira.',
      'portfolio.remove': 'Remover',
      'portfolio.export': 'Exportar Carteira (JSON)',
      'portfolio.import': 'Importar Carteira (JSON)',
      'portfolio.confirmRemove': 'Deseja realmente remover este ativo da carteira?',
      'portfolio.importSuccess': 'Carteira importada com sucesso!',
      'portfolio.importError': 'Erro ao importar arquivo. Verifique o formato JSON.',
      'portfolio.month': 'Mês',
      'portfolio.projectedAmount': 'Valor Estimado',

      // Settings
      'settings.title': 'Configurações',
      'settings.language': 'Idioma',
      'settings.currency': 'Moeda de Exibição',

      // Periods
      'periods.1d': '1D',
      'periods.5d': '5D',
      'periods.1mo': '1M',
      'periods.3mo': '3M',
      'periods.6mo': '6M',
      'periods.1y': '1A',
      'periods.2y': '2A',
      'periods.5y': '5A',
      'periods.max': 'MAX',

      // Common
      'common.loading': 'Carregando dados...',
      'common.error': 'Ocorreu um erro ao carregar os dados',
      'common.noData': 'Dados indisponíveis',
      'common.save': 'Salvar',
      'common.cancel': 'Cancelar',
      'common.close': 'Fechar',
      'common.success': 'Sucesso!',
      'common.addedToPortfolio': 'Ativo adicionado à carteira com sucesso!',
      'common.removedFromPortfolio': 'Ativo removido da carteira!',
    },

    'en': {
      // Search & Navigation
      'search.placeholder': 'Search stocks... (e.g., AAPL, PETR4.SA, MSFT)',
      'search.button': 'Search',
      'search.noResults': 'No stocks found',
      'search.popular': 'Popular Stocks',
      'nav.search': 'Search',
      'nav.portfolio': 'My Portfolio',

      // Welcome Screen
      'welcome.title': 'Welcome to FinançasPro',
      'welcome.subtitle': 'Search any stock from stock markets around the world',

      // Quote & Key Statistics
      'quote.price': 'Current Price',
      'quote.change': 'Change',
      'quote.open': 'Open',
      'quote.high': 'Day High',
      'quote.low': 'Day Low',
      'quote.volume': 'Volume',
      'quote.avgVolume': 'Avg. Volume (3m)',
      'quote.marketCap': 'Market Cap',
      'quote.peRatio': 'P/E Ratio',
      'quote.forwardPE': 'Forward P/E',
      'quote.priceToBook': 'Price to Book',
      'quote.52weekHigh': '52-Week High',
      'quote.52weekLow': '52-Week Low',
      'quote.beta': 'Beta',
      'quote.addToPortfolio': 'Add to Portfolio',
      'quote.marketState': 'Market State',
      'quote.currency': 'Stock Currency',

      // Targets & Recommendations
      'targets.title': 'Analyst Price Targets',
      'targets.meanTarget': 'Mean Target',
      'targets.highTarget': 'High Target',
      'targets.lowTarget': 'Low Target',
      'targets.medianTarget': 'Median Target',
      'targets.upside': 'Upside Potential',
      'targets.downside': 'Downside Risk',
      'targets.recommendation': 'Consensus Recommendation',
      'targets.analysts': 'Number of Analysts',
      'targets.strongBuy': 'Strong Buy',
      'targets.buy': 'Buy',
      'targets.hold': 'Hold',
      'targets.sell': 'Sell',
      'targets.strongSell': 'Strong Sell',
      'targets.recommendationTrend': 'Recommendation Trend',

      // Dividends
      'dividends.title': 'Dividends & Payouts',
      'dividends.yield': 'Dividend Yield',
      'dividends.lastAmount': 'Last Dividend',
      'dividends.exDate': 'Ex-Dividend Date',
      'dividends.payoutRatio': 'Payout Ratio',
      'dividends.history': 'Dividend History',
      'dividends.noHistory': 'No recent dividend history',
      'dividends.nextExpected': 'Next Expected Dividend',
      'dividends.confirmed': 'Ex-Date Confirmed',
      'dividends.estimated': 'Estimated Projection',
      'dividends.countdownDays': 'days remaining to ex-date',
      'dividends.passed': 'Recent / In settlement',
      'dividends.frequency': 'Observed Frequency',
      'targets.consensusScore': 'Consensus Score',
      'targets.breakdown': 'Analyst Distribution',
      'targets.scoreScale': '1.0 (Strong Buy) to 5.0 (Sell)',
      'nav.news': 'Market News',
      'news.title': 'Financial Market News',
      'news.subtitle': 'Key economic headlines, market trends, and global updates',
      'news.companyTitle': 'Company News & Events',
      'news.companySubtitle': 'Recent coverage for',
      'news.readMore': 'Read full story',
      'news.noNews': 'No recent news found for this symbol.',
      'news.timeAgo': 'Published',

      // Portfolio
      'portfolio.title': 'Investment Portfolio',
      'portfolio.add': 'Add Holding',
      'portfolio.ticker': 'Ticker Symbol',
      'portfolio.name': 'Company Name',
      'portfolio.quantity': 'Quantity',
      'portfolio.buyPrice': 'Avg. Buy Price',
      'portfolio.buyDate': 'Purchase Date',
      'portfolio.totalInvested': 'Total Invested',
      'portfolio.currentValue': 'Current Value',
      'portfolio.totalProfit': 'Total Profit / Loss',
      'portfolio.totalReturn': 'Total Return',
      'portfolio.stock': 'Stock',
      'portfolio.shares': 'Shares',
      'portfolio.avgPrice': 'Avg. Price',
      'portfolio.currentPrice': 'Current Price',
      'portfolio.profit': 'Profit / Loss',
      'portfolio.return': 'Return',
      'portfolio.actions': 'Actions',
      'portfolio.dividendsReceived': 'Dividends Received',
      'portfolio.projectedDividends': 'Projected Annual Dividends (12m)',
      'portfolio.allocation': 'Portfolio Allocation',
      'portfolio.empty': 'Your portfolio is empty',
      'portfolio.emptyDesc': 'Search for stocks and add holdings to track your performance.',
      'portfolio.remove': 'Remove',
      'portfolio.export': 'Export Portfolio (JSON)',
      'portfolio.import': 'Import Portfolio (JSON)',
      'portfolio.confirmRemove': 'Are you sure you want to remove this stock from your portfolio?',
      'portfolio.importSuccess': 'Portfolio successfully imported!',
      'portfolio.importError': 'Failed to import file. Please check the JSON format.',
      'portfolio.month': 'Month',
      'portfolio.projectedAmount': 'Estimated Payout',

      // Settings
      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.currency': 'Display Currency',

      // Periods
      'periods.1d': '1D',
      'periods.5d': '5D',
      'periods.1mo': '1M',
      'periods.3mo': '3M',
      'periods.6mo': '6M',
      'periods.1y': '1Y',
      'periods.2y': '2Y',
      'periods.5y': '5Y',
      'periods.max': 'MAX',

      // Common
      'common.loading': 'Loading data...',
      'common.error': 'An error occurred while loading data',
      'common.noData': 'Data not available',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.close': 'Close',
      'common.success': 'Success!',
      'common.addedToPortfolio': 'Stock added to portfolio successfully!',
      'common.removedFromPortfolio': 'Stock removed from portfolio!',
    },

    'es': {
      // Search & Navigation
      'search.placeholder': 'Buscar acciones... (ej: AAPL, PETR4.SA, SAN)',
      'search.button': 'Buscar',
      'search.noResults': 'No se encontraron activos',
      'search.popular': 'Activos Populares',
      'nav.search': 'Buscar',
      'nav.portfolio': 'Mi Cartera',

      // Welcome Screen
      'welcome.title': 'Bienvenido a FinançasPro',
      'welcome.subtitle': 'Busque cualquier acción en los mercados bursátiles del mundo',

      // Quote & Key Statistics
      'quote.price': 'Precio Actual',
      'quote.change': 'Variación',
      'quote.open': 'Apertura',
      'quote.high': 'Máximo del Día',
      'quote.low': 'Mínimo del Día',
      'quote.volume': 'Volumen',
      'quote.avgVolume': 'Vol. Promedio (3m)',
      'quote.marketCap': 'Capitalización',
      'quote.peRatio': 'P/E (PER)',
      'quote.forwardPE': 'P/E Futuro',
      'quote.priceToBook': 'Precio / Valor Contable',
      'quote.52weekHigh': 'Máx. 52 Semanas',
      'quote.52weekLow': 'Mín. 52 Semanas',
      'quote.beta': 'Beta',
      'quote.addToPortfolio': 'Añadir a Cartera',
      'quote.marketState': 'Estado del Mercado',
      'quote.currency': 'Moneda del Activo',

      // Targets & Recommendations
      'targets.title': 'Objetivos de Analistas',
      'targets.meanTarget': 'Precio Objetivo Medio',
      'targets.highTarget': 'Objetivo Máximo',
      'targets.lowTarget': 'Objetivo Mínimo',
      'targets.medianTarget': 'Objetivo Mediano',
      'targets.upside': 'Potencial de Alza',
      'targets.downside': 'Riesgo de Caída',
      'targets.recommendation': 'Consenso de Analistas',
      'targets.analysts': 'Total de Analistas',
      'targets.strongBuy': 'Compra Fuerte',
      'targets.buy': 'Compra',
      'targets.hold': 'Mantener',
      'targets.sell': 'Venta',
      'targets.strongSell': 'Venta Fuerte',
      'targets.recommendationTrend': 'Tendencia de Recomendaciones',

      // Dividends
      'dividends.title': 'Dividendos y Rendimientos',
      'dividends.yield': 'Rentabilidad por Dividendo (DY)',
      'dividends.lastAmount': 'Último Dividendo',
      'dividends.exDate': 'Fecha Ex-Dividendo',
      'dividends.payoutRatio': 'Ratio de Payout',
      'dividends.history': 'Historial de Dividendos',
      'dividends.noHistory': 'Sin historial reciente de dividendos',
      'dividends.nextExpected': 'Próximo Dividendo Previsto',
      'dividends.confirmed': 'Fecha Ex Confirmada',
      'dividends.estimated': 'Proyección Estimada',
      'dividends.countdownDays': 'días restantes para fecha ex',
      'dividends.passed': 'Fecha reciente / en liquidación',
      'dividends.frequency': 'Frecuencia Observada',
      'targets.consensusScore': 'Puntuación de Consenso',
      'targets.breakdown': 'Distribución de Analistas',
      'targets.scoreScale': '1.0 (Compra Fuerte) a 5.0 (Venta)',
      'nav.news': 'Noticias',
      'news.title': 'Noticias del Mercado Financiero',
      'news.subtitle': 'Principales titulares económicos, bolsas y mercados globales',
      'news.companyTitle': 'Noticias y Hechos Relevantes',
      'news.companySubtitle': 'Cobertura reciente sobre',
      'news.readMore': 'Leer noticia completa',
      'news.noNews': 'No se encontraron noticias recientes para este activo.',
      'news.timeAgo': 'Publicado',

      // Portfolio
      'portfolio.title': 'Mi Cartera de Inversiones',
      'portfolio.add': 'Añadir Activo',
      'portfolio.ticker': 'Símbolo / Ticker',
      'portfolio.name': 'Empresa / Nombre',
      'portfolio.quantity': 'Cantidad',
      'portfolio.buyPrice': 'Precio Medio / Compra',
      'portfolio.buyDate': 'Fecha de Compra',
      'portfolio.totalInvested': 'Total Invertido',
      'portfolio.currentValue': 'Valor Actual',
      'portfolio.totalProfit': 'Ganancia / Pérdida',
      'portfolio.totalReturn': 'Rentabilidad Total',
      'portfolio.stock': 'Activo',
      'portfolio.shares': 'Acciones',
      'portfolio.avgPrice': 'Precio Medio',
      'portfolio.currentPrice': 'Precio Actual',
      'portfolio.profit': 'Ganancia / Pérdida',
      'portfolio.return': 'Retorno',
      'portfolio.actions': 'Acciones',
      'portfolio.dividendsReceived': 'Dividendos Recibidos',
      'portfolio.projectedDividends': 'Proyección de Dividendos (12m)',
      'portfolio.allocation': 'Distribución de Cartera',
      'portfolio.empty': 'Tu cartera está vacía',
      'portfolio.emptyDesc': 'Busca activos y añádelos para seguir el rendimiento de tus inversiones.',
      'portfolio.remove': 'Eliminar',
      'portfolio.export': 'Exportar Cartera (JSON)',
      'portfolio.import': 'Importar Cartera (JSON)',
      'portfolio.confirmRemove': '¿Estás seguro de que deseas eliminar este activo de la cartera?',
      'portfolio.importSuccess': '¡Cartera importada con éxito!',
      'portfolio.importError': 'Error al importar. Revisa el archivo JSON.',
      'portfolio.month': 'Mes',
      'portfolio.projectedAmount': 'Monto Estimado',

      // Settings
      'settings.title': 'Configuración',
      'settings.language': 'Idioma',
      'settings.currency': 'Moneda',

      // Periods
      'periods.1d': '1D',
      'periods.5d': '5D',
      'periods.1mo': '1M',
      'periods.3mo': '3M',
      'periods.6mo': '6M',
      'periods.1y': '1A',
      'periods.2y': '2A',
      'periods.5y': '5A',
      'periods.max': 'MAX',

      // Common
      'common.loading': 'Cargando datos...',
      'common.error': 'Ocurrió un error al cargar los datos',
      'common.noData': 'Datos no disponibles',
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.close': 'Cerrar',
      'common.success': '¡Éxito!',
      'common.addedToPortfolio': '¡Activo añadido a la cartera correctamente!',
      'common.removedFromPortfolio': '¡Activo eliminado de la cartera!',
    }
  };

  // Locale configuration mapping
  const localeMap = {
    'pt-BR': 'pt-BR',
    'en': 'en-US',
    'es': 'es-ES'
  };

  // Active state
  let currentLang = localStorage.getItem(STORAGE_LANG_KEY) || 'pt-BR';
  if (!translations[currentLang]) {
    currentLang = 'pt-BR';
  }

  let currentCurrency = localStorage.getItem(STORAGE_CURRENCY_KEY) || 'BRL';

  /**
   * Get translation for a key
   */
  function t(key, fallback = '') {
    const langDict = translations[currentLang] || translations['pt-BR'];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English then PT-BR
    if (translations['en'] && translations['en'][key] !== undefined) {
      return translations['en'][key];
    }
    if (translations['pt-BR'] && translations['pt-BR'][key] !== undefined) {
      return translations['pt-BR'][key];
    }
    return fallback || key;
  }

  /**
   * Set current language
   */
  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      document.documentElement.lang = lang;
      applyTranslations();
      return true;
    }
    return false;
  }

  /**
   * Get current language
   */
  function getLanguage() {
    return currentLang;
  }

  /**
   * Set display currency
   */
  function setCurrency(currency) {
    currentCurrency = currency.toUpperCase();
    localStorage.setItem(STORAGE_CURRENCY_KEY, currentCurrency);
  }

  /**
   * Get current currency
   */
  function getCurrency() {
    return currentCurrency;
  }

  /**
   * Format a monetary value with currency symbol
   * e.g., formatCurrency(1250.50, 'USD')
   */
  function formatCurrency(value, currency = null) {
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    const cur = (currency || currentCurrency || 'USD').toUpperCase();
    const loc = localeMap[currentLang] || 'pt-BR';

    try {
      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: cur,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (e) {
      // Fallback for custom or unsupported currency codes
      const formattedNum = formatNumber(value, 2);
      const symbolMap = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
      const sym = symbolMap[cur] || cur;
      return `${sym} ${formattedNum}`;
    }
  }

  /**
   * Format numbers with commas/dots per locale
   */
  function formatNumber(number, decimals = 2) {
    if (number === null || number === undefined || isNaN(number)) {
      return '-';
    }
    const loc = localeMap[currentLang] || 'pt-BR';
    return new Intl.NumberFormat(loc, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  }

  /**
   * Format percentages (+X.XX% / -X.XX%)
   */
  function formatPercent(number, decimals = 2, includeSign = true) {
    if (number === null || number === undefined || isNaN(number)) {
      return '-';
    }
    const loc = localeMap[currentLang] || 'pt-BR';
    const formatted = new Intl.NumberFormat(loc, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(number));

    const sign = number > 0 ? '+' : number < 0 ? '-' : '';
    return includeSign ? `${sign}${formatted}%` : `${formatted}%`;
  }

  /**
   * Format compact numbers (1.5M, 2.3B, etc.)
   */
  function formatCompactNumber(number) {
    if (number === null || number === undefined || isNaN(number)) {
      return '-';
    }
    const loc = localeMap[currentLang] || 'pt-BR';
    return new Intl.NumberFormat(loc, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(number);
  }

  /**
   * Format date per locale
   */
  function formatDate(dateInput, options = {}) {
    if (!dateInput) return '-';

    let date;
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      date = dateInput;
    }

    if (isNaN(date.getTime())) return '-';

    const loc = localeMap[currentLang] || 'pt-BR';
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat(loc, defaultOptions).format(date);
  }

  /**
   * Automatically update elements with [data-i18n] or [data-i18n-placeholder]
   */
  function applyTranslations(container = document) {
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key));
      }
    });

    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', t(key));
      }
    });
  }

  return {
    t,
    setLanguage,
    getLanguage,
    setCurrency,
    getCurrency,
    formatCurrency,
    formatNumber,
    formatPercent,
    formatCompactNumber,
    formatDate,
    applyTranslations,
    translations,
  };
})();
