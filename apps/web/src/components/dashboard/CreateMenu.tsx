'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import type { TransactionType } from '@/lib/types';
import s from './CreateMenu.module.scss';

const actions: Array<{ type: TransactionType; label: string; description: string; icon: string; tone: string }> = [
  { type: 'BALANCE', label: '잔액', description: '현재 가진 금액 기록', icon: '₩', tone: 'balanceIcon' },
  { type: 'FIXED', label: '정기 지출', description: '매월 반복되는 지출', icon: '↻', tone: 'fixedIcon' },
  { type: 'VARIABLE', label: '일시적 소비', description: '한 번 발생한 소비', icon: '⌁', tone: 'variableIcon' },
];

export function CreateMenu({ onSelect }: { onSelect: (type: TransactionType) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  function select(type: TransactionType) { setOpen(false); onSelect(type); }
  return <div className={s.createMenu} ref={root}>
    <Button onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="menu">＋ 생성</Button>
    {open && <div className={s.dropdownPanel} role="menu">
      {actions.map(action => <button className={s.menuItem} role="menuitem" key={action.type} onClick={() => select(action.type)}>
        <i className={`${s.itemIcon} ${s[action.tone]}`}>{action.icon}</i>
        <span className={s.itemCopy}><b>{action.label}</b><small>{action.description}</small></span>
      </button>)}
    </div>}
  </div>;
}
