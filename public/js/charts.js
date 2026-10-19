/**
 * FinançasPro - Charts Module
 * TradingView Lightweight Charts & HTML5 Canvas 2D custom visualizations.
 */
window.Charts = (() => {
  // Color palette matching Bloomberg / TradingView dark theme
  const THEME = {
    bg: '#1a1a2e',
    cardBg: '#1c2333',
    grid: 'rgba(197, 203, 206, 0.08)',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    crosshair: 'rgba(197, 203, 206, 0.3)',
    upColor: '#26a69a',
    downColor: '#ef5350',
    volumeUp: 'rgba(38, 166, 154, 0.45)',
    volumeDown: 'rgba(239, 83, 80, 0.45)',
    dividendBar: '#4fc3f7',
    pieColors: [
      '#58a6ff', '#26a69a', '#d29922', '#bc8cff', '#f778ba',
      '#3fb950', '#79c0ff', '#e3b341', '#f0883e', '#56d364',
      '#db61a2', '#807fe2'
    ],
    recColors: {
      strongBuy: '#2e7d32',
      buy: '#26a69a',
      hold: '#d29922',
      sell: '#f0883e',
      strongSell: '#ef5350'
    }
  };

  // Keep track of active chart resize observers to prevent memory leaks
  const activeObservers = new Map();

  /**
   * Sanitize candle data: remove nulls/invalids, deduplicate timestamps, sort ascending
   */
  function sanitizeCandles(data) {
    if (!Array.isArray(data)) return [];
    const timeMap = new Map();

    data.forEach(item => {
      if (item && item.time !== undefined && item.time !== null &&
          typeof item.open === 'number' && typeof item.high === 'number' &&
          typeof item.low === 'number' && typeof item.close === 'number') {
        timeMap.set(item.time, {
          time: item.time,
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
          volume: Number(item.volume) || 0
        });
      }
    });

    return Array.from(timeMap.values()).sort((a, b) => {
      if (typeof a.time === 'string') return a.time.localeCompare(b.time);
      return a.time - b.time;
    });
  }

  /**
   * Helper to set high-DPI canvas dimensions
   */
  function setupHiDPICanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, dpr };
  }

  /**
   * 1. Create Stock Candlestick Chart with Volume Histogram using Lightweight Charts
   */
  function createStockChart(containerId, data, volumeData = null) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) {
      console.error(`Container #${containerId} not found`);
      return null;
    }

    // Clean up container
    if (activeObservers.has(container)) {
      activeObservers.get(container).disconnect();
      activeObservers.delete(container);
    }
    container.innerHTML = '';

    if (!window.LightweightCharts) {
      container.innerHTML = `<div class="chart-error">TradingView Lightweight Charts library not loaded</div>`;
      return null;
    }

    const cleanCandles = sanitizeCandles(data);
    if (!cleanCandles.length) {
      container.innerHTML = `<div class="empty-chart"><i class="fas fa-chart-line"></i><p>Dados de velas indisponíveis para este período.</p></div>`;
      return null;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    const chart = window.LightweightCharts.createChart(container, {
      width,
      height,
      layout: {
        background: { type: 'solid', color: THEME.bg },
        textColor: THEME.textSecondary,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: THEME.grid },
        horzLines: { color: THEME.grid },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: THEME.crosshair,
          width: 1,
          style: 1,
          labelBackgroundColor: '#21262d',
        },
        horzLine: {
          color: THEME.crosshair,
          width: 1,
          style: 1,
          labelBackgroundColor: '#21262d',
        },
      },
      rightPriceScale: {
        borderColor: '#30363d',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick Series (compatible with Lightweight Charts v4 and v5)
    const candleSeries = typeof chart.addCandlestickSeries === 'function'
      ? chart.addCandlestickSeries({
          upColor: THEME.upColor,
          downColor: THEME.downColor,
          borderUpColor: THEME.upColor,
          borderDownColor: THEME.downColor,
          wickUpColor: THEME.upColor,
          wickDownColor: THEME.downColor,
        })
      : chart.addSeries(window.LightweightCharts.CandlestickSeries, {
          upColor: THEME.upColor,
          downColor: THEME.downColor,
          borderUpColor: THEME.upColor,
          borderDownColor: THEME.downColor,
          wickUpColor: THEME.upColor,
          wickDownColor: THEME.downColor,
        });
    candleSeries.setData(cleanCandles);

    // Volume Series overlay (compatible with v4 and v5)
    const volumeSeries = typeof chart.addHistogramSeries === 'function'
      ? chart.addHistogramSeries({
          color: THEME.volumeUp,
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '', // Overlay pane
        })
      : chart.addSeries(window.LightweightCharts.HistogramSeries, {
          color: THEME.volumeUp,
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '', // Overlay pane
        });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.78, // Put volume at the bottom 22%
        bottom: 0,
      },
    });

    // Generate volume records matching candle times and colors
    let finalVolumeData = [];
    if (volumeData && Array.isArray(volumeData) && volumeData.length) {
      finalVolumeData = volumeData;
    } else {
      finalVolumeData = cleanCandles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? THEME.volumeUp : THEME.volumeDown,
      }));
    }
    volumeSeries.setData(finalVolumeData);

    chart.timeScale().fitContent();

    // Responsive auto-resize observer
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        chart.applyOptions({ width: newWidth, height: newHeight });
      }
    });
    resizeObserver.observe(container);
    activeObservers.set(container, resizeObserver);

    return {
      chart,
      candleSeries,
      volumeSeries,
      container,
      destroy: () => {
        resizeObserver.disconnect();
        chart.remove();
        activeObservers.delete(container);
      }
    };
  }

  /**
   * 2. Update existing stock chart with new candle and volume data
   */
  function updateChart(chartInstance, data, volumeData = null) {
    if (!chartInstance || !chartInstance.candleSeries || !chartInstance.volumeSeries) {
      console.warn('Invalid chart instance provided to updateChart');
      return;
    }

    const cleanCandles = sanitizeCandles(data);
    if (!cleanCandles.length) return;

    chartInstance.candleSeries.setData(cleanCandles);

    let finalVolumeData = [];
    if (volumeData && Array.isArray(volumeData) && volumeData.length) {
      finalVolumeData = volumeData;
    } else {
      finalVolumeData = cleanCandles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? THEME.volumeUp : THEME.volumeDown,
      }));
    }

    chartInstance.volumeSeries.setData(finalVolumeData);
    chartInstance.chart.timeScale().fitContent();
  }

  /**
   * 3. Create Dividend Payments Bar Chart using Lightweight Charts
   */
  function createDividendChart(containerId, dividendHistory) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    if (activeObservers.has(container)) {
      activeObservers.get(container).disconnect();
      activeObservers.delete(container);
    }
    container.innerHTML = '';

    if (!Array.isArray(dividendHistory) || dividendHistory.length === 0) {
      container.innerHTML = `
        <div class="empty-chart">
          <i class="fas fa-hand-holding-usd"></i>
          <p>${window.I18n ? window.I18n.t('dividends.noHistory') : 'Nenhum histórico recente de dividendos'}</p>
        </div>`;
      return null;
    }

    // Format & sort dividend items chronologically
    const timeMap = new Map();
    dividendHistory.forEach(item => {
      if (item && item.date && item.amount !== undefined && item.amount > 0) {
        // Normalize date to YYYY-MM-DD
        let dateStr = item.date;
        if (typeof dateStr === 'string' && dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }
        const existing = timeMap.get(dateStr) || 0;
        timeMap.set(dateStr, existing + Number(item.amount));
      }
    });

    const sortedDividends = Array.from(timeMap.entries())
      .map(([date, amount]) => ({
        time: date,
        value: Number(amount.toFixed(4)),
        color: THEME.dividendBar,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (!sortedDividends.length) {
      container.innerHTML = `
        <div class="empty-chart">
          <i class="fas fa-hand-holding-usd"></i>
          <p>${window.I18n ? window.I18n.t('dividends.noHistory') : 'Nenhum histórico recente de dividendos'}</p>
        </div>`;
      return null;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 260;

    const chart = window.LightweightCharts.createChart(container, {
      width,
      height,
      layout: {
        background: { type: 'solid', color: THEME.bg },
        textColor: THEME.textSecondary,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: THEME.grid },
        horzLines: { color: THEME.grid },
      },
      rightPriceScale: {
        borderColor: '#30363d',
      },
      timeScale: {
        borderColor: '#30363d',
      },
    });

    const histogramSeries = typeof chart.addHistogramSeries === 'function'
      ? chart.addHistogramSeries({
          color: THEME.dividendBar,
          priceFormat: {
            type: 'price',
            precision: 3,
            minMove: 0.001,
          },
        })
      : chart.addSeries(window.LightweightCharts.HistogramSeries, {
          color: THEME.dividendBar,
          priceFormat: {
            type: 'price',
            precision: 3,
            minMove: 0.001,
          },
        });

    histogramSeries.setData(sortedDividends);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        chart.applyOptions({ width: newWidth, height: newHeight });
      }
    });
    resizeObserver.observe(container);
    activeObservers.set(container, resizeObserver);

    return {
      chart,
      histogramSeries,
      destroy: () => {
        resizeObserver.disconnect();
        chart.remove();
        activeObservers.delete(container);
      }
    };
  }

  /**
   * 4. Create Portfolio Allocation Pie / Donut Chart (Canvas 2D API)
   */
  function createPortfolioPieChart(canvasOrContainerId, holdings) {
    let container;
    let canvas;

    if (typeof canvasOrContainerId === 'string') {
      const el = document.getElementById(canvasOrContainerId);
      if (el && el.tagName === 'CANVAS') {
        canvas = el;
        container = el.parentElement;
      } else {
        container = el;
      }
    } else {
      container = canvasOrContainerId;
    }

    if (!container) return null;

    if (!canvas) {
      container.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.className = 'portfolio-pie-canvas';
      container.appendChild(canvas);
    }

    if (!Array.isArray(holdings) || holdings.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="empty-chart">
            <i class="fas fa-chart-pie"></i>
            <p>${window.I18n ? window.I18n.t('portfolio.empty') : 'Sem dados de alocação'}</p>
          </div>`;
      }
      return null;
    }

    // Compute total portfolio value
    let totalValue = 0;
    const slices = holdings.map((h, i) => {
      const val = (h.quantity || 0) * (h.currentPrice || h.buyPrice || 0);
      totalValue += val;
      return {
        ticker: h.ticker,
        name: h.name || h.ticker,
        value: val,
        color: THEME.pieColors[i % THEME.pieColors.length],
      };
    }).filter(s => s.value > 0);

    if (totalValue <= 0 || slices.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="empty-chart">
            <i class="fas fa-chart-pie"></i>
            <p>${window.I18n ? window.I18n.t('portfolio.empty') : 'Sem dados de alocação'}</p>
          </div>`;
      }
      return null;
    }

    // Sort slices by value descending
    slices.sort((a, b) => b.value - a.value);

    // Compute percentages and angles
    let currentAngle = -Math.PI / 2;
    slices.forEach(slice => {
      slice.percentage = (slice.value / totalValue) * 100;
      slice.angle = (slice.value / totalValue) * (Math.PI * 2);
      slice.startAngle = currentAngle;
      slice.endAngle = currentAngle + slice.angle;
      currentAngle = slice.endAngle;
    });

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || 360, 320);
    const height = Math.max(rect.height || 300, 260);

    const { ctx } = setupHiDPICanvas(canvas, width, height);

    // Determine layout: chart center + legend placement
    const isMobile = width < 500;
    const chartCenterX = isMobile ? width / 2 : width * 0.35;
    const chartCenterY = isMobile ? height * 0.42 : height / 2;
    const outerRadius = Math.min(chartCenterX, chartCenterY) * 0.78;
    const innerRadius = outerRadius * 0.6; // Donut hole

    ctx.clearRect(0, 0, width, height);

    // Draw donut slices
    slices.forEach(slice => {
      ctx.beginPath();
      ctx.arc(chartCenterX, chartCenterY, outerRadius, slice.startAngle, slice.endAngle);
      ctx.arc(chartCenterX, chartCenterY, innerRadius, slice.endAngle, slice.startAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#161b22';
      ctx.stroke();
    });

    // Draw center hole text (Total)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText('TOTAL', chartCenterX, chartCenterY - 10);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = '600 14px Inter, sans-serif';
    const formattedTotal = window.I18n
      ? window.I18n.formatCurrency(totalValue)
      : `$${totalValue.toFixed(2)}`;
    ctx.fillText(formattedTotal, chartCenterX, chartCenterY + 10);

    // Draw Legend
    const legendX = isMobile ? 20 : width * 0.68;
    let legendY = isMobile ? height * 0.78 : 30;
    const maxLegendItems = isMobile ? 4 : 8;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    slices.slice(0, maxLegendItems).forEach(slice => {
      // Color swatch
      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(legendX, legendY - 5, 10, 10, 2) : ctx.rect(legendX, legendY - 5, 10, 10);
      ctx.fill();

      // Ticker & Percentage
      ctx.fillStyle = THEME.textPrimary;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(slice.ticker, legendX + 16, legendY);

      ctx.fillStyle = THEME.textSecondary;
      ctx.font = '400 11px Inter, sans-serif';
      const pctStr = `${slice.percentage.toFixed(1)}%`;
      ctx.fillText(pctStr, legendX + 80, legendY);

      legendY += 22;
    });

    if (slices.length > maxLegendItems) {
      ctx.fillStyle = THEME.textSecondary;
      ctx.font = 'italic 11px Inter, sans-serif';
      ctx.fillText(`+ ${slices.length - maxLegendItems} outros...`, legendX, legendY);
    }

    return { canvas, slices, totalValue };
  }

  /**
   * 5. Create Analyst Recommendations Stacked Horizontal Bar Chart (Canvas 2D API)
   */
  function createRecommendationChart(containerId, trendData) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.className = 'recommendation-canvas';
    container.appendChild(canvas);

    // Normalize trend data
    let trends = [];
    if (Array.isArray(trendData) && trendData.length) {
      trends = trendData.slice(0, 4); // Show up to 4 historical periods
    } else if (trendData && typeof trendData === 'object') {
      trends = [trendData];
    } else {
      trends = [
        { period: '0m', strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }
      ];
    }

    const width = container.clientWidth || 550;
    const rowHeight = 36;
    const headerHeight = 35;
    const footerHeight = 40;
    const height = headerHeight + (trends.length * rowHeight) + footerHeight;

    const { ctx } = setupHiDPICanvas(canvas, width, height);

    ctx.clearRect(0, 0, width, height);

    // Draw Legend at top
    const legendItems = [
      { key: 'strongBuy', label: window.I18n ? window.I18n.t('targets.strongBuy') : 'Forte Compra', color: THEME.recColors.strongBuy },
      { key: 'buy', label: window.I18n ? window.I18n.t('targets.buy') : 'Compra', color: THEME.recColors.buy },
      { key: 'hold', label: window.I18n ? window.I18n.t('targets.hold') : 'Manter', color: THEME.recColors.hold },
      { key: 'sell', label: window.I18n ? window.I18n.t('targets.sell') : 'Venda', color: THEME.recColors.sell },
      { key: 'strongSell', label: window.I18n ? window.I18n.t('targets.strongSell') : 'Forte Venda', color: THEME.recColors.strongSell },
    ];

    let legX = 15;
    const legY = 16;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    legendItems.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(legX, legY - 5, 10, 10, 2) : ctx.rect(legX, legY - 5, 10, 10);
      ctx.fill();

      ctx.fillStyle = THEME.textSecondary;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(item.label, legX + 15, legY);

      legX += ctx.measureText(item.label).width + 28;
    });

    // Draw stacked bars for each period
    const labelWidth = 65;
    const barStartX = labelWidth + 10;
    const barMaxWidth = width - barStartX - 25;
    let currentY = headerHeight + 5;

    trends.forEach(row => {
      const sb = row.strongBuy || 0;
      const b = row.buy || 0;
      const h = row.hold || 0;
      const s = row.sell || 0;
      const ss = row.strongSell || 0;
      const total = sb + b + h + s + ss;

      // Period label (e.g. "Atual", "-1m", "-2m")
      let periodLabel = row.period || '';
      if (periodLabel === '0m') periodLabel = 'Atual';
      else if (!periodLabel) periodLabel = 'Mês';

      ctx.fillStyle = THEME.textPrimary;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(periodLabel, labelWidth, currentY + 12);

      // Draw horizontal background
      const barHeight = 22;
      ctx.fillStyle = '#21262d';
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(barStartX, currentY, barMaxWidth, barHeight, 4)
        : ctx.rect(barStartX, currentY, barMaxWidth, barHeight);
      ctx.fill();

      if (total > 0) {
        let segX = barStartX;
        const segments = [
          { count: sb, color: THEME.recColors.strongBuy },
          { count: b, color: THEME.recColors.buy },
          { count: h, color: THEME.recColors.hold },
          { count: s, color: THEME.recColors.sell },
          { count: ss, color: THEME.recColors.strongSell },
        ];

        segments.forEach((seg, idx) => {
          if (seg.count > 0) {
            const segWidth = (seg.count / total) * barMaxWidth;

            ctx.fillStyle = seg.color;
            ctx.beginPath();
            // Handle rounded corners on edges
            if (idx === 0 && segments.every((s, i) => i === 0 || s.count === 0)) {
              ctx.roundRect ? ctx.roundRect(segX, currentY, segWidth, barHeight, 4) : ctx.rect(segX, currentY, segWidth, barHeight);
            } else {
              ctx.rect(segX, currentY, segWidth, barHeight);
            }
            ctx.fill();

            // Label count inside segment if there is enough space
            if (segWidth >= 18) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px Inter, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`${seg.count}`, segX + segWidth / 2, currentY + barHeight / 2);
            }

            segX += segWidth;
          }
        });
      } else {
        ctx.fillStyle = THEME.textSecondary;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados', barStartX + barMaxWidth / 2, currentY + barHeight / 2);
      }

      currentY += rowHeight;
    });

    return { canvas };
  }

  return {
    createStockChart,
    updateChart,
    createDividendChart,
    createPortfolioPieChart,
    createRecommendationChart,
    THEME,
  };
})();
