import pMap from 'p-map';
import { FormatTypes, FunctionFragment, Interface } from '@ethersproject/abi';
import { css } from '@emotion/css';
import { createCopyButton } from './createCopyButton';

const containerClass = css`
  margin-right: auto;
  display: flex;
  gap: 8px;
  align-content: center;
`;

function getFirstMatch(value: string, expr: RegExp): string | null {
  const match = value.match(expr);
  if (!match || match.length !== 2) {
    return null;
  }

  return match[1];
}

const methodLabelRegex = new RegExp('^([0-9]+)\\. ([^ ]+) ?(\\(([^)]+)\\))?$');

type MethodLabel = {
  index: number;
  name: string;
  selector?: string;
};

function parseMethodLabel(value: string): MethodLabel | null {
  const match = value.match(methodLabelRegex);

  if (!match || match.length !== 5) {
    return null;
  }

  if (match[4] !== undefined) {
    return {
      index: parseInt(match[1]),
      name: match[2],
      selector: match[4],
    };
  }

  return {
    index: parseInt(match[1]),
    name: match[2],
  };
}

function getInterface(mode: 'read' | 'write'): Interface | null {
  if (!['read', 'write'].includes(mode)) {
    return null;
  }

  const abiJson = mode === 'read' ? getReadAbi() : getWriteAbi();
  if (!abiJson) {
    return null;
  }

  return new Interface(abiJson);
}

function getWriteAbi(): string | null {
  const abiRegex = new RegExp('var result = (.*);$', 'm');

  const inlineScript = document.body.querySelector(
    'body > script:last-child'
  ) as HTMLScriptElement | null;
  if (!inlineScript || inlineScript.tagName.toLowerCase() !== 'script') {
    console.debug('no inline script');
    return null;
  }

  const abiJson = getFirstMatch(inlineScript.innerHTML, abiRegex);
  if (!abiJson) {
    console.debug('no abi regex match');
    return null;
  }

  return abiJson;
}

function getReadAbi(): string | null {
  const abiRegex = new RegExp('var abi = (.*);$', 'm');

  const bootstrapScript = document.querySelector<HTMLScriptElement>('script[src*="/bootstrap/"]');
  if (!bootstrapScript) {
    return null;
  }
  const inlineScript = bootstrapScript.nextElementSibling as HTMLScriptElement | null;
  if (!inlineScript) {
    return null;
  }

  const abiJson = getFirstMatch(inlineScript.innerHTML, abiRegex);
  if (!abiJson) {
    return null;
  }

  return abiJson;
}

function getFunctions(iface: Interface, mode: 'read' | 'write'): FunctionFragment[] {
  const matcher: (func: FunctionFragment) => boolean =
    mode === 'read'
      ? func => func.stateMutability === 'view' || func.stateMutability === 'pure' || func.constant
      : func =>
          !(func.stateMutability === 'view' || func.stateMutability === 'pure' || func.constant);
  return (
    iface.fragments.filter(fragment => fragment.type === 'function') as FunctionFragment[]
  ).filter(matcher);
}

function getFunction(
  iface: Interface,
  label: MethodLabel,
  params: string[],
  mode: 'read' | 'write'
): FunctionFragment | null {
  // try from selector
  if (label.selector) {
    try {
      const selectorFunc = iface.getFunction(label.selector);
      if (selectorFunc) {
        return selectorFunc;
      }
    } catch {}
  }

  // try by signature match (does not work for tuples)
  try {
    const signatureFunc = iface.getFunction(
      params.length ? `${label.name}(${params.join(',')})` : label.name
    );
    if (signatureFunc) {
      return signatureFunc;
    }
  } catch {}

  // try by index
  const functionFragments = getFunctions(iface, mode);
  if (label.index < functionFragments.length) {
    const possibleFragment = functionFragments[label.index];
    if (
      possibleFragment.name === label.name &&
      possibleFragment.inputs.length === params.length &&
      possibleFragment.inputs.map(input => input.type).join(',') === params.join(',')
    ) {
      return possibleFragment;
    } else {
      console.debug(possibleFragment);
      console.debug(possibleFragment.name, label.name);
      console.debug(possibleFragment.inputs.length, params.length);
      console.debug(possibleFragment.inputs.map(input => input.type).join(','), params.join(','));
    }
  } else {
    console.debug(functionFragments.length, label);
  }

  return null;
}

export async function addMethodSelectors(mode: 'read' | 'write') {
  const iface = getInterface(mode);
  if (!iface) {
    console.debug('no abi');
    return;
  }

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.card > .card-header > .btn-link')
  );
  await pMap(links, link => {
    if (!link.firstChild || !link.firstChild.textContent) {
      console.debug('no method name text node');
      return;
    }

    const methodLabel = parseMethodLabel(link.firstChild.textContent);
    if (!methodLabel) {
      console.debug('method name not found in text node');
      return;
    }

    const card = link.closest<HTMLDivElement>('.card');
    if (!card) {
      console.debug('no card');
      return;
    }

    const inputs = card.querySelectorAll<HTMLInputElement>('form input[data-type]');
    const methodParams = Array.from(inputs).map(input => input.getAttribute('data-type') as string);
    const container = document.createElement('div');
    const methodSignature = `${methodLabel.name}(${methodParams.join(',')})`;
    const method = getFunction(iface, methodLabel, methodParams, mode);
    if (!method) {
      console.debug(`${methodLabel.name} ${methodSignature} not found in abi `);
      return;
    }

    const selector = iface.getSighash(method);

    container.className = containerClass;

    link.style.gap = '8px';
    link.classList.remove('justify-content-between');
    link.firstChild.textContent = `${methodLabel.index}. ${methodLabel.name}(${methodParams.join(
      ','
    )})`;
    link.insertBefore(container, link.lastChild);

    const selectorButton = createCopyButton(
      selector,
      'fa-hashtag',
      'Copy selector to clipboard',
      () => selector
    );
    const signatureButton = createCopyButton(
      'Signature',
      'fa-code',
      'Copy method signature to clipboard',
      () => method.format(FormatTypes.full)
    );
    const abiButton = createCopyButton('ABI', 'fa-layer-group', 'Copy ABI to clipboard', () =>
      method.format(FormatTypes.json)
    );
    container.append(selectorButton);
    container.append(signatureButton);
    container.append(abiButton);
  });
}
