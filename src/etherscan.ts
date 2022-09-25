import pMap from 'p-map';
import { id } from '@ethersproject/hash';
import { FormatTypes, FunctionFragment, Interface } from '@ethersproject/abi';
import { css } from '@emotion/css';

const clipboardBtnClass = css`
  display: flex;
  gap: 2px;
  align-content: center;
  color: #1d6fa5;
  background: transparent;
  margin: 0;
  padding: 0;
  border: none;
  box-shadow: none;
  outline: none;
  line-height: 1;

  &:focus {
    outline: none;
  }
`;

const containerClass = css`
  margin-right: auto;
  display: flex;
  gap: 8px;
  align-content: center;
`;

type Task = {
  paths: string[];
  caseSensitive?: boolean;
  method: () => Promise<void>;
};

const tasks: Task[] = [
  {
    paths: ['/readContract'],
    caseSensitive: false,
    method: () => addMethodHashes('read'),
  },
  {
    paths: ['/writecontract/index'],
    caseSensitive: false,
    method: () => addMethodHashes('write'),
  },
];

function getFirstMatch(value: string, expr: RegExp): string | null {
  const match = value.match(expr);
  if (!match || match.length !== 2) {
    return null;
  }

  return match[1];
}

const nameRegex = new RegExp('^([0-9]+). ([^ ]+)');

function getMethodNameIndex(value: string): [number, string | null] {
  const match = value.match(nameRegex);
  if (!match || match.length !== 3) {
    return [-1, null];
  }

  return [parseInt(match[1]) - 1, match[2]];
}

function addFontAwesome() {
  const solidFont = document.createElement('link') as HTMLLinkElement;
  solidFont.rel = 'stylesheet';
  solidFont.integrity =
    'sha512-uj2QCZdpo8PSbRGL/g5mXek6HM/APd7k/B5Hx/rkVFPNOxAQMXD+t+bG4Zv8OAdUpydZTU3UHmyjjiHv2Ww0PA==';
  solidFont.crossOrigin = 'anonymous';
  solidFont.referrerPolicy = 'no-referrer';
  solidFont.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/solid.min.css';

  const iconCss = document.createElement('link') as HTMLLinkElement;
  iconCss.rel = 'stylesheet';
  iconCss.integrity =
    'sha512-RvQxwf+3zJuNwl4e0sZjQeX7kUa3o82bDETpgVCH2RiwYSZVDdFJ7N/woNigN/ldyOOoKw8584jM4plQdt8bhA==';
  iconCss.crossOrigin = 'anonymous';
  iconCss.referrerPolicy = 'no-referrer';
  iconCss.href =
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/fontawesome.min.css';

  document.head.append(solidFont);
  document.head.append(iconCss);
}

function createCopyButton(
  text: string,
  icon: string,
  title: string,
  callback: () => string
): HTMLButtonElement {
  const textFragment = document.createTextNode(text);

  const i = document.createElement('i');
  i.className = `fa-solid ${icon}`;

  const btn = document.createElement('button') as HTMLButtonElement;
  btn.type = 'button';
  btn.title = title;
  btn.className = clipboardBtnClass;
  btn.onclick = async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(callback());
    } catch (e) {
      console.error(e);
    }
  };

  btn.append(i);
  btn.append(textFragment);

  return btn;
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
    console.warn('no inline script');
    return null;
  }

  const abiJson = getFirstMatch(inlineScript.innerHTML, abiRegex);
  if (!abiJson) {
    console.warn('no abi regex match');
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
  name: string,
  params: string[],
  index: number,
  mode: 'read' | 'write'
): FunctionFragment | null {
  // try by signature match (does not work for tuples)
  try {
    const exact = iface.getFunction(params.length ? `${name}(${params.join(',')})` : name);
    if (exact) {
      return exact;
    }
  } catch {}

  // try by index
  const functionFragments = getFunctions(iface, mode);
  if (index < functionFragments.length) {
    const possibleFragment = functionFragments[index];
    if (
      possibleFragment.name === name &&
      possibleFragment.inputs.length === params.length &&
      possibleFragment.inputs.map(input => input.type).join(',') === params.join(',')
    ) {
      return possibleFragment;
    } else {
      console.warn(possibleFragment);
      console.warn(possibleFragment.name, name);
      console.warn(possibleFragment.inputs.length, params.length);
      console.warn(possibleFragment.inputs.map(input => input.type).join(','), params.join(','));
    }
  } else {
    console.warn(functionFragments.length, index);
  }

  return null;
}

async function addMethodHashes(mode: 'read' | 'write') {
  addFontAwesome();

  const iface = getInterface(mode);
  if (!iface) {
    console.warn('no abi');
    return;
  }

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.card > .card-header > .btn-link')
  );
  await pMap(links, link => {
    if (!link.firstChild || !link.firstChild.textContent) {
      console.warn('no method name text node');
      return;
    }

    const [methodIndex, methodName] = getMethodNameIndex(link.firstChild.textContent);
    if (!methodName) {
      console.warn('method name not found in text node');
      return;
    }

    const card = link.closest<HTMLDivElement>('.card');
    if (!card) {
      console.warn('no card');
      return;
    }

    const inputs = card.querySelectorAll<HTMLInputElement>('form input[data-type]');
    const methodParams = Array.from(inputs).map(input => input.getAttribute('data-type') as string);
    const container = document.createElement('div');
    const methodSignature = `${methodName}(${methodParams.join(',')})`;
    const method = getFunction(iface, methodName, methodParams, methodIndex, mode);
    if (!method) {
      console.warn(`${methodIndex} ${methodSignature} not found in abi `);
      return;
    }

    const selector = id(method.format(FormatTypes.minimal)).substring(0, 10);

    container.className = containerClass;

    link.style.gap = '8px';
    link.classList.remove('justify-content-between');
    link.firstChild.textContent = `${link.firstChild.textContent.trimEnd()}(${methodParams.join(
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

async function runTasks() {
  const location = window.location;

  const promises = tasks
    .map(task => {
      const matches = task.paths.some(path => {
        let currentPath = location.pathname;

        if (!task.caseSensitive) {
          currentPath = currentPath.toLowerCase();
          path = path.toLowerCase();
        }

        return currentPath === path;
      });

      if (matches) {
        return task.method();
      }
    })
    .filter(promise => !!promise);

  await Promise.all(promises);
}

runTasks();
