import sigilRigJson from '../../assets/ui/sigils/rig.json';

export interface SigilDefinition {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'common' | 'uncommon' | 'joke';
  readonly icon: string;
  readonly accent: string;
  readonly effect: string;
  readonly tradeoff: string;
  readonly gameplayHooks: Record<string, unknown>;
}

export interface SigilKit {
  readonly id: string;
  readonly kind: string;
  readonly projectContext: string;
  readonly status: string;
  readonly style: Record<string, string | number>;
  readonly palette: Record<string, string>;
  readonly rewardChoice: {
    readonly cardsOffered: number;
    readonly layout: string;
    readonly spawnRoomTheme: string;
    readonly copyTone: string;
    readonly openItems: readonly string[];
  };
  readonly sigils: readonly SigilDefinition[];
  readonly openItems: readonly string[];
}

export const SIGIL_KIT = sigilRigJson as SigilKit;
