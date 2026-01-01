const fetch = require('node-fetch');

// ============================================
// CONFIGURATION
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8433789138:AAEQCkVtGN48IV6kcCg_XthsB8JuaDIJfvo';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5953868240';
const ALERT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Alert thresholds
const MAX_AGE_NEW_HOURS = 24;   // Max age for "new" coins
const TOP_N = 5;                 // Number of coins per alert
const MIN_LIQUIDITY_ESTABLISHED = 50000;  // $50k min liquidity for coins >24hrs
const MIN_LIQUIDITY_NEW = 25000;          // $25k min liquidity for coins <24hrs
const MIN_MARKET_CAP = 300000;            // $300k min market cap for all coins
const MAX_MARKET_CAP_ESTABLISHED = 50000000; // $50M max market cap for coins >24hrs

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPercent(num) {
  if (num === null || num === undefined) return 'N/A';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function formatPrice(num) {
  if (num === null || num === undefined) return 'N/A';
  if (num < 0.00001) return `$${num.toExponential(2)}`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(2)}`;
}

function formatAge(createdAt) {
  if (!createdAt) return 'N/A';
  const now = Date.now();
  const ageMs = now - createdAt;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours < 1) return `${Math.floor(ageHours * 60)}m`;
  if (ageHours < 24) return `${Math.floor(ageHours)}h`;
  if (ageHours < 24 * 30) return `${Math.floor(ageHours / 24)}d`;
  if (ageHours < 24 * 365) return `${Math.floor(ageHours / (24 * 30))}mo`;
  return `${Math.floor(ageHours / (24 * 365))}y`;
}

function getAgeHours(createdAt) {
  if (!createdAt) return Infinity;
  return (Date.now() - createdAt) / (1000 * 60 * 60);
}

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ============================================
// DEXSCREENER API
// ============================================

async function fetchSolanaTokens() {
  try {
    // Fetch trending/top tokens from Solana
    const response = await fetch(
      'https://api.dexscreener.com/token-boosts/top/v1',
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    const boostedTokens = await response.json();
    
    // Filter for Solana tokens and get their addresses
    const solanaTokens = boostedTokens
      .filter(t => t.chainId === 'solana')
      .slice(0, 100); // Get top 100 boosted
    
    // Also fetch from search/trending
    const searchResponse = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=SOL',
      { headers: { 'Accept': 'application/json' } }
    );
    
    let searchPairs = [];
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      searchPairs = (searchData.pairs || []).filter(p => p.chainId === 'solana');
    }
    
    return { boostedTokens: solanaTokens, searchPairs };
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return { boostedTokens: [], searchPairs: [] };
  }
}

async function fetchTokenDetails(tokenAddresses) {
  try {
    // DexScreener allows up to 30 addresses per call
    const batches = [];
    for (let i = 0; i < tokenAddresses.length; i += 30) {
      batches.push(tokenAddresses.slice(i, i + 30));
    }
    
    const allPairs = [];
    
    for (const batch of batches) {
      const addresses = batch.join(',');
      const response = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${addresses}`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.ok) {
        const pairs = await response.json();
        if (Array.isArray(pairs)) {
          allPairs.push(...pairs);
        }
      }
      
      // Small delay between batches to respect rate limits
      await new Promise(r => setTimeout(r, 200));
    }
    
    return allPairs;
  } catch (error) {
    console.error('Error fetching token details:', error);
    return [];
  }
}

async function fetchTopGainersAndNewTokens() {
  try {
    // Strategy: Use multiple DexScreener endpoints to get comprehensive data
    
    // 1. Fetch pairs from Solana's main DEXes
    const endpoints = [
      'https://api.dexscreener.com/latest/dex/search?q=raydium%20solana',
      'https://api.dexscreener.com/latest/dex/search?q=jupiter%20solana',
      'https://api.dexscreener.com/latest/dex/search?q=orca%20solana'
    ];
    
    let allPairs = [];
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, { 
          headers: { 'Accept': 'application/json' } 
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.pairs) {
            const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
            allPairs.push(...solanaPairs);
          }
        }
      } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
      }
      
      await new Promise(r => setTimeout(r, 250));
    }
    
    // 2. Also try token boosts endpoint
    try {
      const boostResponse = await fetch(
        'https://api.dexscreener.com/token-boosts/top/v1',
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (boostResponse.ok) {
        const boostedTokens = await boostResponse.json();
        const solanaAddresses = boostedTokens
          .filter(t => t.chainId === 'solana')
          .map(t => t.tokenAddress)
          .slice(0, 60);
        
        if (solanaAddresses.length > 0) {
          const detailPairs = await fetchTokenDetails(solanaAddresses);
          allPairs.push(...detailPairs);
        }
      }
    } catch (e) {
      console.error('Error fetching boosted tokens:', e.message);
    }
    
    // 3. Deduplicate by pair address
    const uniquePairs = new Map();
    for (const pair of allPairs) {
      if (pair.pairAddress && !uniquePairs.has(pair.pairAddress)) {
        uniquePairs.set(pair.pairAddress, pair);
      }
    }
    
    const pairs = Array.from(uniquePairs.values());
    console.log(`Fetched ${pairs.length} unique Solana pairs`);
    
    return pairs;
  } catch (error) {
    console.error('Error in fetchTopGainersAndNewTokens:', error);
    return [];
  }
}

// ============================================
// ALERT BUILDERS
// ============================================

function buildTimeframeAlert(pairs, timeframe) {
  // timeframe: 'h1', 'h6', 'h24'
  const labels = {
    h1: { title: '1 HOUR', emoji: '⚡' },
    h6: { title: '6 HOUR', emoji: '📈' },
    h24: { title: '24 HOUR', emoji: '🔥' }
  };
  
  // Filter: >24hrs old, has price change data, min liquidity $50k, mcap $300k-$50M
  const eligiblePairs = pairs.filter(pair => {
    const ageHours = getAgeHours(pair.pairCreatedAt);
    const priceChange = pair.priceChange?.[timeframe];
    const liquidity = pair.liquidity?.usd || 0;
    const mcap = pair.marketCap || pair.fdv || 0;
    return ageHours > MAX_AGE_NEW_HOURS && 
           priceChange !== null && 
           priceChange !== undefined &&
           liquidity >= MIN_LIQUIDITY_ESTABLISHED &&
           mcap >= MIN_MARKET_CAP &&
           mcap <= MAX_MARKET_CAP_ESTABLISHED;
  });
  
  // Sort by this timeframe's gain descending
  eligiblePairs.sort((a, b) => (b.priceChange?.[timeframe] || 0) - (a.priceChange?.[timeframe] || 0));
  
  // Take top N
  const topGainers = eligiblePairs.slice(0, TOP_N);
  
  if (topGainers.length === 0) {
    return null;
  }
  
  const timestamp = new Date().toISOString().slice(11, 16) + ' UTC';
  const { title, emoji } = labels[timeframe];
  let message = `${emoji} *TOP ${topGainers.length} GAINERS \\- ${title}* \\- ${timestamp}\n\n`;
  
  topGainers.forEach((pair, index) => {
    const symbol = escapeMarkdown(pair.baseToken?.symbol || 'UNKNOWN');
    const price = formatPrice(parseFloat(pair.priceUsd) || 0);
    const change1h = formatPercent(pair.priceChange?.h1);
    const change6h = formatPercent(pair.priceChange?.h6);
    const change24h = formatPercent(pair.priceChange?.h24);
    const mcap = formatNumber(pair.marketCap || pair.fdv);
    const vol1h = formatNumber(pair.volume?.h1);
    const vol6h = formatNumber(pair.volume?.h6);
    const age = formatAge(pair.pairCreatedAt);
    const address = pair.baseToken?.address || '';
    
    const dexLink = `https://dexscreener.com/solana/${address}`;
    const axiomLink = `https://axiom.trade/t/${address}`;
    const twitterLink = `https://twitter.com/search?q=%24${pair.baseToken?.symbol || ''}`;
    
    message += `*${index + 1}\\. ${symbol}* \\| ${escapeMarkdown(price)}\n`;
    message += `📈 1h: ${escapeMarkdown(change1h)} \\| 6h: ${escapeMarkdown(change6h)} \\| 24h: ${escapeMarkdown(change24h)}\n`;
    message += `💰 MCap: ${escapeMarkdown(mcap)}\n`;
    message += `📊 Vol 1h: ${escapeMarkdown(vol1h)} \\| 6h: ${escapeMarkdown(vol6h)}\n`;
    message += `⏰ Age: ${escapeMarkdown(age)}\n`;
    message += `🔗 [DexScreener](${dexLink}) \\| [Axiom](${axiomLink}) \\| [Twitter](${twitterLink})\n\n\n`;
  });
  
  return message;
}

function buildNewLaunchesAlert(pairs) {
  // Filter: <24hrs old, min liquidity $25k, min mcap $300k
  const newPairs = pairs.filter(pair => {
    const ageHours = getAgeHours(pair.pairCreatedAt);
    const liquidity = pair.liquidity?.usd || 0;
    const mcap = pair.marketCap || pair.fdv || 0;
    return ageHours <= MAX_AGE_NEW_HOURS && 
           ageHours > 0 &&
           liquidity >= MIN_LIQUIDITY_NEW &&
           mcap >= MIN_MARKET_CAP;
  });
  
  // Sort by 6hr volume descending (most volume first)
  newPairs.sort((a, b) => (b.volume?.h6 || 0) - (a.volume?.h6 || 0));
  
  // Take top N
  const topNew = newPairs.slice(0, TOP_N);
  
  if (topNew.length === 0) {
    return null;
  }
  
  const timestamp = new Date().toISOString().slice(11, 16) + ' UTC';
  let message = `🆕 *TOP ${topNew.length} NEW LAUNCHES \\(<24hrs\\)* \\- ${timestamp}\n\n`;
  
  topNew.forEach((pair, index) => {
    const symbol = escapeMarkdown(pair.baseToken?.symbol || 'UNKNOWN');
    const price = formatPrice(parseFloat(pair.priceUsd) || 0);
    const change1h = formatPercent(pair.priceChange?.h1);
    const change6h = formatPercent(pair.priceChange?.h6);
    const change24h = formatPercent(pair.priceChange?.h24);
    const mcap = formatNumber(pair.marketCap || pair.fdv);
    const vol1h = formatNumber(pair.volume?.h1);
    const vol6h = formatNumber(pair.volume?.h6);
    const age = formatAge(pair.pairCreatedAt);
    const address = pair.baseToken?.address || '';
    
    const dexLink = `https://dexscreener.com/solana/${address}`;
    const axiomLink = `https://axiom.trade/t/${address}`;
    const twitterLink = `https://twitter.com/search?q=%24${pair.baseToken?.symbol || ''}`;
    
    message += `*${index + 1}\\. ${symbol}* \\| ${escapeMarkdown(price)}\n`;
    message += `📈 1h: ${escapeMarkdown(change1h)} \\| 6h: ${escapeMarkdown(change6h)} \\| 24h: ${escapeMarkdown(change24h)}\n`;
    message += `💰 MCap: ${escapeMarkdown(mcap)}\n`;
    message += `📊 Vol 1h: ${escapeMarkdown(vol1h)} \\| 6h: ${escapeMarkdown(vol6h)}\n`;
    message += `⏰ Age: ${escapeMarkdown(age)}\n`;
    message += `🔗 [DexScreener](${dexLink}) \\| [Axiom](${axiomLink}) \\| [Twitter](${twitterLink})\n\n\n`;
  });
  
  return message;
}

// ============================================
// TELEGRAM
// ============================================

async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return false;
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true
        })
      }
    );
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      
      // Try plain text if markdown fails
      const plainResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message.replace(/[\\*_\[\]()~`>#+\-=|{}.!]/g, ''),
            disable_web_page_preview: true
          })
        }
      );
      
      const plainResult = await plainResponse.json();
      return plainResult.ok;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

// ============================================
// MAIN LOOP
// ============================================

async function runAlertCycle() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Alert cycle started at ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  try {
    // Fetch all pairs
    const pairs = await fetchTopGainersAndNewTokens();
    
    if (pairs.length === 0) {
      console.log('No pairs fetched, skipping this cycle');
      return;
    }
    
    // Build and send 1hr gainers alert
    const alert1h = buildTimeframeAlert(pairs, 'h1');
    if (alert1h) {
      console.log('Sending 1hr gainers alert...');
      await sendTelegramMessage(alert1h);
      console.log('✅ 1hr gainers alert sent');
    } else {
      console.log('No coins for 1hr gainers');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Build and send 6hr gainers alert
    const alert6h = buildTimeframeAlert(pairs, 'h6');
    if (alert6h) {
      console.log('Sending 6hr gainers alert...');
      await sendTelegramMessage(alert6h);
      console.log('✅ 6hr gainers alert sent');
    } else {
      console.log('No coins for 6hr gainers');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Build and send 24hr gainers alert
    const alert24h = buildTimeframeAlert(pairs, 'h24');
    if (alert24h) {
      console.log('Sending 24hr gainers alert...');
      await sendTelegramMessage(alert24h);
      console.log('✅ 24hr gainers alert sent');
    } else {
      console.log('No coins for 24hr gainers');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Build and send new launches alert
    const newLaunchesAlert = buildNewLaunchesAlert(pairs);
    if (newLaunchesAlert) {
      console.log('Sending new launches alert...');
      await sendTelegramMessage(newLaunchesAlert);
      console.log('✅ New launches alert sent');
    } else {
      console.log('No coins matching new launches criteria');
    }
    
    console.log('Alert cycle completed');
  } catch (error) {
    console.error('Error in alert cycle:', error);
  }
}

// ============================================
// STARTUP
// ============================================

async function main() {
  console.log('🚀 Solana DEX Alerts Bot Starting...');
  console.log(`Alert interval: ${ALERT_INTERVAL_MS / 1000 / 60} minutes`);
  console.log(`Alerts: Top 5 by 1hr, 6hr, 24hr change + New launches`);
  console.log(`New coins: <${MAX_AGE_NEW_HOURS} hours old`);
  console.log(`Min liquidity: $${MIN_LIQUIDITY_ESTABLISHED/1000}k (established), $${MIN_LIQUIDITY_NEW/1000}k (new)`);
  console.log(`Market cap: $${MIN_MARKET_CAP/1000}k - $${MAX_MARKET_CAP_ESTABLISHED/1000000}M (established), $${MIN_MARKET_CAP/1000}k+ (new)`);
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    process.exit(1);
  }
  
  console.log('✅ Telegram configured');
  
  // Run immediately on start
  await runAlertCycle();
  
  // Then run every 10 minutes
  setInterval(runAlertCycle, ALERT_INTERVAL_MS);
  
  console.log('Bot running. Alerts every 10 minutes.');
}

main().catch(console.error);
