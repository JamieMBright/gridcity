// Named save slots (ROADMAP #34): a modal that lists the player's named
// manual saves with name, day, bill and "saved N ago", and lets them save
// the current game into a fresh/overwritten slot, load a slot, rename or
// delete one. Additive — the worker's single autosave + continue flow are
// untouched; slots live under their own localStorage key.
//
// Reachable from the start menu (load a slot to begin) and in-game (save
// the running game, or branch into a slot). Cloud sync rides the existing
// best-effort cloud save when signed in.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { captureSlotSave, loadSlotData } from '../app/workerBridge';
import {
  defaultSlotName,
  deleteSlot,
  listSlots,
  MAX_SLOTS,
  renameSlot,
  saveSlot,
  type NamedSlot,
} from '../persistence/slotStore';
import { panelStyle, theme } from './theme';

/** "saved 3m ago" / "2h ago" / "1d ago" from a wall-clock ms. */
function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

export function SavesPanel() {
  const open = useAppStore((s) => s.savesOpen);
  const setOpen = useAppStore((s) => s.setSavesOpen);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const snapshot = useAppStore((s) => s.snapshot);
  const menuOpen = useAppStore((s) => s.menuOpen);
  const [slots, setSlots] = useState<NamedSlot[]>(() => listSlots());
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<string | undefined>(undefined);
  const [renameVal, setRenameVal] = useState('');
  const [flash, setFlash] = useState<string | undefined>(undefined);

  if (!open) return null;
  const refresh = (): void => setSlots(listSlots());

  // in a fresh boot there may be no snapshot summary yet; fall back gently
  const summary = {
    day: snapshot ? Math.floor(snapshot.simTimeMin / 1440) + 1 : 1,
    bill: snapshot ? Math.round(snapshot.bill.perCustomerYr) : 0,
    scenarioId: snapshot?.scenarioId ?? 'london',
  };

  const doSave = (id?: string): void => {
    captureSlotSave((data) => {
      const slot = saveSlot(id ? renameVal || nameOf(id) : name, data, summary, id);
      setName('');
      refresh();
      setFlash(`saved “${slot.name}”`);
      setTimeout(() => setFlash(undefined), 2200);
    });
  };
  const nameOf = (id: string): string => slots.find((s) => s.id === id)?.name ?? '';

  const doLoad = (slot: NamedSlot): void => {
    loadSlotData(slot.data);
    setOpen(false);
    if (menuOpen) setMenuOpen(false);
    setFlash(undefined);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}b0`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12,
        overflowY: 'auto',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          width: 'min(440px, 94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.orange, fontWeight: 800, letterSpacing: '0.08em' }}>
            SAVE SLOTS
          </span>
          <button
            aria-label="close saves"
            onClick={() => setOpen(false)}
            style={{ border: 'none', background: 'transparent', color: theme.slate, fontFamily: theme.font, fontSize: 15, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ color: theme.slate, fontSize: 11, marginTop: 4 }}>
          name a manual save you can branch back to — separate from the autosave. {slots.length}/
          {MAX_SLOTS} used.
        </div>

        {/* save the running game into a new slot */}
        {snapshot && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultSlotName(summary)}
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doSave();
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '7px 10px',
                borderRadius: 7,
                border: `1px solid ${theme.navyLight}`,
                background: 'rgba(0,0,0,0.25)',
                color: theme.offWhite,
                fontFamily: theme.font,
                fontSize: 12,
              }}
            />
            <button
              aria-label="save to a new slot"
              onClick={() => doSave()}
              style={{
                flex: 'none',
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                background: theme.orange,
                color: theme.navy,
                fontFamily: theme.font,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              save
            </button>
          </div>
        )}
        {flash && <div style={{ color: theme.ok, fontSize: 11, marginTop: 6 }}>{flash}</div>}

        {/* the slot list */}
        <div style={{ marginTop: 12 }}>
          {slots.length === 0 && (
            <div style={{ color: theme.slate, fontSize: 12, padding: '8px 0' }}>
              no named saves yet
            </div>
          )}
          {slots.map((slot) => (
            <div
              key={slot.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                margin: '6px 0',
                borderRadius: 9,
                border: `1px solid ${theme.navyLight}`,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {renaming === slot.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => {
                      renameSlot(slot.id, renameVal);
                      setRenaming(undefined);
                      refresh();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameSlot(slot.id, renameVal);
                        setRenaming(undefined);
                        refresh();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '3px 6px',
                      borderRadius: 5,
                      border: `1px solid ${theme.orange}`,
                      background: 'rgba(0,0,0,0.3)',
                      color: theme.offWhite,
                      fontFamily: theme.font,
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <div style={{ color: theme.offWhite, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.name}
                  </div>
                )}
                <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 2 }}>
                  {slot.scenarioId === 'london' ? 'London' : slot.scenarioId} · day {slot.day} · £
                  {slot.bill.toLocaleString()}/yr · {ago(slot.savedAt)}
                </div>
              </div>
              <button
                aria-label={`load ${slot.name}`}
                onClick={() => doLoad(slot)}
                style={slotBtn(theme.ok)}
              >
                load
              </button>
              {snapshot && (
                <button
                  aria-label={`overwrite ${slot.name}`}
                  title="overwrite this slot with the current game"
                  onClick={() => {
                    setRenameVal(slot.name);
                    doSave(slot.id);
                  }}
                  style={slotBtn(theme.slate)}
                >
                  save
                </button>
              )}
              <button
                aria-label={`rename ${slot.name}`}
                onClick={() => {
                  setRenaming(slot.id);
                  setRenameVal(slot.name);
                }}
                style={slotBtn(theme.slate)}
              >
                ✎
              </button>
              <button
                aria-label={`delete ${slot.name}`}
                onClick={() => {
                  deleteSlot(slot.id);
                  refresh();
                }}
                style={slotBtn(theme.danger)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function slotBtn(color: string): React.CSSProperties {
  return {
    flex: 'none',
    padding: '4px 9px',
    borderRadius: 6,
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    fontFamily: theme.font,
    fontSize: 11,
    cursor: 'pointer',
  };
}
