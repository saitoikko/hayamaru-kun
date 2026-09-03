/* Service Worker。役割はアイコンのバッジ表示だけ。
 * content.js から現在の倍率を受け取り、そのタブのバッジに出す。
 * タブのURLは読まないので tabs 権限は不要。 */
'use strict';

function badgeText(rate) {
  if (!rate || Math.abs(rate - 1) < 0.005) return '';   // 等倍のときは何も出さない
  return rate >= 10 ? String(Math.round(rate)) : rate.toFixed(2);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'rate' || !sender.tab) return;
  const tabId = sender.tab.id;
  const text = msg.enabled === false ? 'off' : badgeText(msg.rate);
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: text === 'off' ? '#9aa0a6' : '#1a73e8' });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
  }
});
