/**
 * FinançasPro - Main Application Orchestrator
 * Handles navigation, search debounce, stock view rendering, charts, periods, modals, and settings.
 */
window.App = (() => {
  // Application State
  let currentActiveTab = 'search';
  let currentTicker = null;
  let currentStockData = null;
  let activePeriod = '1y';
  let activeStockChart = null;
  let activeDividendChart = null;
  let searchDebounceTimeout = null;
  let currentNewsTopic = 'stock market economy finance';

  /**
   * Initialize Application
   */
  function init() {
    initI18nAndSettings();
    initNavigationTabs();
    initSearch();
    initPopularTickers();
    initPeriodSelector();
    initModal();
    initSettingsDropdown();
    initNewsFilterChips();

    // Check if URL has a ticker parameter (e.g. ?ticker=AAPL)
    const urlParams = new URLSearchParams(window.location.search);
    const tickerFromUrl = urlParams.get('ticker');
    if (tickerFromUrl) {
      loadStockView(tickerFromUrl);
    }
  }

  /**
   * Setup language and currency selectors and apply initial translations
   */
  function initI18nAndSettings() {
    if (!window.I18n) return;

    const langSelect = document.getElementById('languageSelect');
    const currSelect = document.getElementById('currencySelect');

    if (langSelect) {
      langSelect.value = window.I18n.getLanguage();
      langSelect.addEventListener('change', (e) => {
        window.I18n.setLanguage(e.target.value);
        refreshCurrentView();
      });
    }

    if (currSelect) {
      currSelect.value = window.I18n.getCurrency();
      currSelect.addEventListener('change', (e) => {
        window.I18n.setCurrency(e.target.value);
        refreshCurrentView();
      });
    }

    window.I18n.applyTranslations();
  }

  /**
   * Setup Settings Dropdown button toggle
   */
  function initSettingsDropdown() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');

    if (settingsBtn && settingsMenu) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
          settingsMenu.classList.add('hidden');
        }
      });
    }
  }

  /**
   * Setup Main Tab Navigation ('search' vs 'portfolio' vs 'news')
   */
  function initNavigationTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  /**
   * Switch active tab
   */
  function switchTab(tabId) {
    currentActiveTab = tabId;

    // Update tab buttons
    document.querySelectorAll('.tabs .tab').forEach(t => {
      if (t.getAttribute('data-tab') === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Update tab content panes
    const searchTab = document.getElementById('searchTab');
    const portfolioTab = document.getElementById('portfolioTab');
    const newsTab = document.getElementById('newsTab');

    if (searchTab) searchTab.classList.toggle('active', tabId === 'search');
    if (portfolioTab) portfolioTab.classList.toggle('active', tabId === 'portfolio');
    if (newsTab) newsTab.classList.toggle('active', tabId === 'news');

    if (tabId === 'portfolio') {
      if (window.Portfolio) {
        window.Portfolio.renderPortfolio('portfolioTab');
      }
    } else if (tabId === 'news') {
      loadMarketNews();
    }
  }

  /**
   * Re-render active view after language or currency changes
   */
  function refreshCurrentView() {
    if (window.I18n) {
      window.I18n.applyTranslations();
    }

    if (currentActiveTab === 'portfolio') {
      if (window.Portfolio) {
        window.Portfolio.renderPortfolio('portfolioTab');
      }
    } else if (currentActiveTab === 'news') {
      loadMarketNews();
    } else if (currentActiveTab === 'search' && currentTicker && currentStockData) {
      renderStockHeader(currentStockData.quote);
      renderStatsGrid(currentStockData.quote);
      renderTargets(currentStockData.targets, currentStockData.quote);
      renderRecommendations(currentStockData.targets);
      renderDividends(currentStockData.dividends, currentStockData.quote);
      renderCompanyNews(currentStockData.companyNews, currentStockData.quote);
      renderAddToPortfolioSection(currentStockData.quote);
    }
  }

  /**
   * Setup stock search bar with 300ms debouncing and suggestion dropdown
   */
  function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsBox = document.getElementById('searchSuggestions');

    if (!searchInput || !suggestionsBox) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(searchDebounceTimeout);

      if (!query || query.length < 1) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
      }

      searchDebounceTimeout = setTimeout(async () => {
        try {
          if (!window.API) return;
          const results = await window.API.searchStocks(query);
          renderSearchSuggestions(results, suggestionsBox);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          suggestionsBox.classList.add('hidden');
          loadStockView(query.toUpperCase());
        }
      } else if (e.key === 'Escape') {
        suggestionsBox.classList.add('hidden');
      }
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.add('hidden');
      }
    });
  }

  /**
   * Render autocomplete search suggestions dropdown
   */
  function renderSearchSuggestions(results, container) {
    if (!Array.isArray(results) || results.length === 0) {
      const noResultsTxt = window.I18n ? window.I18n.t('search.noResults') : 'Nenhum ativo encontrado';
      container.innerHTML = `<div class="suggestion-item no-results">${noResultsTxt}</div>`;
      container.classList.remove('hidden');
      return;
    }

    container.innerHTML = results.map(item => `
      <div class="suggestion-item" data-ticker="${item.symbol}">
        <div class="suggestion-left">
          <span class="suggestion-symbol">${item.symbol}</span>
          <span class="suggestion-name">${item.shortname || ''}</span>
        </div>
        <div class="suggestion-right">
          <span class="suggestion-exchange">${item.exchDisp || ''}</span>
        </div>
      </div>
    `).join('');

    container.classList.remove('hidden');

    // Attach click events to each suggestion
    container.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        const ticker = el.getAttribute('data-ticker');
        if (ticker) {
          const searchInput = document.getElementById('searchInput');
          if (searchInput) searchInput.value = ticker;
          container.classList.add('hidden');
          loadStockView(ticker);
        }
      });
    });
  }

  /**
   * Popular ticker chips click handling in welcome view
   */
  function initPopularTickers() {
    document.querySelectorAll('.ticker-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const ticker = chip.getAttribute('data-ticker');
        if (ticker) {
          const searchInput = document.getElementById('searchInput');
          if (searchInput) searchInput.value = ticker;
          loadStockView(ticker);
        }
      });
    });
  }

  /**
   * Period buttons (1D, 5D, 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX)
   */
  function initPeriodSelector() {
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const period = btn.getAttribute('data-period');
        if (period === activePeriod || !currentTicker) return;

        periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePeriod = period;

        await reloadChartData(currentTicker, activePeriod);
      });
    });
  }

  /**
   * Reload only chart candle history when period changes
   */
  async function reloadChartData(ticker, period) {
    if (!window.API || !window.Charts) return;

    try {
      const history = await window.API.getHistory(ticker, period);
      if (activeStockChart && activeStockChart.candleSeries) {
        window.Charts.updateChart(activeStockChart, history);
      } else {
        activeStockChart = window.Charts.createStockChart('mainChart', history);
      }
    } catch (err) {
      console.error('Failed to load chart history for period:', period, err);
    }
  }

  /**
   * Main function to fetch all data and load full stock view
   */
  async function loadStockView(ticker) {
    if (!ticker) return;
    const cleanTicker = ticker.trim().toUpperCase();
    currentTicker = cleanTicker;

    // Switch to search tab if not already on it
    switchTab('search');

    const welcomeState = document.getElementById('welcomeState');
    const stockView = document.getElementById('stockView');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorText = document.getElementById('errorText');

    if (welcomeState) welcomeState.classList.add('hidden');
    if (stockView) stockView.classList.remove('hidden');
    if (errorState) errorState.classList.add('hidden');
    if (loadingState) loadingState.classList.remove('hidden');

    try {
      if (!window.API) throw new Error('API client not available');

      // Fetch quote, history, dividends, targets, and company news concurrently
      const [quote, history, dividends, targets, companyNews] = await Promise.all([
        window.API.getQuote(cleanTicker),
        window.API.getHistory(cleanTicker, activePeriod),
        window.API.getDividends(cleanTicker).catch(err => {
          console.warn('Dividends warning:', err.message);
          return { currentYield: null, lastDividend: null, history: [] };
        }),
        window.API.getTargets(cleanTicker).catch(err => {
          console.warn('Targets warning:', err.message);
          return { currentPrice: null, targetMean: null, trend: [] };
        }),
        window.API.getCompanyNews(cleanTicker).catch(err => {
          console.warn('News warning:', err.message);
          return [];
        }),
      ]);

      currentStockData = { quote, history, dividends, targets, companyNews };

      // Render all subcomponents
      renderStockHeader(quote);
      renderStatsGrid(quote);
      renderTargets(targets, quote);
      renderRecommendations(targets);
      renderDividends(dividends, quote);
      renderCompanyNews(companyNews, quote);
      renderAddToPortfolioSection(quote);

      // Hide loading
      if (loadingState) loadingState.classList.add('hidden');

      // Render Candlestick Stock Chart
      if (window.Charts) {
        if (activeStockChart && typeof activeStockChart.destroy === 'function') {
          activeStockChart.destroy();
        }
        requestAnimationFrame(() => {
          activeStockChart = window.Charts.createStockChart('mainChart', history);
        });
      }

      // Update URL without page reload
      const newUrl = `${window.location.pathname}?ticker=${encodeURIComponent(cleanTicker)}`;
      window.history.replaceState({ ticker: cleanTicker }, '', newUrl);

    } catch (err) {
      console.error('Error loading stock view:', err);
      if (loadingState) loadingState.classList.add('hidden');
      if (errorState) {
        errorState.classList.remove('hidden');
        if (errorText) {
          errorText.textContent = err.message || (window.I18n ? window.I18n.t('common.error') : 'Erro ao carregar ativo');
        }
      }
    }
  }

  /**
   * Render Stock Header (Symbol, Name, Price, Change Badge, Market State)
   */
  function renderStockHeader(quote) {
    const headerContainer = document.getElementById('stockHeader');
    if (!headerContainer || !quote) return;

    const isPositive = (quote.regularMarketChange || 0) >= 0;
    const changeSign = isPositive ? '+' : '';
    const badgeClass = isPositive ? 'badge-green' : 'badge-red';
    const changeIcon = isPositive ? 'fa-caret-up' : 'fa-caret-down';

    const formatCur = (val) => window.I18n ? window.I18n.formatCurrency(val, quote.currency) : `$${val.toFixed(2)}`;
    const formatPct = (val) => window.I18n ? window.I18n.formatPercent(val) : `${val.toFixed(2)}%`;

    headerContainer.innerHTML = `
      <div class="stock-header-main">
        <div class="stock-title-info">
          <div class="stock-symbol-row">
            <h1 class="stock-symbol">${quote.symbol}</h1>
            <span class="stock-exchange-badge">${quote.exchange || ''}</span>
            ${quote.marketState ? `<span class="market-state-badge state-${quote.marketState.toLowerCase()}">${quote.marketState}</span>` : ''}
          </div>
          <h2 class="stock-fullname">${quote.longName || quote.shortName || quote.symbol}</h2>
        </div>

        <div class="stock-price-info">
          <div class="stock-price-value">${formatCur(quote.regularMarketPrice)}</div>
          <div class="stock-change-row">
            <span class="stock-change-badge ${badgeClass}">
              <i class="fas ${changeIcon}"></i>
              ${changeSign}${formatCur(quote.regularMarketChange)} (${formatPct(quote.regularMarketChangePercent)})
            </span>
            <span class="stock-currency-label">${quote.currency || ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Key Statistics Grid
   */
  function renderStatsGrid(quote) {
    const statsContainer = document.getElementById('statsGrid');
    if (!statsContainer || !quote) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;
    const formatCur = (v) => window.I18n ? window.I18n.formatCurrency(v, quote.currency) : (v || '-');
    const formatNum = (v, d = 2) => window.I18n ? window.I18n.formatNumber(v, d) : (v || '-');
    const formatCompact = (v) => window.I18n ? window.I18n.formatCompactNumber(v) : (v || '-');

    const stats = [
      { label: t('quote.open'), value: formatCur(quote.regularMarketOpen) },
      { label: t('quote.high'), value: formatCur(quote.regularMarketDayHigh) },
      { label: t('quote.low'), value: formatCur(quote.regularMarketDayLow) },
      { label: t('quote.volume'), value: formatCompact(quote.regularMarketVolume) },
      { label: t('quote.avgVolume'), value: formatCompact(quote.averageVolume) },
      { label: t('quote.marketCap'), value: formatCompact(quote.marketCap) },
      { label: t('quote.52weekHigh'), value: formatCur(quote.fiftyTwoWeekHigh) },
      { label: t('quote.52weekLow'), value: formatCur(quote.fiftyTwoWeekLow) },
      { label: t('quote.peRatio'), value: formatNum(quote.trailingPE) },
      { label: t('quote.forwardPE'), value: formatNum(quote.forwardPE) },
      { label: t('quote.priceToBook'), value: formatNum(quote.priceToBook) },
      { label: t('quote.beta'), value: formatNum(quote.beta) },
    ];

    statsContainer.innerHTML = stats.map(s => `
      <div class="stat-card">
        <span class="stat-label">${s.label}</span>
        <span class="stat-value">${s.value !== null && s.value !== undefined ? s.value : '-'}</span>
      </div>
    `).join('');
  }

  /**
   * Render Price Target Visual Bar and Targets Section
   */
  function renderTargets(targets, quote) {
    const targetsContainer = document.getElementById('targetsSection');
    if (!targetsContainer) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;
    const cur = quote ? quote.currency : 'USD';
    const formatCur = (v) => window.I18n ? window.I18n.formatCurrency(v, cur) : `$${v}`;

    if (!targets || (!targets.targetMean && !targets.targetHigh)) {
      targetsContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-bullseye"></i> ${t('targets.title')}</h3>
          </div>
          <p class="text-secondary p-4">${t('common.noData')}</p>
        </div>
      `;
      return;
    }

    const current = targets.currentPrice || (quote ? quote.regularMarketPrice : 0);
    const mean = targets.targetMean || current;
    const high = targets.targetHigh || Math.max(mean, current * 1.2);
    const low = targets.targetLow || Math.min(mean, current * 0.8);

    // Calculate upside / downside percentage from current price to target mean
    let upsidePercent = 0;
    if (current > 0 && mean > 0) {
      upsidePercent = ((mean - current) / current) * 100;
    }
    const isUpside = upsidePercent >= 0;

    // Calculate bar positions
    const range = Math.max(0.001, high - low);
    const currentPercent = Math.min(100, Math.max(0, ((current - low) / range) * 100));
    const meanPercent = Math.min(100, Math.max(0, ((mean - low) / range) * 100));

    targetsContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <h3><i class="fas fa-bullseye"></i> ${t('targets.title')}</h3>
            ${targets.numberOfAnalysts ? `<span class="badge badge-secondary">${targets.numberOfAnalysts} ${t('targets.analysts')}</span>` : ''}
          </div>
          <span class="badge ${isUpside ? 'badge-green' : 'badge-red'}">
            <i class="fas ${isUpside ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            ${isUpside ? '+' : ''}${upsidePercent.toFixed(1)}% ${isUpside ? t('targets.upside') : t('targets.downside')}
          </span>
        </div>

        <div class="target-bar-wrapper">
          <div class="target-bar-labels">
            <div class="target-min">
              <span class="label">${t('targets.lowTarget')}</span>
              <strong class="value">${formatCur(low)}</strong>
            </div>
            <div class="target-current">
              <span class="label">${t('quote.price')}</span>
              <strong class="value highlight">${formatCur(current)}</strong>
            </div>
            <div class="target-mean">
              <span class="label">${t('targets.meanTarget')}</span>
              <strong class="value highlight-accent">${formatCur(mean)}</strong>
            </div>
            <div class="target-max">
              <span class="label">${t('targets.highTarget')}</span>
              <strong class="value">${formatCur(high)}</strong>
            </div>
          </div>

          <div class="target-track">
            <div class="target-track-fill"></div>
            <!-- Current Price Marker -->
            <div class="target-pin current-pin" style="left: ${currentPercent}%;" title="${t('quote.price')}: ${formatCur(current)}">
              <div class="pin-head"></div>
              <div class="pin-tag">${formatCur(current)}</div>
            </div>
            <!-- Mean Target Marker -->
            <div class="target-pin mean-pin" style="left: ${meanPercent}%;" title="${t('targets.meanTarget')}: ${formatCur(mean)}">
              <div class="pin-head mean"></div>
              <div class="pin-tag mean">${formatCur(mean)}</div>
            </div>
          </div>
        </div>

        <div class="target-metrics-cards">
          <div class="target-mini-card">
            <span class="target-mini-label">${t('targets.lowTarget')}</span>
            <span class="target-mini-value">${formatCur(low)}</span>
          </div>
          <div class="target-mini-card">
            <span class="target-mini-label">${t('targets.medianTarget')}</span>
            <span class="target-mini-value">${formatCur(targets.targetMedian || mean)}</span>
          </div>
          <div class="target-mini-card">
            <span class="target-mini-label">${t('targets.meanTarget')}</span>
            <span class="target-mini-value text-accent">${formatCur(mean)}</span>
          </div>
          <div class="target-mini-card">
            <span class="target-mini-label">${t('targets.highTarget')}</span>
            <span class="target-mini-value">${formatCur(high)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Analyst Recommendations & Trends Chart
   */
  function renderRecommendations(targets) {
    const recContainer = document.getElementById('recommendationSection');
    if (!recContainer) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;

    // Consensus recommendation key formatting
    const recKey = (targets && targets.recommendation) ? targets.recommendation.toLowerCase() : null;
    let recBadgeClass = 'badge-warning';
    let recText = t('targets.hold');

    if (recKey === 'strong_buy' || recKey === 'strongbuy') {
      recBadgeClass = 'badge-green';
      recText = t('targets.strongBuy');
    } else if (recKey === 'buy') {
      recBadgeClass = 'badge-green';
      recText = t('targets.buy');
    } else if (recKey === 'hold') {
      recBadgeClass = 'badge-warning';
      recText = t('targets.hold');
    } else if (recKey === 'sell') {
      recBadgeClass = 'badge-orange';
      recText = t('targets.sell');
    } else if (recKey === 'strong_sell' || recKey === 'strongsell') {
      recBadgeClass = 'badge-red';
      recText = t('targets.strongSell');
    }

    // Extract current period counts from targets.trend
    let strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0;
    if (targets && Array.isArray(targets.trend) && targets.trend.length > 0) {
      const currentTrend = targets.trend[0] || {};
      strongBuy = Number(currentTrend.strongBuy) || 0;
      buy = Number(currentTrend.buy) || 0;
      hold = Number(currentTrend.hold) || 0;
      sell = Number(currentTrend.sell) || 0;
      strongSell = Number(currentTrend.strongSell) || 0;
    }

    const totalFromTrend = strongBuy + buy + hold + sell + strongSell;
    const totalAnalysts = targets && targets.numberOfAnalysts
      ? targets.numberOfAnalysts
      : totalFromTrend;

    const safeTotal = Math.max(1, totalFromTrend);
    const sbPct = ((strongBuy / safeTotal) * 100).toFixed(0);
    const bPct = ((buy / safeTotal) * 100).toFixed(0);
    const hPct = ((hold / safeTotal) * 100).toFixed(0);
    const sPct = ((sell / safeTotal) * 100).toFixed(0);
    const ssPct = ((strongSell / safeTotal) * 100).toFixed(0);

    const recMean = targets && targets.recommendationMean ? targets.recommendationMean.toFixed(1) : '-';

    recContainer.innerHTML = `
      <div class="card consensus-card">
        <div class="card-header">
          <div class="card-title-group">
            <h3><i class="fas fa-users-viewfinder text-accent"></i> ${t('targets.recommendation')}</h3>
            ${totalAnalysts ? `<span class="badge badge-secondary">${totalAnalysts} ${t('targets.analysts')}</span>` : ''}
          </div>
          <span class="badge ${recBadgeClass} text-uppercase font-weight-bold px-3 py-1">${recText}</span>
        </div>

        <div class="consensus-main-row">
          <!-- Left: Score Badge & Consensus Level -->
          <div class="consensus-badge-box">
            <span class="consensus-rating-label">${t('targets.consensusScore')}</span>
            <div class="consensus-rating-value ${recBadgeClass}">${recText}</div>
            <div class="consensus-score-circle">
              <strong>${recMean}</strong> <span>/ 5.0</span>
            </div>
            <span class="consensus-score-scale">${t('targets.scoreScale')}</span>
          </div>

          <!-- Right: Clear Breakdown Bars -->
          <div class="consensus-breakdown-list">
            <div class="consensus-bar-item">
              <span class="bar-name text-green"><i class="fas fa-circle font-xs"></i> ${t('targets.strongBuy')}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${sbPct}%; background: #2e7d32;"></div></div>
              <span class="bar-count">${strongBuy}</span>
              <span class="bar-pct">${sbPct}%</span>
            </div>
            <div class="consensus-bar-item">
              <span class="bar-name text-green"><i class="fas fa-circle font-xs"></i> ${t('targets.buy')}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${bPct}%; background: #26a69a;"></div></div>
              <span class="bar-count">${buy}</span>
              <span class="bar-pct">${bPct}%</span>
            </div>
            <div class="consensus-bar-item">
              <span class="bar-name text-yellow"><i class="fas fa-circle font-xs"></i> ${t('targets.hold')}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${hPct}%; background: #d29922;"></div></div>
              <span class="bar-count">${hold}</span>
              <span class="bar-pct">${hPct}%</span>
            </div>
            <div class="consensus-bar-item">
              <span class="bar-name text-orange"><i class="fas fa-circle font-xs"></i> ${t('targets.sell')}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${sPct}%; background: #f0883e;"></div></div>
              <span class="bar-count">${sell}</span>
              <span class="bar-pct">${sPct}%</span>
            </div>
            <div class="consensus-bar-item">
              <span class="bar-name text-red"><i class="fas fa-circle font-xs"></i> ${t('targets.strongSell')}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${ssPct}%; background: #ef5350;"></div></div>
              <span class="bar-count">${strongSell}</span>
              <span class="bar-pct">${ssPct}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Dividends Section with Metrics and Bar Chart
   */
  function renderDividends(dividends, quote) {
    const divContainer = document.getElementById('dividendsSection');
    if (!divContainer) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;
    const cur = quote ? quote.currency : 'USD';
    const formatCur = (v) => window.I18n ? window.I18n.formatCurrency(v, cur) : `$${v}`;
    const formatPct = (v) => window.I18n ? window.I18n.formatPercent(v, 2, false) : `${v}%`;
    const formatDte = (v) => window.I18n ? window.I18n.formatDate(v) : (v || '-');

    const dy = (dividends && dividends.currentYield) || (quote && quote.dividendYield);
    const payout = (dividends && dividends.payoutRatio) || (quote && quote.payoutRatio);
    const lastAmount = (dividends && dividends.lastDividend) || (quote && quote.dividendRate);
    const rawExDate = (dividends && dividends.exDividendDate) || (quote && quote.exDividendDate);

    // Calculate Next Expected Dividend
    const now = new Date();
    let nextDivDateStr = null;
    let isConfirmed = false;
    let daysRemaining = null;
    let frequencyText = 'Trimestral';

    if (rawExDate) {
      const exDateObj = new Date(rawExDate);
      if (!isNaN(exDateObj.getTime())) {
        if (exDateObj >= now) {
          isConfirmed = true;
          nextDivDateStr = formatDte(rawExDate);
          daysRemaining = Math.ceil((exDateObj - now) / (1000 * 60 * 60 * 24));
        }
      }
    }

    // If not confirmed in the future, project based on historical intervals
    if (!isConfirmed && dividends && Array.isArray(dividends.history) && dividends.history.length >= 2) {
      const sorted = [...dividends.history].sort((a, b) => new Date(a.date) - new Date(b.date));
      const intervals = [];
      for (let i = Math.max(1, sorted.length - 4); i < sorted.length; i++) {
        const d1 = new Date(sorted[i - 1].date);
        const d2 = new Date(sorted[i].date);
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (diffDays > 10 && diffDays < 450) {
          intervals.push(diffDays);
        }
      }

      let avgInterval = 90; // Default quarterly
      if (intervals.length > 0) {
        avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      }

      if (avgInterval <= 45) frequencyText = 'Mensal';
      else if (avgInterval <= 120) frequencyText = 'Trimestral';
      else if (avgInterval <= 220) frequencyText = 'Semestral';
      else frequencyText = 'Anual';

      // Project from last payment
      const lastPayment = new Date(sorted[sorted.length - 1].date);
      let projected = new Date(lastPayment.getTime() + (avgInterval * 24 * 60 * 60 * 1000));
      while (projected < now) {
        projected = new Date(projected.getTime() + (avgInterval * 24 * 60 * 60 * 1000));
      }
      nextDivDateStr = formatDte(projected);
      daysRemaining = Math.ceil((projected - now) / (1000 * 60 * 60 * 24));
    }

    let nextDivCalloutHTML = '';
    if (nextDivDateStr) {
      const badgeClass = isConfirmed ? 'badge-green' : 'badge-blue';
      const badgeIcon = isConfirmed ? 'fa-circle-check' : 'fa-calendar-days';
      const badgeLabel = isConfirmed ? t('dividends.confirmed') : `${t('dividends.estimated')} (${frequencyText})`;
      const countdownHTML = daysRemaining !== null && daysRemaining > 0
        ? `<span class="badge badge-secondary"><i class="fas fa-hourglass-half"></i> ${daysRemaining} ${t('dividends.countdownDays')}</span>`
        : '';

      nextDivCalloutHTML = `
        <div class="next-dividend-callout">
          <div class="next-div-left">
            <div class="next-div-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="next-div-title-box">
              <h4>${t('dividends.nextExpected')}</h4>
              <p>Previsão para a data com / próximo anúncio aos acionistas</p>
            </div>
          </div>
          <div class="next-div-right">
            <span class="next-div-badge ${badgeClass}"><i class="fas ${badgeIcon}"></i> ${badgeLabel}</span>
            <span class="next-div-date">${nextDivDateStr}</span>
            ${countdownHTML}
          </div>
        </div>
      `;
    } else if (!dy && (!dividends || !dividends.history || dividends.history.length === 0)) {
      nextDivCalloutHTML = `
        <div class="next-dividend-callout" style="background: rgba(255,255,255,0.03); border-color: var(--border);">
          <div class="next-div-left">
            <div class="next-div-icon" style="background: rgba(255,255,255,0.06); color: var(--text-muted);"><i class="fas fa-chart-line"></i></div>
            <div class="next-div-title-box">
              <h4>${t('dividends.title')}</h4>
              <p>Esta empresa não possui histórico recente de distribuição ou é focada em reinvestimento/crescimento.</p>
            </div>
          </div>
        </div>
      `;
    }

    divContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-hand-holding-dollar text-accent"></i> ${t('dividends.title')}</h3>
          ${dy ? `<span class="badge badge-blue">DY: ${formatPct(dy)}</span>` : ''}
        </div>

        ${nextDivCalloutHTML}

        <div class="dividends-summary-grid">
          <div class="div-stat-card">
            <span class="div-label">${t('dividends.yield')}</span>
            <strong class="div-value text-accent">${dy ? formatPct(dy) : '-'}</strong>
          </div>
          <div class="div-stat-card">
            <span class="div-label">${t('dividends.lastAmount')}</span>
            <strong class="div-value">${lastAmount ? formatCur(lastAmount) : '-'}</strong>
          </div>
          <div class="div-stat-card">
            <span class="div-label">${t('dividends.payoutRatio')}</span>
            <strong class="div-value">${payout ? formatPct(payout * 100) : '-'}</strong>
          </div>
          <div class="div-stat-card">
            <span class="div-label">${t('dividends.exDate')}</span>
            <strong class="div-value">${formatDte(rawExDate)}</strong>
          </div>
        </div>

        <div class="dividend-chart-box">
          <h4 class="subcard-title">${t('dividends.history')}</h4>
          <div class="dividend-chart-container" id="dividendChartContainer"></div>
        </div>
      </div>
    `;

    // Render Dividend Payments Chart
    if (window.Charts && dividends && dividends.history) {
      if (activeDividendChart && typeof activeDividendChart.destroy === 'function') {
        activeDividendChart.destroy();
      }
      activeDividendChart = window.Charts.createDividendChart('dividendChartContainer', dividends.history);
    }
  }

  /**
   * Helper: Format relative timestamp
   */
  function formatTimeAgo(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Agora';
    if (diffSeconds < 3600) return `Há ${Math.floor(diffSeconds / 60)} min`;
    if (diffSeconds < 86400) return `Há ${Math.floor(diffSeconds / 3600)} h`;
    const diffDays = Math.floor(diffSeconds / 86400);
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString();
  }

  /**
   * Helper: Render a single news card HTML
   */
  function renderNewsCardHTML(item) {
    const timeAgo = formatTimeAgo(item.publishTime);
    const thumbHTML = item.thumbnail
      ? `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-newspaper news-card-thumb-placeholder\\'></i>';">`
      : `<i class="fas fa-newspaper news-card-thumb-placeholder"></i>`;

    const tickersHTML = (item.relatedTickers && item.relatedTickers.length > 0)
      ? `<div class="news-tickers-row">
           ${item.relatedTickers.slice(0, 4).map(tk => `<span class="news-ticker-tag">${tk}</span>`).join('')}
         </div>`
      : '';

    return `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-card">
        <div class="news-card-thumb">
          ${thumbHTML}
        </div>
        <div class="news-card-body">
          <div class="news-meta-row">
            <span class="news-publisher"><i class="fas fa-globe"></i> ${item.publisher || 'Mercado'}</span>
            <span class="news-time">${timeAgo}</span>
          </div>
          <h3 class="news-title">${item.title}</h3>
          ${tickersHTML}
        </div>
      </a>
    `;
  }

  /**
   * Render Company-Specific News Section
   */
  function renderCompanyNews(news, quote) {
    const section = document.getElementById('companyNewsSection');
    if (!section) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;
    const ticker = quote ? quote.symbol : '';
    const companyName = quote ? (quote.shortName || quote.longName || ticker) : '';

    if (!Array.isArray(news) || news.length === 0) {
      section.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <h3><i class="fas fa-newspaper text-accent"></i> ${t('news.companyTitle')} (${ticker})</h3>
            </div>
            <span class="text-secondary font-sm">${companyName}</span>
          </div>
          <p class="text-secondary p-4">${t('news.noNews')}</p>
        </div>
      `;
      return;
    }

    section.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <h3><i class="fas fa-newspaper text-accent"></i> ${t('news.companyTitle')} (${ticker})</h3>
            <span class="badge badge-secondary">${news.length} notícias</span>
          </div>
          <span class="text-secondary font-sm">${companyName}</span>
        </div>
        <div class="news-grid">
          ${news.map(renderNewsCardHTML).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Setup Market News Filter Chips
   */
  function initNewsFilterChips() {
    const chips = document.querySelectorAll('#newsFilterChips .news-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const topic = chip.getAttribute('data-topic');
        currentNewsTopic = topic;
        loadMarketNews(topic);
      });
    });
  }

  /**
   * Load and render General Market News in the News Tab
   */
  async function loadMarketNews(topic = currentNewsTopic) {
    const grid = document.getElementById('newsGrid');
    const loading = document.getElementById('newsLoading');
    if (!grid) return;

    if (loading) loading.classList.remove('hidden');
    grid.innerHTML = '';

    try {
      if (!window.API) return;
      const news = await window.API.getMarketNews(topic);
      if (loading) loading.classList.add('hidden');

      if (!Array.isArray(news) || news.length === 0) {
        grid.innerHTML = `<div class="empty-state p-6"><i class="fas fa-newspaper text-muted fa-3x mb-3"></i><p>Nenhuma notícia encontrada no momento.</p></div>`;
        return;
      }

      grid.innerHTML = news.map(renderNewsCardHTML).join('');
    } catch (err) {
      console.error('Failed to load market news:', err);
      if (loading) loading.classList.add('hidden');
      grid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> <p>Erro ao carregar notícias do mercado.</p></div>`;
    }
  }

  /**
   * Render 'Add to Portfolio' Button Section
   */
  function renderAddToPortfolioSection(quote) {
    const section = document.getElementById('addToPortfolioSection');
    if (!section || !quote) return;

    const t = (k) => window.I18n ? window.I18n.t(k) : k;

    section.innerHTML = `
      <div class="add-portfolio-banner">
        <div class="banner-text">
          <h3><i class="fas fa-wallet"></i> Adicionar ${quote.symbol} à sua Carteira</h3>
          <p>Acompanhe cotações em tempo real, lucros e projeções automáticas de proventos.</p>
        </div>
        <button class="btn btn-primary btn-lg" id="openAddToPortfolioModalBtn">
          <i class="fas fa-plus"></i> ${t('quote.addToPortfolio')}
        </button>
      </div>
    `;

    const openBtn = section.querySelector('#openAddToPortfolioModalBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        openAddHoldingModal(quote);
      });
    }
  }

  /**
   * Setup Add to Portfolio Modal events and form submission
   */
  function initModal() {
    const modal = document.getElementById('addModal');
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
    const form = document.getElementById('addHoldingForm');

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const ticker = document.getElementById('formTicker').value;
        const name = document.getElementById('formName').value;
        const quantity = parseFloat(document.getElementById('formQuantity').value);
        const buyPrice = parseFloat(document.getElementById('formBuyPrice').value);
        const buyDate = document.getElementById('formBuyDate').value;
        const currency = (currentStockData && currentStockData.quote && currentStockData.quote.currency) || 'USD';

        if (!ticker || isNaN(quantity) || isNaN(buyPrice)) {
          alert('Preencha todos os campos obrigatórios');
          return;
        }

        if (window.Portfolio) {
          window.Portfolio.addHolding(ticker, name, quantity, buyPrice, buyDate, currency);
          closeModal();

          const successMsg = window.I18n ? window.I18n.t('common.addedToPortfolio') : 'Ativo adicionado com sucesso!';
          showToast(successMsg);

          // If currently in portfolio tab, refresh it
          if (currentActiveTab === 'portfolio') {
            window.Portfolio.renderPortfolio('portfolioTab');
          }
        }
      });
    }
  }

  /**
   * Open Modal prefilled with stock data
   */
  function openAddHoldingModal(quote) {
    const modal = document.getElementById('addModal');
    if (!modal) return;

    const formTicker = document.getElementById('formTicker');
    const formName = document.getElementById('formName');
    const formPrice = document.getElementById('formBuyPrice');
    const formDate = document.getElementById('formBuyDate');
    const formQty = document.getElementById('formQuantity');

    if (formTicker) {
      formTicker.value = quote.symbol || '';
      formTicker.setAttribute('readonly', 'readonly');
    }
    if (formName) {
      formName.value = quote.longName || quote.shortName || quote.symbol || '';
      formName.setAttribute('readonly', 'readonly');
    }
    if (formPrice) {
      formPrice.value = quote.regularMarketPrice ? quote.regularMarketPrice.toFixed(2) : '';
    }
    if (formQty) {
      formQty.value = '1';
    }
    if (formDate) {
      formDate.value = new Date().toISOString().split('T')[0];
    }

    modal.classList.remove('hidden');
  }

  /**
   * Lightweight toast notification
   */
  function showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    loadStockView,
    switchTab,
    showToast,
  };
})();
