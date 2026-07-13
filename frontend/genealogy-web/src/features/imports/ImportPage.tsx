import { PersonImportWorkspace } from './PersonImportWorkspace';

type Props = { notify: (data: unknown, error?: boolean) => void };

export function ImportPage({ notify }: Props) {
  return <PersonImportWorkspace notify={notify} />;
}
