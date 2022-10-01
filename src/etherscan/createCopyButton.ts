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

export function createCopyButton(
  text: string,
  icon: string,
  title: string,
  callback: () => string
): HTMLButtonElement {
  const textFragment = document.createTextNode(text);

  const i = document.createElement('i');
  i.className = `fas ${icon}`;

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
