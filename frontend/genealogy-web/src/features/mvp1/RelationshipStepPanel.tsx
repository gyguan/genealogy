import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Select, Space, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type RelationshipMode = 'father' | 'mother' | 'spouse' | 'child';

type PersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  branchId?: number | string;
};

const RELATIONSHIP_HOST_CLASS = 'relationship-step-host';

const MODE_LABEL: Record<RelationshipMode, string> = {
  father: '父亲',
  mother: '母亲',
  spouse: '配偶',
  child: '子女'
};

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function patchWorkspace(values: Record<string, string>) {
  const workspace = (window as any).__genealogyWorkspace;
  if (workspace?.patch) workspace.patch(values);
  Object.entries(values).forEach(([key, value]) => localStorage.setItem(`genealogy.workspace.${key}`, value || ''));
}

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function relationshipPanelBody() {
  if (activeStepIndex() !== 5) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function statusOf(row: PersonLike) {
  return String(row?.dataStatus || row?.status || '').trim().toLowerCase();
}

function isOfficial(row: PersonLike) {
  const status = statusOf(row);
  return !status || ['official', 'active', 'approved'].includes(status);
}

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
}

function personLabel(person: PersonLike) {
  const generation = person.generationNo ? `第${person.generationNo}世` : '未维护代次';
  const word = person.generationWord ? `${person.generationWord}字辈` : '无字辈';
  return `${person.name || `人物#${person.id}`}（${generation} · ${word} · ${genderText(person.gender)}）`;
}

function expectedGenerationNo(center: PersonLike | undefined, mode: RelationshipMode) {
  const centerNo = Number(center?.generationNo);
  if (!Number.isFinite(centerNo) || centerNo <= 0) return null;
  const expected = mode === 'child' ? centerNo + 1 : mode === 'spouse' ? centerNo : centerNo - 1;
  return expected > 0 ? expected : null;
}

function relationshipRuleText(mode: RelationshipMode) {
  if (mode === 'father') return '父亲必须是中心人物上一代男性';
  if (mode === 'mother') return '母亲必须是中心人物上一代女性';
  if (mode === 'spouse') return '配偶必须是中心人物同一代女性';
  return '子女必须是中心人物下一代';
}

function isCandidate(center: PersonLike | undefined, candidate: PersonLike, mode: RelationshipMode) {
  if (!center?.id || !candidate?.id || String(center.id) === String(candidate.id)) return false;
  const expectedNo = expectedGenerationNo(center, mode);
  if (!expectedNo) return false;
  if (Number(candidate.generationNo) !== expectedNo) return false;
  const gender = String(candidate.gender || '').toLowerCase();
  if (mode === 'father') return gender === 'male';
  if (mode === 'mother') return gender === 'female';
  if (mode === 'spouse') return gender === 'female';
  return true;
}

function relationBody(center: PersonLike, relative: PersonLike, mode: RelationshipMode) {
  if (mode === 'spouse') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'spouse',
      relationLabel: 'spouse',
      isLineageRelation: false,
      isBiological: false,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  if (mode === 'child') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'parent_child',
      relationLabel: String(center.gender || '').toLowerCase() === 'female' ? 'mother' : 'father',
      isLineageRelation: true,
      isBiological: true,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  return {
    fromPersonId: Number(relative.id),
    toPersonId: Number(center.id),
    relationType: 'parent_child',
    relationLabel: mode,
    isLineageRelation: true,
    isBiological: true,
    isPrimary: true,
    confidenceLevel: 'high'
  };
}

function readableError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (lower.includes('same relationship already exists') || lower.includes('relationship_duplicated')) return '该关系已存在，请勿重复创建';
  if (lower.includes('spouse relationship already exists') || lower.includes('relationship_spouse_duplicated')) return '配偶关系已存在，请勿重复创建';
  if (lower.includes('biological parent relationship already exists') || lower.includes('relationship_parent_duplicated')) return '父母关系已存在，请勿重复创建';
  return message;
}

export function RelationshipStepPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [centerPersonId, setCenterPersonId] = useState('');
  const [mode, setMode] = useState<RelationshipMode>('father');
  const [relativePersonId, setRelativePersonId] = useState('');
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextContainer = relationshipPanelBody();
      document.querySelectorAll<HTMLElement>(`.${RELATIONSHIP_HOST_CLASS}`).forEach(item => {
        if (item !== nextContainer) item.classList.remove(RELATIONSHIP_HOST_CLASS);
      });
      nextContainer?.classList.add(RELATIONSHIP_HOST_CLASS);
      setContainer(nextContainer);
      setClanId(getWorkspaceValue('clanId'));
      setCenterPersonId(getWorkspaceValue('personId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setRelativePersonId('');
    setSaveError('');
    if (!container || !clanId) {
      setPersons([]);
      return;
    }
    const timer = window.setTimeout(() => void loadPersons(clanId), 0);
    return () => window.clearTimeout(timer);
  }, [container, clanId]);

  const officialPersons = useMemo(() => persons.filter(isOfficial), [persons]);
  const centerPerson = useMemo(() => officialPersons.find(item => String(item.id) === String(centerPersonId)), [officialPersons, centerPersonId]);
  const relativeOptions = useMemo(() => officialPersons
    .filter(item => isCandidate(centerPerson, item, mode))
    .map(item => ({ value: String(item.id), label: personLabel(item) })), [officialPersons, centerPerson, mode]);
  const expectedNo = expectedGenerationNo(centerPerson, mode);

  async function loadPersons(sourceClanId: string) {
    setLoadingPersons(true);
    try {
      const data = toRecordList<PersonLike>(await apiClient.get(`/clans/${sourceClanId}/persons`));
      setPersons(data);
    } catch (error) {
      const errorText = readableError(error, '查询人物失败');
      setPersons([]);
      setSaveError(errorText);
      message.error(errorText);
    } finally {
      setLoadingPersons(false);
    }
  }

  function changeCenterPerson(value: string) {
    setCenterPersonId(value);
    setRelativePersonId('');
    setSaveError('');
    patchWorkspace({ personId: value });
  }

  function changeMode(value: RelationshipMode) {
    setMode(value);
    setRelativePersonId('');
    setSaveError('');
  }

  async function saveRelationship(submit = false) {
    setSaveError('');
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!centerPerson) {
      message.warning('请选择已审核通过的中心人物');
      return;
    }
    if (!centerPerson.generationNo) {
      message.warning('中心人物未维护代次，无法建立关系');
      return;
    }
    const relative = officialPersons.find(item => String(item.id) === String(relativePersonId));
    if (!relative || !isCandidate(centerPerson, relative, mode)) {
      message.warning(`请选择符合规则的${MODE_LABEL[mode]}：${relationshipRuleText(mode)}`);
      return;
    }
    setSaving(true);
    try {
      const relation: any = await apiClient.post(`/clans/${clanId}/relationships`, relationBody(centerPerson, relative, mode));
      const relationId = String(relation?.id || '');
      patchWorkspace({ relationshipId: relationId });
      if (submit && relationId) {
        await apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'relationship', targetId: Number(relationId), comment: '提交关系审核' });
        message.success('关系已保存并提交审核');
      } else {
        message.success('关系已保存为草稿');
      }
      setRelativePersonId('');
      setSaveError('');
      window.dispatchEvent(new CustomEvent('genealogy:object-changed', { detail: { targetType: 'relationship' } }));
    } catch (error) {
      const errorText = readableError(error, '保存关系失败');
      setSaveError(errorText);
      message.error(errorText);
    } finally {
      setSaving(false);
    }
  }

  if (!container) return null;

  return createPortal(
    <section className="relationship-step-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={5}>建立亲属关系</Typography.Title>
          <Typography.Paragraph type="secondary">先选择中心人物和关系类型，再从符合代次、性别规则的已审核人物中选择亲属。</Typography.Paragraph>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {saveError ? <Alert type="error" showIcon message={saveError} /> : null}
        <div className="relationship-step-form-grid">
          <label className="relationship-step-field">
            <span>中心人物 *</span>
            <Select
              showSearch
              loading={loadingPersons}
              value={centerPersonId || undefined}
              options={officialPersons.map(item => ({ value: String(item.id), label: personLabel(item) }))}
              placeholder="请选择已审核通过的中心人物"
              optionFilterProp="label"
              onChange={changeCenterPerson}
            />
          </label>
          <label className="relationship-step-field">
            <span>中心人物代次</span>
            <Select disabled value={centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次'} options={[{ value: centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次', label: centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次' }]} />
          </label>
          <label className="relationship-step-field">
            <span>关系类型 *</span>
            <Select value={mode} onChange={changeMode} options={[
              { value: 'father', label: '父亲' },
              { value: 'mother', label: '母亲' },
              { value: 'spouse', label: '配偶' },
              { value: 'child', label: '子女' }
            ]} />
          </label>
          <label className="relationship-step-field">
            <span>亲属 *</span>
            <Select
              showSearch
              value={relativePersonId || undefined}
              disabled={!centerPerson || !expectedNo || !relativeOptions.length}
              options={relativeOptions}
              placeholder={relativeOptions.length ? `请选择${MODE_LABEL[mode]}` : relationshipRuleText(mode)}
              optionFilterProp="label"
              onChange={value => {
                setRelativePersonId(value);
                setSaveError('');
              }}
            />
          </label>
          <label className="relationship-step-field relationship-step-field--wide">
            <span>选择规则</span>
            <Alert type="info" showIcon message={expectedNo ? `${relationshipRuleText(mode)}，应选择第${expectedNo}世人物` : '请先为中心人物维护代次'} />
          </label>
        </div>
        <Space wrap>
          <Button type="primary" loading={saving} disabled={!centerPersonId || !relativePersonId} onClick={() => void saveRelationship(false)}>保存关系草稿</Button>
          <Button loading={saving} disabled={!centerPersonId || !relativePersonId} onClick={() => void saveRelationship(true)}>保存并提交审核</Button>
        </Space>
      </Space>
    </section>,
    container
  );
}
