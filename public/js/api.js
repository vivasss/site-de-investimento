/**
 * FinançasPro - API Client Module
 * Communicates with backend endpoints for search, quotes, history, dividends, and targets.
 */
window.API = (() => {
  const BASE_URL = '';
  let activeRequestsCount = 0;

  /**
   * Check if any API request is in progress
   */
  function isLoading() {
    return activeRequestsCount > 0;
  }

  /**
   * Internal fetch helper with loading counter and error handling
   */
  async function fetchJSON(endpoint, options = {}) {
    activeRequestsCount++;
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch (_) {
          // Response body was not JSON or empty
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error on [${endpoint}]:`, error);
      throw error;
    } finally {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
    }
  }

  /**
   * Search for equity stocks by keyword or ticker symbol
   * @param {string} query
   * @returns {Promise<Array<{ symbol: string, shortname: string, exchDisp: string, typeDisp: string }>>}
   */
  async function searchStocks(query) {
    if (!query || !query.trim()) {
      return [];
    }
    const cleanQuery = query.trim();
    return await fetchJSON(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
  }

  /**
   * Fetch detailed quote summary for a ticker
   * @param {string} ticker
   * @returns {Promise<Object>}
   */
  async function getQuote(ticker) {
    if (!ticker) throw new Error('Ticker symbol is required');
    const cleanTicker = ticker.trim().toUpperCase();
    return await fetchJSON(`/api/quote/${encodeURIComponent(cleanTicker)}`);
  }

  /**
   * Fetch price candle history for charting
   * @param {string} ticker
   * @param {string} period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
   * @returns {Promise<Array<{ time: number, open: number, high: number, low: number, close: number, volume: number }>>}
   */
  async function getHistory(ticker, period = '1y') {
    if (!ticker) throw new Error('Ticker symbol is required');
    const cleanTicker = ticker.trim().toUpperCase();
    return await fetchJSON(`/api/history/${encodeURIComponent(cleanTicker)}?period=${encodeURIComponent(period)}`);
  }

  /**
   * Fetch dividend details and 10-year payout history
   * @param {string} ticker
   * @returns {Promise<{ currentYield: number, lastDividend: number, exDividendDate: string, payoutRatio: number, history: Array<{ date: string, amount: number }> }>}
   */
  async function getDividends(ticker) {
    if (!ticker) throw new Error('Ticker symbol is required');
    const cleanTicker = ticker.trim().toUpperCase();
    return await fetchJSON(`/api/dividends/${encodeURIComponent(cleanTicker)}`);
  }

  /**
   * Fetch analyst price targets, consensus recommendation, and recommendation trends
   * @param {string} ticker
   * @returns {Promise<{ currentPrice: number, targetMean: number, targetHigh: number, targetLow: number, targetMedian: number, recommendation: string, recommendationMean: number, numberOfAnalysts: number, trend: Array<{ period: string, strongBuy: number, buy: number, hold: number, sell: number, strongSell: number }> }>}
   */
  async function getTargets(ticker) {
    if (!ticker) throw new Error('Ticker symbol is required');
    const cleanTicker = ticker.trim().toUpperCase();
    return await fetchJSON(`/api/targets/${encodeURIComponent(cleanTicker)}`);
  }

  /**
   * Fetch general market news
   * @param {string} query
   * @returns {Promise<Array<{ uuid: string, title: string, publisher: string, link: string, publishTime: string, thumbnail: string, relatedTickers: string[] }>>}
   */
  async function getMarketNews(query = '') {
    const qParam = query ? `?q=${encodeURIComponent(query)}` : '';
    return await fetchJSON(`/api/news${qParam}`);
  }

  /**
   * Fetch specific company news
   * @param {string} ticker
   * @param {string} companyName
   * @returns {Promise<Array<{ uuid: string, title: string, publisher: string, link: string, publishTime: string, thumbnail: string, relatedTickers: string[] }>>}
   */
  async function getCompanyNews(ticker, companyName = '') {
    if (!ticker) return [];
    const cleanTicker = ticker.trim().toUpperCase();
    const nameParam = companyName ? `?name=${encodeURIComponent(companyName)}` : '';
    return await fetchJSON(`/api/news/${encodeURIComponent(cleanTicker)}${nameParam}`);
  }

  return {
    isLoading,
    searchStocks,
    getQuote,
    getHistory,
    getDividends,
    getTargets,
    getMarketNews,
    getCompanyNews,
  };
})();
