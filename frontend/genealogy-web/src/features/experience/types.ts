export type CreateMode = 'person' | 'father' | 'mother' | 'spouse' | 'child' | null;
export type TreeViewMode = 'family' | 'branch' | 'compact';

export type PersonView = {
  id: string;
  name: string;
  generation: string;
  word: string;
  years: string;
  branch: string;
  status: string;
  avatar: string;
  relation: string;
  x: number;
  y: number;
  raw?: any;
};

export type SourceView = {
  id?: string;
  title: string;
  category: string;
  owner: string;
  confidence: string;
  status: string;
  bind: string;
  raw?: any;
};

export type TaskView = {
  id?: string;
  title: string;
  type: string;
  user: string;
  time: string;
  status: string;
  raw?: any;
};

export type PersonForm = {
  name: string;
  gender: string;
  generationNo: string;
  generationWord: string;
  branchId: string;
  isLiving: boolean;
};

export type ExperienceData = {
  workspace: any;
  clans: any[];
  branches: any[];
  people: PersonView[];
  relationships: any[];
  sources: SourceView[];
  tasks: TaskView[];
  logTotal: number | string;
  selectedPerson?: PersonView;
  activeClan?: any;
  loading: boolean;
  message: string;
  setMessage: (message: string) => void;
  refreshAll: () => Promise<void>;
  createPersonRecord: (form: PersonForm, selectCreated?: boolean) => Promise<any>;
  createRelative: (mode: Exclude<CreateMode, null | 'person'>, form: PersonForm) => Promise<void>;
  createSource: (sourceName: string, sourceType: string) => Promise<any>;
  submitPersonReview: (personId: string) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  rejectTask: (taskId: string) => Promise<void>;
  checkRelationshipConflict: (fromPersonId: string, toPersonId: string) => Promise<void>;
};
