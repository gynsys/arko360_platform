import React from 'react';

/**
 * Renders a title string by splitting it into normal text and a highlighted accent span.
 * If the title contains a '|' character, it splits by '|'.
 * Otherwise, it highlights the last word.
 * 
 * @param {string} fullTitle - The raw title string
 * @returns {React.ReactNode}
 */
export function renderTitle(fullTitle) {
  if (!fullTitle) return null;
  
  if (fullTitle.includes('|')) {
    const parts = fullTitle.split('|');
    const line1 = parts[0].trim();
    const accent = parts.slice(1).join('|').trim();
    return (
      <>
        {line1} <br />
        <span>{accent}</span>
      </>
    );
  }
  
  const words = fullTitle.trim().split(/\s+/);
  if (words.length <= 1) {
    return <span>{fullTitle}</span>;
  }
  
  const accent = words.pop();
  const line1 = words.join(' ');
  return (
    <>
      {line1} <br />
      <span>{accent}</span>
    </>
  );
}
