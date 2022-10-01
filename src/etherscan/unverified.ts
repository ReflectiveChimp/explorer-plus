import { createCopyButton } from './createCopyButton';

if (typeof window.exports === 'undefined') {
  window.exports = {};
}

import pMap from 'p-map';
import { selectorsFromBytecode } from '@shazow/whatsabi';
import { css } from '@emotion/css';

const containerClass = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;
`;

const methodClass = css`
  display: flex;
  gap: 4px;
  align-items: center;
  background: #f8f9fa;
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  color: #343a40;
`;

const titleClass = css`
  font-weight: bold;
  margin-bottom: 0;
`;
const countClass = css``;
const nameClass = css``;

export async function checkForUnverified() {
  const bytecodePre = document.querySelector<HTMLPreElement>('#dividcode > pre:first-child');
  if (bytecodePre) {
    await attemptGuessMethods(bytecodePre);
  }
}

async function attemptGuessMethods(bytecodePre: HTMLPreElement) {
  const code = bytecodePre.textContent;
  if (!code) {
    return;
  }

  if (!bytecodePre.parentElement || !bytecodePre.parentElement.parentElement) {
    return;
  }
  const parent = bytecodePre.parentElement.parentElement;

  const selectors = selectorsFromBytecode(code);
  if (!selectors.length) {
    return;
  }

  const names = await lookupSelectors(selectors);
  const methods = await pMap(selectors, (selector, i) =>
    createMethodElement(selector, names[selector] || 'unknown', i + 1)
  );

  const container = document.createElement('div') as HTMLDivElement;
  const title = createDivWithText('Possible Methods', titleClass);
  container.className = containerClass;
  container.append(title);
  container.append(...methods);
  parent.prepend(container);
}

async function createMethodElement(
  selector: string,
  name: string,
  count: number
): Promise<HTMLDivElement> {
  const method = document.createElement('div') as HTMLDivElement;

  const countDiv = createDivWithText(`${count}.`, countClass);
  const nameDiv = createDivWithText(name, nameClass);
  const selectorBtn = createCopyButton(
    selector,
    'fa-hashtag',
    'Copy selector to clipboard',
    () => selector
  );

  method.className = methodClass;
  method.append(countDiv, nameDiv, selectorBtn);

  return method;
}

function createDivWithText(text: string, className: string): HTMLDivElement {
  const div = document.createElement('div') as HTMLDivElement;
  div.className = className;
  div.append(document.createTextNode(text));
  return div;
}

async function lookupSelectors(selectors: string[]): Promise<Record<string, string>> {
  const params = new URLSearchParams(selectors.map(selector => ['function', selector]));
  const response = await fetch(
    `https://sig.eth.samczsun.com/api/v1/signatures?${params.toString()}`
  );
  const data = await response.json();

  if (!data || (data.ok !== true && !data.result && !data.result.function)) {
    return {};
  }

  const functions = data.result.function as Record<string, { name: string }[]>;
  return selectors.reduce((names, selector) => {
    if (functions[selector] && functions[selector].length) {
      names[selector] = functions[selector][0].name;
    }
    return names;
  }, {} as Record<string, string>);
}
