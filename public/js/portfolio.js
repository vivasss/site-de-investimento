/**
 * FinançasPro - Portfolio Management Module
 * Manages holdings, calculates real-time metrics, dividend projections, and rendering.
 */
window.Portfolio = (() => {
  const STORAGE_KEY = 'financasPro_portfolio';

  /**
   * Generate simple unique identifier
   */
  function generateId() {
    return 'hold_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Load portfolio array from localStorage
   * @returns {Array<{ id: string, ticker: string, name: string, quantity: number, buyPrice: number, buyDate: string, currency: string }>}
   */
  function getPortfolio() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading portfolio from localStorage:', e);
      return [];
    }
  }

  /**
   * Save portfolio array to localStorage
   */
  function savePortfolio(portfolio) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    } catch (e) {
      console.error('Error saving portfolio to localStorage:', e);
    }
  }

  /**
   * Add a new holding to portfolio
   */
  function addHolding(ticker, name, quantity, buyPrice, buyDate, currency = 'USD') {
    const portfolio = getPortfolio();
    const cleanTicker = (ticker || '').trim().toUpperCase();

    // Check if user already holds this ticker, we can either combine or add separate lot
    const newHolding = {
      id: generateId(),
      ticker: cleanTicker,
      name: name || cleanTicker,
      quantity: Number(quantity) || 1,
      buyPrice: Number(buyPrice) || 0,
      buyDate: buyDate || new Date().toISOString().split('T')[0],
      currency: (currency || 'USD').toUpperCase(),
    };

    portfolio.push(newHolding);
    savePortfolio(portfolio);
    return newHolding;
  }

  /**
   * Remove holding by ID
   */
  function removeHolding(id) {
    let portfolio = getPortfolio();
    portfolio = portfolio.filter(item => item.id !== id);
    savePortfolio(portfolio);
    return portfolio;
  }

  /**
   * Calculate live metrics by fetching latest quotes from the API
   */
  async function calculatePortfolioMetrics(portfolio) {
    if (!Array.isArray(portfolio) || portfolio.length === 0) {
      return {
        holdings: [],
        metrics: {
          totalInvested: 0,
          totalCurrentValue: 0,
          totalProfit: 0,
          totalReturn: 0,
          estimatedAnnualDividend: 0,
        }
      };
    }

    // Fetch quotes for all holdings concurrently
    const quotePromises = portfolio.map(async (holding) => {
      let quote = null;
      try {
        if (window.API && typeof window.API.getQuote === 'function') {
          quote = await window.API.getQuote(holding.ticker);
        }
      } catch (err) {
        console.warn(`Could not fetch quote for ${holding.ticker}:`, err.message);
      }

      const currentPrice = quote && quote.regularMarketPrice !== null
        ? quote.regularMarketPrice
        : holding.buyPrice;

      const currency = quote && quote.currency ? quote.currency : holding.currency || 'USD';
      const quantity = Number(holding.quantity) || 0;
      const buyPrice = Number(holding.buyPrice) || 0;

      const totalCost = quantity * buyPrice;
      const currentValue = quantity * currentPrice;
      const profit = currentValue - totalCost;
      const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      const dividendYield = (quote && quote.dividendYield) ? quote.dividendYield : 0;
      const dividendRate = (quote && quote.dividendRate) ? quote.dividendRate : 0;
      const estimatedAnnualDividend = dividendRate > 0
        ? quantity * dividendRate
        : (currentValue * (dividendYield / 100));

      return {
        ...holding,
        name: holding.name || (quote && (quote.shortName || quote.longName)) || holding.ticker,
        currentPrice,
        currency,
        totalCost,
        currentValue,
        profit,
        profitPercent,
        dividendYield,
        estimatedAnnualDividend,
        regularMarketChange: quote ? quote.regularMarketChange : 0,
        regularMarketChangePercent: quote ? quote.regularMarketChangePercent : 0,
      };
    });

    const enrichedHoldings = await Promise.all(quotePromises);

    // Aggregate totals
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalAnnualDividend = 0;

    enrichedHoldings.forEach(item => {
      totalInvested += item.totalCost;
      totalCurrentValue += item.currentValue;
      totalAnnualDividend += item.estimatedAnnualDividend;
    });

    const totalProfit = totalCurrentValue - totalInvested;
    const totalReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      holdings: enrichedHoldings,
      metrics: {
        totalInvested,
        totalCurrentValue,
        totalProfit,
        totalReturn,
        estimatedAnnualDividend: totalAnnualDividend,
      }
    };
  }

  /**
   * Project next 12 months of dividends
   */
  async function getProjectedDividends(portfolio) {
    if (!Array.isArray(portfolio) || portfolio.length === 0) {
      return { monthlyTimeline: [], totalProjected: 0 };
    }

    const monthsAhead = 12;
    const now = new Date();
    const monthlyBuckets = {};

    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyBuckets[key] = {
        monthKey: key,
        date: d,
        amount: 0,
        details: []
      };
    }

    let totalProjected = 0;

    // Fetch dividend history for each stock to detect payout months
    for (const holding of portfolio) {
      let divData = null;
      try {
        if (window.API) {
          divData = await window.API.getDividends(holding.ticker);
        }
      } catch (e) {
        // Continue even if one ticker fails
      }

      const quantity = Number(holding.quantity) || 0;
      let lastDividend = divData ? divData.lastDividend : 0;
      const history = (divData && Array.isArray(divData.history)) ? divData.history : [];

      if (!lastDividend && history.length > 0) {
        lastDividend = history[history.length - 1].amount;
      }

      // If dividend exists, distribute across historical payout months
      if (lastDividend > 0) {
        // Detect payout frequency from history
        const payoutMonths = new Set();
        history.slice(-8).forEach(h => {
          if (h.date) {
            const m = new Date(h.date).getMonth();
            payoutMonths.add(m);
          }
        });

        // Default to quarterly if no history found
        if (payoutMonths.size === 0) {
          const currentM = now.getMonth();
          [currentM, (currentM + 3) % 12, (currentM + 6) % 12, (currentM + 9) % 12].forEach(m => payoutMonths.add(m));
        }

        const payoutPerEvent = lastDividend * quantity / (payoutMonths.size || 4);

        Object.values(monthlyBuckets).forEach(bucket => {
          if (payoutMonths.has(bucket.date.getMonth())) {
            bucket.amount += payoutPerEvent;
            bucket.details.push({
              ticker: holding.ticker,
              amount: payoutPerEvent
            });
            totalProjected += payoutPerEvent;
          }
        });
      }
    }

    const monthlyTimeline = Object.values(monthlyBuckets);
    return { monthlyTimeline, totalProjected };
  }

  /**
   * Export portfolio as downloadable JSON file
   */
  function exportPortfolio() {
    const portfolio = getPortfolio();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(portfolio, null, 2));
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `financaspro_portfolio_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Import portfolio from uploaded JSON file
   */
  function importPortfolio(file, onComplete = null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid format: root must be an array of holdings');
        }

        // Validate items
        const sanitized = parsed.map(item => ({
          id: item.id || generateId(),
          ticker: String(item.ticker || '').trim().toUpperCase(),
          name: String(item.name || item.ticker || ''),
          quantity: Math.max(1, Number(item.quantity) || 1),
          buyPrice: Math.max(0.01, Number(item.buyPrice) || 0),
          buyDate: item.buyDate || new Date().toISOString().split('T')[0],
          currency: item.currency || 'USD'
        })).filter(h => h.ticker.length > 0);

        savePortfolio(sanitized);

        if (window.I18n) {
          alert(window.I18n.t('portfolio.importSuccess'));
        }
        if (typeof onComplete === 'function') {
          onComplete(sanitized);
        }
      } catch (err) {
        console.error('Import error:', err);
        alert(window.I18n ? window.I18n.t('portfolio.importError') : 'Erro ao importar arquivo');
      }
    };
    reader.readAsText(file);
  }

  /**
   * Render the complete Portfolio view
   */
  async function renderPortfolio(containerId = 'portfolioTab') {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return;

    const rawPortfolio = getPortfolio();

    // If portfolio is empty, show empty state immediately
    if (rawPortfolio.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-wallet"></i></div>
          <h2>${window.I18n ? window.I18n.t('portfolio.empty') : 'Sua carteira está vazia'}</h2>
          <p>${window.I18n ? window.I18n.t('portfolio.emptyDesc') : 'Pesquise ativos e adicione-os para acompanhar o desempenho da sua carteira.'}</p>
          <div class="empty-actions">
            <button class="btn btn-primary" id="emptySearchBtn">
              <i class="fas fa-search"></i> ${window.I18n ? window.I18n.t('nav.search') : 'Pesquisar Ações'}
            </button>
            <label class="btn btn-secondary">
              <i class="fas fa-file-import"></i> ${window.I18n ? window.I18n.t('portfolio.import') : 'Importar JSON'}
              <input type="file" id="importJsonInputEmpty" accept=".json" style="display:none;">
            </label>
          </div>
        </div>
      `;

      // Event listener for empty state search button
      const searchBtn = container.querySelector('#emptySearchBtn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          const tabBtn = document.querySelector('.tab[data-tab="search"]');
          if (tabBtn) tabBtn.click();
        });
      }

      const importInput = container.querySelector('#importJsonInputEmpty');
      if (importInput) {
        importInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            importPortfolio(e.target.files[0], () => renderPortfolio(containerId));
          }
        });
      }

      return;
    }

    // Show loading state while fetching quotes & metrics
    container.innerHTML = `
      <div class="portfolio-loading">
        <div class="loading-spinner"></div>
        <p>${window.I18n ? window.I18n.t('common.loading') : 'Atualizando cotações da carteira...'}</p>
      </div>
    `;

    // Compute live metrics & projections
    const [enrichedData, projectedData] = await Promise.all([
      calculatePortfolioMetrics(rawPortfolio),
      getProjectedDividends(rawPortfolio).catch(() => ({ monthlyTimeline: [], totalProjected: 0 }))
    ]);

    const { holdings, metrics } = enrichedData;
    const isProfitPositive = metrics.totalProfit >= 0;
    const profitColorClass = isProfitPositive ? 'text-green' : 'text-red';
    const profitSign = isProfitPositive ? '+' : '';

    const formatCur = (val) => window.I18n ? window.I18n.formatCurrency(val) : `$${val.toFixed(2)}`;
    const formatPct = (val) => window.I18n ? window.I18n.formatPercent(val) : `${val.toFixed(2)}%`;
    const formatDte = (d) => window.I18n ? window.I18n.formatDate(d) : d;

    // Render HTML structure
    container.innerHTML = `
      <div class="portfolio-view animate-fade-in">
        <!-- Top Toolbar -->
        <div class="portfolio-header-bar">
          <div class="portfolio-title-group">
            <h1 class="page-title"><i class="fas fa-briefcase"></i> ${window.I18n ? window.I18n.t('portfolio.title') : 'Minha Carteira'}</h1>
            <span class="portfolio-count-badge">${holdings.length} ${holdings.length === 1 ? 'ativo' : 'ativos'}</span>
          </div>
          <div class="portfolio-actions-group">
            <button class="btn btn-primary" id="openManualAddBtn">
              <i class="fas fa-plus"></i> ${window.I18n ? window.I18n.t('portfolio.add') : 'Adicionar Ativo'}
            </button>
            <button class="btn btn-secondary" id="exportPortfolioBtn" title="${window.I18n ? window.I18n.t('portfolio.export') : 'Exportar JSON'}">
              <i class="fas fa-file-export"></i> ${window.I18n ? window.I18n.t('portfolio.export') : 'Exportar'}
            </button>
            <label class="btn btn-secondary" title="${window.I18n ? window.I18n.t('portfolio.import') : 'Importar JSON'}">
              <i class="fas fa-file-import"></i> ${window.I18n ? window.I18n.t('portfolio.import') : 'Importar'}
              <input type="file" id="importJsonInput" accept=".json" style="display:none;">
            </label>
          </div>
        </div>

        <!-- Summary Metric Cards -->
        <div class="portfolio-summary">
          <div class="summary-card">
            <div class="summary-icon icon-blue"><i class="fas fa-coins"></i></div>
            <div class="summary-info">
              <span class="summary-label">${window.I18n ? window.I18n.t('portfolio.totalInvested') : 'Total Investido'}</span>
              <span class="summary-value">${formatCur(metrics.totalInvested)}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon icon-purple"><i class="fas fa-chart-line"></i></div>
            <div class="summary-info">
              <span class="summary-label">${window.I18n ? window.I18n.t('portfolio.currentValue') : 'Valor Atual'}</span>
              <span class="summary-value">${formatCur(metrics.totalCurrentValue)}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon ${isProfitPositive ? 'icon-green' : 'icon-red'}">
              <i class="fas ${isProfitPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            </div>
            <div class="summary-info">
              <span class="summary-label">${window.I18n ? window.I18n.t('portfolio.totalProfit') : 'Lucro / Prejuízo'}</span>
              <span class="summary-value ${profitColorClass}">
                ${profitSign}${formatCur(metrics.totalProfit)}
              </span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon ${isProfitPositive ? 'icon-green' : 'icon-red'}"><i class="fas fa-percentage"></i></div>
            <div class="summary-info">
              <span class="summary-label">${window.I18n ? window.I18n.t('portfolio.totalReturn') : 'Rentabilidade Total'}</span>
              <span class="summary-value ${profitColorClass}">
                ${formatPct(metrics.totalReturn)}
              </span>
            </div>
          </div>
        </div>

        <!-- Main Grid: Holdings Table & Allocation Pie -->
        <div class="portfolio-grid-layout">
          <!-- Holdings Table Section -->
          <div class="portfolio-table-card card">
            <div class="card-header">
              <h3><i class="fas fa-table-list"></i> ${window.I18n ? window.I18n.t('portfolio.stock') : 'Ativos em Carteira'}</h3>
            </div>
            <div class="table-responsive">
              <table class="holdings-table">
                <thead>
                  <tr>
                    <th>${window.I18n ? window.I18n.t('portfolio.stock') : 'Ativo'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.shares') : 'Qtd.'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.avgPrice') : 'Preço Médio'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.currentPrice') : 'Preço Atual'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.currentValue') : 'Valor Total'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.profit') : 'Lucro / Prej.'}</th>
                    <th>${window.I18n ? window.I18n.t('portfolio.return') : 'Retorno'}</th>
                    <th class="text-center">${window.I18n ? window.I18n.t('portfolio.actions') : 'Ações'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${holdings.map(item => {
                    const itemIsProfit = item.profit >= 0;
                    const itemColor = itemIsProfit ? 'text-green' : 'text-red';
                    const itemSign = itemIsProfit ? '+' : '';
                    return `
                      <tr data-id="${item.id}" class="holding-row">
                        <td class="holding-ticker-cell">
                          <strong class="ticker-link" data-ticker="${item.ticker}">${item.ticker}</strong>
                          <span class="company-subname">${item.name || ''}</span>
                        </td>
                        <td>${item.quantity}</td>
                        <td>${formatCur(item.buyPrice)}</td>
                        <td>
                          <strong>${formatCur(item.currentPrice)}</strong>
                          ${item.regularMarketChangePercent ? `<span class="tiny-badge ${item.regularMarketChangePercent >= 0 ? 'badge-green' : 'badge-red'}">${item.regularMarketChangePercent >= 0 ? '+' : ''}${item.regularMarketChangePercent.toFixed(2)}%</span>` : ''}
                        </td>
                        <td>${formatCur(item.currentValue)}</td>
                        <td class="${itemColor}">${itemSign}${formatCur(item.profit)}</td>
                        <td class="${itemColor}"><strong>${formatPct(item.profitPercent)}</strong></td>
                        <td class="text-center">
                          <button class="btn-icon btn-danger remove-holding-btn" data-id="${item.id}" title="${window.I18n ? window.I18n.t('portfolio.remove') : 'Remover'}">
                            <i class="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Allocation Pie Chart Section -->
          <div class="portfolio-pie-card card">
            <div class="card-header">
              <h3><i class="fas fa-chart-pie"></i> ${window.I18n ? window.I18n.t('portfolio.allocation') : 'Alocação da Carteira'}</h3>
            </div>
            <div class="pie-chart-wrapper" id="portfolioPieContainer">
              <canvas id="portfolioPieCanvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Dividend Projections Section -->
        <div class="portfolio-dividends-card card">
          <div class="card-header">
            <div class="card-title-group">
              <h3><i class="fas fa-calendar-check"></i> ${window.I18n ? window.I18n.t('portfolio.projectedDividends') : 'Projeção de Proventos (12 meses)'}</h3>
              <span class="badge badge-info">
                Est. Anual: ${formatCur(metrics.estimatedAnnualDividend || projectedData.totalProjected)}
              </span>
            </div>
          </div>
          <div class="dividends-projection-container">
            ${renderDividendsProjection(projectedData.monthlyTimeline, formatCur)}
          </div>
        </div>
      </div>
    `;

    // Render allocation pie chart
    if (window.Charts && typeof window.Charts.createPortfolioPieChart === 'function') {
      window.Charts.createPortfolioPieChart('portfolioPieCanvas', holdings);
    }

    // Attach Event Handlers:
    // 1. Remove holding buttons
    container.querySelectorAll('.remove-holding-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const confirmMsg = window.I18n ? window.I18n.t('portfolio.confirmRemove') : 'Deseja remover este ativo?';
        if (confirm(confirmMsg)) {
          removeHolding(id);
          renderPortfolio(containerId);
        }
      });
    });

    // 2. Click on ticker to view stock
    container.querySelectorAll('.ticker-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const ticker = e.currentTarget.getAttribute('data-ticker');
        if (ticker && window.App && typeof window.App.loadStockView === 'function') {
          // Switch to search tab and load ticker
          const searchTabBtn = document.querySelector('.tab[data-tab="search"]');
          if (searchTabBtn) searchTabBtn.click();
          window.App.loadStockView(ticker);
        }
      });
    });

    // 3. Export button
    const exportBtn = container.querySelector('#exportPortfolioBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportPortfolio);
    }

    // 4. Import input
    const importInput = container.querySelector('#importJsonInput');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importPortfolio(e.target.files[0], () => renderPortfolio(containerId));
        }
      });
    }

    // 5. Open Manual Add Modal
    const manualAddBtn = container.querySelector('#openManualAddBtn');
    if (manualAddBtn) {
      manualAddBtn.addEventListener('click', () => {
        const modal = document.getElementById('addModal');
        if (modal) {
          const formTicker = document.getElementById('formTicker');
          const formName = document.getElementById('formName');
          const formPrice = document.getElementById('formBuyPrice');
          const formDate = document.getElementById('formBuyDate');
          const formQty = document.getElementById('formQuantity');

          if (formTicker) {
            formTicker.removeAttribute('readonly');
            formTicker.value = '';
          }
          if (formName) {
            formName.removeAttribute('readonly');
            formName.value = '';
          }
          if (formPrice) formPrice.value = '';
          if (formQty) formQty.value = '1';
          if (formDate) formDate.value = new Date().toISOString().split('T')[0];

          modal.classList.remove('hidden');
        }
      });
    }
  }

  /**
   * Helper to render monthly projected dividends
   */
  function renderDividendsProjection(monthlyTimeline, formatCur) {
    if (!monthlyTimeline || monthlyTimeline.length === 0) {
      return `<p class="text-secondary text-center py-4">${window.I18n ? window.I18n.t('dividends.noHistory') : 'Nenhuma projeção disponível'}</p>`;
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return `
      <div class="projection-months-grid">
        ${monthlyTimeline.map(m => {
          const monthLabel = monthNames[m.date.getMonth()] + '/' + String(m.date.getFullYear()).slice(2);
          const hasPayout = m.amount > 0;
          return `
            <div class="month-card ${hasPayout ? 'has-dividend' : 'no-dividend'}">
              <span class="month-name">${monthLabel}</span>
              <span class="month-amount">${hasPayout ? formatCur(m.amount) : '-'}</span>
              ${m.details && m.details.length ? `
                <div class="month-details" title="${m.details.map(d => `${d.ticker}: ${formatCur(d.amount)}`).join(', ')}">
                  ${m.details.length} ${m.details.length === 1 ? 'pagador' : 'pagadores'}
                </div>
              ` : '<div class="month-details text-muted">-</div>'}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return {
    getPortfolio,
    savePortfolio,
    addHolding,
    removeHolding,
    generateId,
    calculatePortfolioMetrics,
    getProjectedDividends,
    exportPortfolio,
    importPortfolio,
    renderPortfolio,
  };
})();
