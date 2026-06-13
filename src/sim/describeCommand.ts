// One-line human labels for player commands (ROADMAP #27, undo history).
//
// The worker pushes a label alongside every undo snapshot so the undo
// history list can read like a build log ("built 132 kV line", "awarded
// CCGT bid") instead of blind step counts. Pure + deterministic: it reads
// only the command and (optionally) the pre-command state for the names of
// things being removed/awarded. Used for the undo-stack labels in the
// snapshot and unit-tested directly.

import { GENS, SUBS } from './catalog';
import type { Command } from './commands';
import { developerOf } from './events/developers';
import type { GameState } from './state';

function subLabel(sub: keyof typeof SUBS): string {
  // the short head of the catalog name ("Grid substation (132/33 kV)" →
  // "Grid substation")
  return SUBS[sub]?.name.split(' (')[0] ?? 'substation';
}

/** A short past-tense summary of what `cmd` did, given the state BEFORE it
 *  applied (so demolish/award can name the asset/developer). Always returns
 *  a non-empty string. */
export function describeCommand(cmd: Command, before: GameState): string {
  switch (cmd.type) {
    case 'build': {
      const spec = cmd.spec;
      if (spec.kind === 'gen') return `placed ${GENS[spec.gen]?.name ?? 'generator'}`;
      if (spec.kind === 'sub') return `built ${subLabel(spec.sub)}`;
      if (spec.kind === 'depot') return 'built field depot';
      return `built ${spec.level} kV ${spec.build === 'underground' ? 'cable' : 'line'}`;
    }
    case 'buildPath':
      return `built ${cmd.level} kV ${cmd.build === 'underground' ? 'cable' : 'line'} (${cmd.waypoints.length + 1} legs)`;
    case 'placeTemplate':
      return `stamped a template (${cmd.subs.length} sub${cmd.subs.length > 1 ? 's' : ''}${
        cmd.lines.length ? ` + ${cmd.lines.length} feeder${cmd.lines.length > 1 ? 's' : ''}` : ''
      })`;
    case 'tee':
      return `teed ${cmd.build === 'underground' ? 'cable' : 'line'} into a circuit`;
    case 'demolish': {
      const a = before.assets.get(cmd.assetId);
      if (!a) return 'demolished an asset';
      if (a.kind === 'gen') return `demolished ${GENS[a.gen]?.name ?? 'generator'}`;
      if (a.kind === 'sub') return `demolished ${subLabel(a.sub)}`;
      if (a.kind === 'depot') return 'demolished field depot';
      return `demolished ${a.level} kV ${a.build === 'underground' ? 'cable' : 'line'}`;
    }
    case 'convertLine':
      return 'undergrounded a line';
    case 'undergroundSection':
      return 'undergrounded a line section';
    case 'uprateLine':
      return 're-conductored a line';
    case 'convertSub':
      return 'rebuilt substation underground (GIS)';
    case 'setSubMva': {
      const a = before.assets.get(cmd.assetId);
      const name = a && a.kind === 'sub' ? subLabel(a.sub) : 'substation';
      if (cmd.auto) return `set ${name} to auto-reinforce`;
      return `resized ${name} to ${cmd.mva ?? '?'} MVA`;
    }
    case 'setBatteryPolicy':
      return `set battery policy to ${cmd.policy}`;
    case 'replaceAsset':
      return 'replaced an aged asset';
    case 'scheduleMaintenance':
      return 'scheduled maintenance';
    case 'convertToH2':
      return 'converted peaker to hydrogen';
    case 'acceptBid': {
      const t = before.tenders.find((x) => x.id === cmd.tenderId);
      const dev = developerOf(cmd.developerId)?.name;
      const gen = t ? GENS[t.gen]?.name : 'generation';
      return `awarded ${gen ?? 'generation'} bid${dev ? ` to ${dev}` : ''}`;
    }
    case 'declineTender':
      return 'withdrew a tender';
    case 'respondApplication':
      return cmd.response === 'decline'
        ? 'declined a connection'
        : `accepted a ${cmd.response} connection`;
    case 'fundPitch':
      return 'funded an innovation pitch';
    case 'setLevy':
      return `set innovation levy to ${cmd.pct}%`;
    case 'setFleet':
      return `set field fleet to ${cmd.vans} vans`;
    case 'setVegPolicy':
      return `set vegetation policy to ${cmd.policy}`;
    case 'stormPrep':
      return cmd.action === 'surge' ? 'hired surge crews' : 'cut vegetation';
    case 'setSmartCharging':
      return cmd.on ? 'funded smart charging' : 'wound down smart charging';
    case 'setDirectorate':
      return `staffed ${cmd.directorate} directorate`;
    case 'setPay':
      return 'set pay & benefits';
    case 'setSafetyProgramme':
      return 'set safety programme';
    case 'claimResponse':
      return `${cmd.response} a legal claim`;
    case 'setSpeed':
    case 'undo':
    case 'redo':
      // never snapshotted — present for exhaustiveness
      return 'action';
  }
}
