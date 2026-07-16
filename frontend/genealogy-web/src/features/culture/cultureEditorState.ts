export type CultureEditorTarget = 'item' | 'migration' | 'site';
export type CultureEditorMode = 'create' | 'edit';

export type CultureEditorState = {
  target: CultureEditorTarget;
  mode: CultureEditorMode;
  id?: number;
};

const editorKeys = ['cultureEditor', 'cultureEditorMode', 'cultureEditorId'];
const editorTargets: CultureEditorTarget[] = ['item', 'migration', 'site'];
const editorModes: CultureEditorMode[] = ['create', 'edit'];

function valid<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return values.includes(value as T) ? value as T : undefined;
}

function positive(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
}

export function readCultureEditorLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const target = valid(editorTargets, url.searchParams.get('cultureEditor'));
  const mode = valid(editorModes, url.searchParams.get('cultureEditorMode'));
  const id = positive(url.searchParams.get('cultureEditorId'));

  if (!target || !mode || (mode === 'edit' && !id)) {
    return { editor: null as CultureEditorState | null };
  }

  return {
    editor: {
      target,
      mode,
      ...(mode === 'edit' ? { id } : {})
    } satisfies CultureEditorState
  };
}

export function buildCultureEditorLocation(href: string, editor: CultureEditorState | null) {
  const url = new URL(href, 'https://genealogy.local');
  editorKeys.forEach(key => url.searchParams.delete(key));

  if (editor) {
    url.searchParams.set('cultureEditor', editor.target);
    url.searchParams.set('cultureEditorMode', editor.mode);
    if (editor.mode === 'edit' && editor.id) {
      url.searchParams.set('cultureEditorId', String(editor.id));
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function isSameCultureEditor(left: CultureEditorState | null, right: CultureEditorState | null) {
  return left?.target === right?.target
    && left?.mode === right?.mode
    && left?.id === right?.id;
}

export function confirmCultureEditorLeave(dirty: boolean) {
  return !dirty || window.confirm('当前修改尚未保存，确认离开编辑页面？');
}
