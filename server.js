// ============================================================
// Finanças Pro - Backend Server
// Portal de Finanças e Carteira de Investimentos
// ============================================================

const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const path = require('path');

const app = express();
const PORT = 3000;

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Serve static files from the public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware - logs every request with timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// Helper: Convert period string to { period1, period2 } dates
// Converts shorthand like "1d", "5d", "1mo", "1y" into
// actual Date objects for the yahoo-finance2 chart API.
// ============================================================
function periodToDates(period) {
  const now = new Date();
  const period2 = now;
  let period1 = new Date();

  switch (period) {
    case '1d':
      period1.setDate(now.getDate() - 3);
      break;
    case '5d':
      period1.setDate(now.getDate() - 7);
      break;
    case '1mo':
      period1.setMonth(now.getMonth() - 1);
      break;
    case '3mo':
      period1.setMonth(now.getMonth() - 3);
      break;
    case '6mo':
      period1.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      period1.setFullYear(now.getFullYear() - 1);
      break;
    case '2y':
      period1.setFullYear(now.getFullYear() - 2);
      break;
    case '5y':
      period1.setFullYear(now.getFullYear() - 5);
      break;
    case 'max':
      period1 = new Date('1970-01-01');
      break;
    default:
      period1.setFullYear(now.getFullYear() - 1); // Default: 1 year
  }

  return { period1, period2 };
}

// ============================================================
// Helper: Determine the best interval for a given period
// Shorter periods use finer granularity; longer periods use
// coarser intervals to keep the data volume manageable.
// ============================================================
function getDefaultInterval(period) {
  const intervalMap = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    '1y': '1d',
    '2y': '1wk',
    '5y': '1wk',
    'max': '1mo',
  };
  return intervalMap[period] || '1d';
}

// ============================================================
// Helper: Safely extract a numeric value
// Many yahoo-finance2 fields can be undefined or wrapped
// in objects; this normalises them to a plain number or null.
// ============================================================
function safeNum(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val.raw !== undefined) return val.raw;
  return null;
}

// ============================================================
// API ROUTES
// ============================================================

// ------------------------------------------------------------
// GET /api/search?q=:query
// Pesquisa de ativos (stock search)
// Returns up to 10 equity results matching the query string.
// ------------------------------------------------------------
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await yahooFinance.search(query);

    // Filter to equity-type results and limit to 10
    const filtered = (results.quotes || [])
      .filter((item) => item.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((item) => ({
        symbol: item.symbol,
        shortname: item.shortname || item.longname || item.symbol,
        exchDisp: item.exchDisp || item.exchange || '',
        typeDisp: item.typeDisp || item.quoteType || '',
      }));

    return res.json(filtered);
  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({ error: 'Failed to search for symbols' });
  }
});

// ------------------------------------------------------------
// GET /api/quote/:ticker
// Cotação detalhada (detailed quote)
// Returns a comprehensive snapshot of the ticker including
// price, fundamentals, analyst targets, and dividend info.
// ------------------------------------------------------------
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    const result = await yahooFinance.quoteSummary(ticker, {
      modules: [
        'price',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'calendarEvents',
      ],
    });

    const price = result.price || {};
    const summary = result.summaryDetail || {};
    const financial = result.financialData || {};
    const keyStats = result.defaultKeyStatistics || {};
    const calendar = result.calendarEvents || {};

    // Extract earnings date (can be an array of dates)
    let earningsDate = null;
    if (calendar.earnings && calendar.earnings.earningsDate) {
      const dates = calendar.earnings.earningsDate;
      earningsDate = Array.isArray(dates)
        ? dates.map((d) => (d instanceof Date ? d.toISOString() : d))
        : dates;
    }

    const data = {
      // Identificação do ativo (asset identification)
      symbol: price.symbol || ticker,
      shortName: price.shortName || '',
      longName: price.longName || '',
      currency: price.currency || '',
      exchange: price.exchangeName || price.exchange || '',
      marketState: price.marketState || '',

      // Preços de mercado (market prices)
      regularMarketPrice: safeNum(price.regularMarketPrice),
      regularMarketChange: safeNum(price.regularMarketChange),
      regularMarketChangePercent: safeNum(price.regularMarketChangePercent),
      regularMarketOpen: safeNum(price.regularMarketOpen),
      regularMarketDayHigh: safeNum(price.regularMarketDayHigh),
      regularMarketDayLow: safeNum(price.regularMarketDayLow),

      // Volume
      regularMarketVolume: safeNum(price.regularMarketVolume),
      averageVolume: safeNum(summary.averageVolume),

      // Métricas de mercado (market metrics)
      marketCap: safeNum(price.marketCap),
      fiftyTwoWeekHigh: safeNum(summary.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: safeNum(summary.fiftyTwoWeekLow),

      // Indicadores fundamentalistas (fundamental indicators)
      trailingPE: safeNum(summary.trailingPE),
      forwardPE: safeNum(summary.forwardPE),
      priceToBook: safeNum(keyStats.priceToBook),
      beta: safeNum(summary.beta),

      // Dividendos (dividends)
      dividendRate: safeNum(summary.dividendRate),
      dividendYield: safeNum(summary.dividendYield),
      exDividendDate: summary.exDividendDate
        ? (summary.exDividendDate instanceof Date
            ? summary.exDividendDate.toISOString()
            : summary.exDividendDate)
        : null,
      payoutRatio: safeNum(summary.payoutRatio),

      // Alvos dos analistas (analyst targets)
      targetMeanPrice: safeNum(financial.targetMeanPrice),
      targetHighPrice: safeNum(financial.targetHighPrice),
      targetLowPrice: safeNum(financial.targetLowPrice),
      targetMedianPrice: safeNum(financial.targetMedianPrice),
      recommendationKey: financial.recommendationKey || null,
      recommendationMean: safeNum(financial.recommendationMean),
      numberOfAnalystOpinions: safeNum(financial.numberOfAnalystOpinions),

      // Data de resultados (earnings date)
      earningsDate,
    };

    return res.json(data);
  } catch (error) {
    console.error(`Quote error for ${req.params.ticker}:`, error.message);

    if (error.message && error.message.includes('Not Found')) {
      return res.status(404).json({ error: `Symbol "${req.params.ticker}" not found` });
    }
    return res.status(500).json({ error: 'Failed to fetch quote data' });
  }
});

// ------------------------------------------------------------
// GET /api/history/:ticker?period=1y&interval=1d
// Histórico de preços (price history)
// Returns OHLCV candle data for charting.
// The period param controls how far back to look;
// the interval param controls the candle width.
// ------------------------------------------------------------
app.get('/api/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period || '1y';
    const interval = req.query.interval || getDefaultInterval(period);
    const { period1, period2 } = periodToDates(period);

    const result = await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval,
    });

    // yahoo-finance2 chart() returns { quotes: [...] }
    const quotes = result.quotes || [];

    const history = quotes
      .filter((q) => q.close !== null && q.close !== undefined && q.open !== null && q.high !== null && q.low !== null)
      .map((q) => {
        const d = new Date(q.date);
        const isDailyOrMore = interval === '1d' || interval === '1wk' || interval === '1mo';
        return {
          time: isDailyOrMore ? d.toISOString().split('T')[0] : Math.floor(d.getTime() / 1000),
          open: safeNum(q.open),
          high: safeNum(q.high),
          low: safeNum(q.low),
          close: safeNum(q.close),
          volume: safeNum(q.volume) || 0,
        };
      });

    return res.json(history);
  } catch (error) {
    console.error(`History error for ${req.params.ticker}:`, error.message);

    if (error.message && error.message.includes('Not Found')) {
      return res.status(404).json({ error: `Symbol "${req.params.ticker}" not found` });
    }
    return res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// ------------------------------------------------------------
// GET /api/dividends/:ticker
// Histórico de dividendos (dividend history)
// Returns current dividend info plus up to 10 years of
// historical dividend payments.
// ------------------------------------------------------------
app.get('/api/dividends/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    // Fetch current dividend info from quoteSummary
    const summaryResult = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryDetail', 'calendarEvents'],
    });

    const summary = summaryResult.summaryDetail || {};
    const calendar = summaryResult.calendarEvents || {};

    // Fetch historical dividends (últimos 10 anos)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    let dividendHistory = [];
    try {
      const chartResult = await yahooFinance.chart(ticker, {
        period1: tenYearsAgo,
        period2: new Date(),
        events: 'div',
      });

      if (chartResult && chartResult.events && Array.isArray(chartResult.events.dividends)) {
        dividendHistory = chartResult.events.dividends.map((d) => ({
          date: d.date instanceof Date
            ? d.date.toISOString().split('T')[0]
            : (typeof d.date === 'string' ? d.date.split('T')[0] : new Date(d.date * 1000).toISOString().split('T')[0]),
          amount: safeNum(d.amount) || 0,
        }));
      }
    } catch (histError) {
      // Some stocks have no dividend history; that's fine
      console.warn(`No dividend history for ${ticker}:`, histError.message);
    }

    // Build ex-dividend date string
    let exDividendDate = null;
    if (summary.exDividendDate) {
      exDividendDate =
        summary.exDividendDate instanceof Date
          ? summary.exDividendDate.toISOString().split('T')[0]
          : summary.exDividendDate;
    } else if (calendar.exDividendDate) {
      exDividendDate =
        calendar.exDividendDate instanceof Date
          ? calendar.exDividendDate.toISOString().split('T')[0]
          : calendar.exDividendDate;
    }

    const data = {
      currentYield: safeNum(summary.dividendYield),
      lastDividend: safeNum(summary.dividendRate),
      exDividendDate,
      payoutRatio: safeNum(summary.payoutRatio),
      history: dividendHistory,
    };

    return res.json(data);
  } catch (error) {
    console.error(`Dividends error for ${req.params.ticker}:`, error.message);

    if (error.message && error.message.includes('Not Found')) {
      return res.status(404).json({ error: `Symbol "${req.params.ticker}" not found` });
    }
    return res.status(500).json({ error: 'Failed to fetch dividend data' });
  }
});

// ------------------------------------------------------------
// GET /api/targets/:ticker
// Alvos e recomendações dos analistas (analyst targets & recs)
// Returns analyst price targets, recommendation consensus,
// and the trend breakdown by period.
// ------------------------------------------------------------
app.get('/api/targets/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ['financialData', 'recommendationTrend'],
    });

    const financial = result.financialData || {};
    const recTrend = result.recommendationTrend || {};

    // Recommendation trend breakdown by period (e.g. "0m", "-1m", "-2m", "-3m")
    const trend = (recTrend.trend || []).map((t) => ({
      period: t.period || '',
      strongBuy: t.strongBuy || 0,
      buy: t.buy || 0,
      hold: t.hold || 0,
      sell: t.sell || 0,
      strongSell: t.strongSell || 0,
    }));

    const data = {
      currentPrice: safeNum(financial.currentPrice),
      targetMean: safeNum(financial.targetMeanPrice),
      targetHigh: safeNum(financial.targetHighPrice),
      targetLow: safeNum(financial.targetLowPrice),
      targetMedian: safeNum(financial.targetMedianPrice),
      recommendation: financial.recommendationKey || null,
      recommendationMean: safeNum(financial.recommendationMean),
      numberOfAnalysts: safeNum(financial.numberOfAnalystOpinions),
      trend,
    };

    return res.json(data);
  } catch (error) {
    console.error(`Targets error for ${req.params.ticker}:`, error.message);

    if (error.message && error.message.includes('Not Found')) {
      return res.status(404).json({ error: `Symbol "${req.params.ticker}" not found` });
    }
    return res.status(500).json({ error: 'Failed to fetch analyst targets' });
  }
});

// ============================================================
// Helper: format news items
// ============================================================
function formatNewsList(rawNews = []) {
  const seen = new Set();
  const list = [];

  for (const item of rawNews) {
    if (!item || !item.title) continue;
    if (seen.has(item.title.trim())) continue;
    seen.add(item.title.trim());

    let thumbnailUrl = null;
    if (item.thumbnail && Array.isArray(item.thumbnail.resolutions) && item.thumbnail.resolutions.length > 0) {
      thumbnailUrl = item.thumbnail.resolutions[0].url;
    }

    list.push({
      uuid: item.uuid || Math.random().toString(36).substring(2),
      title: item.title,
      publisher: item.publisher || 'Mercado Financeiro',
      link: item.link || '#',
      publishTime: item.providerPublishTime
        ? (item.providerPublishTime instanceof Date
            ? item.providerPublishTime.toISOString()
            : item.providerPublishTime)
        : new Date().toISOString(),
      thumbnail: thumbnailUrl,
      relatedTickers: item.relatedTickers || [],
    });
  }

  return list;
}

// ------------------------------------------------------------
// GET /api/news
// Notícias gerais de mercado
// ------------------------------------------------------------
app.get('/api/news', async (req, res) => {
  try {
    const query = req.query.q || 'market';
    let result = await yahooFinance.search(query, { newsCount: 15 });
    let news = result.news || [];
    if (news.length === 0) {
      result = await yahooFinance.search('economy', { newsCount: 15 });
      news = result.news || [];
    }
    const formatted = formatNewsList(news);
    return res.json(formatted);
  } catch (error) {
    console.error('Market news error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

// ------------------------------------------------------------
// GET /api/news/:ticker
// Notícias específicas de uma empresa
// ------------------------------------------------------------
app.get('/api/news/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const companyName = req.query.name || '';

    // Search by ticker first
    let result = await yahooFinance.search(ticker, { newsCount: 10 });
    let news = result.news || [];

    // If ticker search yielded few results and company name exists, search by name
    if (news.length < 3 && companyName) {
      const cleanName = companyName
        .replace(/S\.A\.|SA|LTD|CORP|INC|HOLDINGS|DO BRASIL/gi, '')
        .trim();
      if (cleanName.length > 2) {
        const nameResult = await yahooFinance.search(cleanName, { newsCount: 10 });
        const additionalNews = nameResult.news || [];
        news = [...news, ...additionalNews];
      }
    }

    const formatted = formatNewsList(news);
    return res.json(formatted);
  } catch (error) {
    console.error(`Company news error for ${req.params.ticker}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch company news' });
  }
});

// ============================================================
// Fallback: serve index.html for SPA-style routing
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// Start the server
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 Finanças Pro server running at http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`📁 Serving static files from ./public/\n`);
});
