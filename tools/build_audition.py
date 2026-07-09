#!/usr/bin/env python3
"""Build the audio audition set (assets/audio/audition-v2.json + curated clips).

Downloads CC0/CC-BY candidates into assets/audio/.cache/ (gitignored), copies
the used raw files into assets/audio/sfx|music/candidates/, and renders
loudness-normalized audition clips into assets/audio/sfx/curated/.
Everything it writes is regenerable and gitignored; only files promoted into
assets/audio/sfx/game/ or assets/audio/music/ after human audition are
committed. Audition page: /audition.html (selections post to review-inbox).

Requires: curl, unzip, ffmpeg.
"""
import json, os, shutil, subprocess

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = f'{REPO}/assets/audio/.cache'

# sourceId -> (list of direct URLs, needs_unzip)
SOURCES = {
 'kenney_rpg-audio': (['https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip'], True),
 'kenney_impact-sounds': (['https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip'], True),
 'oga-rpg-sound-pack': (['https://opengameart.org/sites/default/files/rpg_sound_pack.zip'], True),
 'oga-teleport': (['https://opengameart.org/sites/default/files/172206__fins__teleport.wav'], False),
 'oga-teleport-spell': (['https://opengameart.org/sites/default/files/teleport.wav'], False),
 'oga-sheep-baa': (['https://opengameart.org/sites/default/files/sheep_baa_0.ogg'], False),
 'oga-sheep-sound-bleats-yo-frankie': ([
   'https://opengameart.org/sites/default/files/sheep1.flac',
   'https://opengameart.org/sites/default/files/sheep2.flac',
   'https://opengameart.org/sites/default/files/sheepBleet.flac'], False),
 'oga-8-magic-attacks': (['https://opengameart.org/sites/default/files/8_rpg_battle_magic_sfx_free_samples.zip'], True),
 'oga-random-sfx': (['https://opengameart.org/sites/default/files/SFX.zip'], True),
 'oga-fireball-1': (['https://opengameart.org/sites/default/files/105016__julien-matthey__jm-fx-fireball-01.wav'], False),
 'oga-7-ghast-sounds': (['https://opengameart.org/sites/default/files/ghast_-_starninjas.zip'], True),
 'oga-fire-loop': (['https://opengameart.org/sites/default/files/qubodupFireLoop.ogg'], False),
 'oga-magic-missiles': (['https://opengameart.org/sites/default/files/Magic_Missiles.wav'], False),
 'oga-spell-sounds-starter-pack': (['https://opengameart.org/sites/default/files/spells.zip'], True),
 'oga-basilisk-boss-battle-loop': (['https://opengameart.org/sites/default/files/basilisk_boss_battle_in_game.ogg'], False),
 'oga-16bit-boss-battle-loop': (['https://opengameart.org/sites/default/files/Boss%20Battle_0.ogg'], False),
 'oga-space-boss-battle-theme': (['https://opengameart.org/sites/default/files/Orbital%20Colossus_0.mp3'], False),
 'oga-8-bit-battle-loop': (['https://opengameart.org/sites/default/files/8BitBattleLoop_0.ogg'], False),
 'oga-dungeon-01': (['https://opengameart.org/sites/default/files/Dungeon%2001.ogg'], False),
 'oga-dungeon-03': (['https://opengameart.org/sites/default/files/Dungeon%2003.ogg'], False),
 'oga-dungeon-05': (['https://opengameart.org/sites/default/files/Dungeon%2005.ogg'], False),
 'oga-creepy': (['https://opengameart.org/sites/default/files/CrEEP.ogg'], False),
 'oga-creepy-ambient-loop': (['https://opengameart.org/sites/default/files/creepyloop-v2_0.ogg'], False),
 'oga-8-wet-squish-slurp-impacts': (['https://opengameart.org/sites/default/files/independent_nu_ljudbank-wet_squish_slurp_impacts.7z'], True),
 'oga-squish-sounds-effects': ([
   'https://opengameart.org/sites/default/files/squish_01_0.mp3',
   'https://opengameart.org/sites/default/files/squish_02.mp3'], False),
 'oga-ghost-monster-voice': (['https://opengameart.org/sites/default/files/qubodup-GhostMoans.zip'], True),
 'oga-ghost-breath': (['https://opengameart.org/sites/default/files/ghostbreath.flac'], False),
 'oga-explosion-0': (['https://opengameart.org/sites/default/files/explosion.wav'], False),
 'oga-synthesized-explosion': (['https://opengameart.org/sites/default/files/synthetic_explosion_1.flac'], False),
 'oga-big-explosion': (['https://opengameart.org/sites/default/files/DeathFlash.flac'], False),
}

def fetch():
    for sid, (urls, unzip) in SOURCES.items():
        d = f'{DL}/{sid}'
        os.makedirs(d, exist_ok=True)
        for url in urls:
            fn = url.split('/')[-1].replace('%20', '_')
            path = f'{d}/{fn}'
            if not os.path.exists(path):
                print('fetch', sid, fn)
                subprocess.run(['curl', '-sL', '--max-time', '180', '-o', path, url], check=True)
            if unzip and fn.endswith('.zip') and not os.path.isdir(f'{d}/unz'):
                subprocess.run(['unzip', '-q', '-o', path, '-d', f'{d}/unz'], check=True)
            if unzip and fn.endswith('.7z') and not os.path.isdir(f'{d}/unz'):
                subprocess.run(['7z', 'x', '-y', path, f'-o{d}/unz'], check=True, stdout=subprocess.DEVNULL)

fetch()
CAND=f'{REPO}/assets/audio/sfx/candidates'
CUR=f'{REPO}/assets/audio/sfx/curated'
MUS=f'{REPO}/assets/audio/music/candidates'

KENNEY={'source':'Kenney audio packs','author':'Kenney','license':'CC0','slug':'https://kenney.nl/assets'}

OGA_META={
 'oga-rpg-sound-pack':('RPG Sound Pack','artisticdude','CC0'),
 'oga-teleport':('Teleport','fins','CC0'),
 'oga-teleport-spell':('Teleport Spell','spookymodem','CC0'),
 'oga-sheep-baa':('Sheep baa','confusion_music','CC0'),
 'oga-sheep-sound-bleats-yo-frankie':('Sheep Sound Bleats (Yo Frankie!)','apricot','CC-BY 3.0'),
 'oga-8-magic-attacks':('8 Magic Attacks','wobbleboxx','CC-BY 4.0'),
 'oga-random-sfx':('Random SFX','stephenpearson','CC0'),
 'oga-fireball-1':('Fireball','julien-matthey (via diligentcircle)','CC0'),
 'oga-7-ghast-sounds':('7 Ghast Sounds','starninjas','CC0'),
 'oga-fire-loop':('Fire Loop','qubodup','CC-BY 3.0'),
 'oga-magic-missiles':('Magic Missiles','spookymodem','CC-BY 3.0'),
 'oga-spell-sounds-starter-pack':('Spell Sounds Starter Pack','p0ss','CC-BY-SA 3.0'),
 'oga-basilisk-boss-battle-loop':('Basilisk Boss Battle Loop','beardalaxy','CC0'),
 'oga-16bit-boss-battle-loop':('16bit Boss Battle Loop','3xBlast','CC-BY-SA 3.0'),
 'oga-space-boss-battle-theme':('Space Boss Battle Theme (Orbital Colossus)','Matthew Pablo','CC-BY 3.0'),
 'oga-8-bit-battle-loop':('8-bit Battle Loop','Wolfgang_','CC0'),
 'oga-dungeon-01':('Dungeon 01','Fantasy Musica','CC-BY-SA 4.0'),
 'oga-dungeon-03':('Dungeon 03','Fantasy Musica','CC-BY-SA 4.0'),
 'oga-dungeon-05':('Dungeon 05','Fantasy Musica','CC-BY-SA 4.0'),
 'oga-creepy':('CrEEP','TokyoGeisha','CC0'),
 'oga-creepy-ambient-loop':('Creepy Ambient Loop','EPB9000','CC0'),
 'oga-8-wet-squish-slurp-impacts':('8 Wet Squish, Slurp Impacts','Independent.nu (via qubodup)','CC0'),
 'oga-squish-sounds-effects':('Squish Sounds Effects','ezduzziteh','CC0'),
 'oga-ghost-monster-voice':('Ghost/Monster Voice: Moaning & Growling','qubodup','CC0'),
 'oga-ghost-breath':('Ghost Breath','qubodup','CC0'),
 'oga-explosion-0':('Explosion','tinyworlds','CC0'),
 'oga-synthesized-explosion':('Synthesized Explosion','qubodup','CC0'),
 'oga-big-explosion':('Big Explosion (DeathFlash)','lamoot','CC-BY 3.0'),
}

def M(sid):
    if sid.startswith('kenney'): return {**KENNEY,'slug':f'https://kenney.nl/assets/{sid.replace("kenney_","")}'}
    title,author,lic=OGA_META[sid]
    slug='ghost-monster-voice-moaning-growling' if sid=='oga-ghost-monster-voice' else sid[4:]
    return {'source':title,'author':author,'license':lic,'slug':f'https://opengameart.org/content/{slug}'}

# event -> usage + candidates [(sourceId, relpath, label, max_seconds)]
EVENTS={
 'portal_whoosh':('传送门:hexbrim 传送/召唤、switcheroo 换位、doorbert 侧门',[
   ('oga-teleport','172206__fins__teleport.wav','fins-teleport',3),
   ('oga-teleport-spell','teleport.wav','spookymodem-teleport',3),
   ('oga-spell-sounds-starter-pack','unz/warp.ogg','p0ss-warp',3)]),
 'spell_bolt':('boss 弹幕出手(扇形/直线三连)',[
   ('oga-magic-missiles','Magic_Missiles.wav','magic-missiles',2.5),
   ('oga-spell-sounds-starter-pack','unz/zap7a.ogg','zap7a',2.5),
   ('oga-spell-sounds-starter-pack','unz/zap15.ogg','zap15',2.5),
   ('oga-rpg-sound-pack','unz/RPG Sound Pack/battle/magic1.wav','rpgpack-magic1',2.5)]),
 'witchfire_ignite':('巫火喷洒落地瞬间',[
   ('oga-fireball-1','105016__julien-matthey__jm-fx-fireball-01.wav','jm-fireball',3),
   ('oga-8-magic-attacks','unz/04_Fire_explosion_04_medium.wav','fire-explosion-medium',3),
   ('oga-fire-loop','qubodupFireLoop.ogg','qubodup-fire-2s',2)]),
 'hex_orb_launch':('变羊追踪弹发射(阴森)',[
   ('oga-spell-sounds-starter-pack','unz/curse.ogg','curse',4),
   ('oga-spell-sounds-starter-pack','unz/curse2.ogg','curse2',4),
   ('oga-spell-sounds-starter-pack','unz/curse4.ogg','curse4',4)]),
 'sheep_morph':('变羊命中的 poof(会叠加羊叫)',[
   ('oga-spell-sounds-starter-pack','unz/confusion.ogg','confusion',3),
   ('oga-8-magic-attacks','unz/46_Poison_01.wav','poison',3),
   ('oga-spell-sounds-starter-pack','unz/curse3.ogg','curse3',3)]),
 'sheep_bleat':('Sheepbert 羊叫(变羊时+期间偶发)',[
   ('oga-sheep-baa','sheep_baa_0.ogg','sheep-baa',3),
   ('oga-sheep-sound-bleats-yo-frankie','sheep1.flac','yofrankie-sheep1',3),
   ('oga-sheep-sound-bleats-yo-frankie','sheep2.flac','yofrankie-sheep2',3),
   ('oga-sheep-sound-bleats-yo-frankie','sheepBleet.flac','yofrankie-bleet',3)]),
 'ritual_channel':('仪式吟唱 6 秒蓄力(可循环/长音)',[
   ('oga-8-magic-attacks','unz/45_Charge_05.wav','charge',8),
   ('oga-random-sfx','unz/SFX/Background/Hollow Wind.wav','hollow-wind',8),
   ('oga-spell-sounds-starter-pack','unz/wind.ogg','p0ss-wind',8)]),
 'ritual_blast':('仪式完成的全场爆炸',[
   ('oga-spell-sounds-starter-pack','unz/explode.ogg','explode',4),
   ('oga-8-magic-attacks','unz/13_Ice_explosion_01.wav','ice-explosion',4),
   ('oga-8-magic-attacks','unz/18_Thunder_02.wav','thunder',4)]),
 'shade_summon':('SHADES ANSWER 幽灵登场哭嚎',[
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_cries.1.ogg','ghast-cry1',4),
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_cries.2.ogg','ghast-cry2',4),
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_cries.3.ogg','ghast-cry3',4)]),
 'door_creak':('Doorbert 开门吱呀',[
   ('kenney_rpg-audio','Audio/doorOpen_1.ogg','dooropen1',3),
   ('kenney_rpg-audio','Audio/doorOpen_2.ogg','dooropen2',3),
   ('kenney_rpg-audio','Audio/creak2.ogg','creak2',3)]),
 'parry_wood':('Backboard 弹反(现有 hit_wood_board 也是候选)',[
   ('kenney_impact-sounds','Audio/impactPlank_medium_000.ogg','plank0',2),
   ('kenney_impact-sounds','Audio/impactPlank_medium_001.ogg','plank1',2),
   ('kenney_impact-sounds','Audio/impactPlank_medium_002.ogg','plank2',2)]),
 # --- v3: 材质化受击/死亡(替换木桩默认音) ---
 'enemy_hit_squish':('软体受击:墨水怪 goober、交换怪(替换木板声)',[
   ('oga-8-wet-squish-slurp-impacts','unz/impsplat/impactsplat01.mp3.flac','impactsplat1',1.6),
   ('oga-8-wet-squish-slurp-impacts','unz/impsplat/impactsplat03.mp3.flac','impactsplat3',1.6),
   ('oga-squish-sounds-effects','squish_01_0.mp3','ezd-squish1',1.6)]),
 'enemy_death_squish':('软体死亡 splat:goober/交换怪(更大更湿)',[
   ('oga-8-wet-squish-slurp-impacts','unz/impsplat/impactsplat07.mp3.flac','impactsplat7',2.5),
   ('oga-8-wet-squish-slurp-impacts','unz/impsplat/impactsplat08.mp3.flac','impactsplat8',2.5),
   ('oga-squish-sounds-effects','squish_02.mp3','ezd-squish2',2.5)]),
 'enemy_hit_ghost':('幽灵受击:Spooper Gooper + boss 召唤的 shades',[
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_hurt.1.ogg','ghast-hurt1',2),
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_hurt.2.ogg','ghast-hurt2',2),
   ('oga-7-ghast-sounds','unz/ghast - StarNinjas/ghast_hurt.3.ogg','ghast-hurt3',2)]),
 'enemy_death_ghost':('幽灵消散死亡',[
   ('oga-ghost-monster-voice','unz/qubodup-GhostMoans/wav/qubodup-GhostMoan01.wav','ghost-moan1',3),
   ('oga-ghost-monster-voice','unz/qubodup-GhostMoans/wav/qubodup-GhostMoan04.wav','ghost-moan4',3),
   ('oga-ghost-breath','ghostbreath.flac','ghost-breath',3)]),
 'enemy_hit_metal':('金属受击:Keylet 钥匙、Kaboomlet 炸弹小子',[
   ('kenney_impact-sounds','Audio/impactMetal_light_000.ogg','metal-light0',1.5),
   ('kenney_impact-sounds','Audio/impactMetal_light_002.ogg','metal-light2',1.5),
   ('kenney_rpg-audio','Audio/metalLatch.ogg','metal-latch',1.5),
   ('kenney_impact-sounds','Audio/impactGeneric_light_001.ogg','generic-light1',1.5)]),
 'explosion_small':('Kaboomlet 爆炸(现在竟然是木板声)',[
   ('oga-explosion-0','explosion.wav','tinyworlds-explosion',3),
   ('oga-synthesized-explosion','synthetic_explosion_1.flac','qubodup-synth',3),
   ('oga-big-explosion','DeathFlash.flac','lamoot-deathflash',3)]),
 'enemy_hit_magic':('Hexbrim boss 受击(布+魔法,不该是木头)',[
   ('oga-8-magic-attacks','unz/22_Water_02.wav','water',2),
   ('oga-8-magic-attacks','unz/25_Wind_01.wav','wind',2),
   ('oga-8-magic-attacks','unz/30_Earth_02.wav','earth',2),
   ('oga-spell-sounds-starter-pack','unz/zap15.ogg','zap15',2)]),
 'enemy_death_magic':('Hexbrim boss 死亡(魔法解体)',[
   ('oga-8-magic-attacks','unz/18_Thunder_02.wav','thunder',3),
   ('oga-spell-sounds-starter-pack','unz/explode.ogg','explode',3),
   ('oga-spell-sounds-starter-pack','unz/spell.ogg','spell',3)]),
}

# v2 groups already applied on 2026-07-09 — page hides these.
DECIDED = {'portal_whoosh','spell_bolt','witchfire_ignite','hex_orb_launch','sheep_morph',
           'sheep_bleat','ritual_channel','ritual_blast','shade_summon','door_creak','parry_wood',
           'music_combat','music_boss'}
MUSIC={
 'music_combat':('普通战斗房循环',[
   ('oga-8-bit-battle-loop','8BitBattleLoop_0.ogg','8bit-battle'),
   ('oga-dungeon-01','Dungeon_01.ogg','dungeon-01'),
   ('oga-dungeon-03','Dungeon_03.ogg','dungeon-03'),
   ('oga-dungeon-05','Dungeon_05.ogg','dungeon-05')]),
 'music_boss':('Hexbrim boss 战循环',[
   ('oga-basilisk-boss-battle-loop','basilisk_boss_battle_in_game.ogg','basilisk'),
   ('oga-16bit-boss-battle-loop','Boss_Battle_0.ogg','16bit-boss'),
   ('oga-space-boss-battle-theme','Orbital_Colossus_0.mp3','orbital-colossus'),
   ('oga-creepy','CrEEP.ogg','creep'),
   ('oga-creepy-ambient-loop','creepyloop-v2_0.ogg','creepy-ambient')]),
}

manifest={'version':2,'updated':'2026-07-09','purpose':'audition candidates for boss/new-enemy SFX + music','events':{},'music':{}}

for event,(usage,cands) in EVENTS.items():
    entries=[]
    for sid,rel,label,maxs in cands:
        src=f'{DL}/{sid}/{rel}'
        assert os.path.exists(src),src
        keep=f'{CAND}/{sid}/{os.path.basename(rel)}'
        os.makedirs(os.path.dirname(keep),exist_ok=True)
        if not os.path.exists(keep): shutil.copy(src,keep)
        out=f'{CUR}/{event}/{label}.ogg'
        os.makedirs(os.path.dirname(out),exist_ok=True)
        subprocess.run(['ffmpeg','-y','-v','error','-i',src,'-af',
          f'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-18:TP=-1.5,atrim=0:{maxs}',
          '-ar','44100','-ac','1','-c:a','libvorbis','-q:a','4',out],check=True)
        entries.append({'id':label,'file':f'assets/audio/sfx/curated/{event}/{label}.ogg',
                        'raw':f'assets/audio/sfx/candidates/{sid}/{os.path.basename(rel)}',**M(sid)})
    manifest['events'][event]={'usage':usage,'candidates':entries,'decided':event in DECIDED}

for slot,(usage,cands) in MUSIC.items():
    entries=[]
    for sid,rel,label in cands:
        src=f'{DL}/{sid}/{rel}'
        assert os.path.exists(src),src
        ext=os.path.splitext(rel)[1]
        keep=f'{MUS}/{sid}/{os.path.basename(rel)}'
        os.makedirs(os.path.dirname(keep),exist_ok=True)
        if not os.path.exists(keep): shutil.copy(src,keep)
        entries.append({'id':label,'file':f'assets/audio/music/candidates/{sid}/{os.path.basename(rel)}',**M(sid)})
    manifest['music'][slot]={'usage':usage,'candidates':entries,'decided':slot in DECIDED}

manifest['events']['parry_wood']['candidates'].append({'id':'reuse-hit-wood-board','file':'assets/audio/sfx/game/hit_wood_board.wav','raw':'assets/audio/sfx/game/hit_wood_board.wav','source':'现有 game 包 hit_wood_board(复用选项)','author':'plantmonkey','license':'CC0','slug':'existing'})
json.dump(manifest,open(f'{REPO}/assets/audio/audition-v2.json','w'),indent=1,ensure_ascii=False)
print('manifest events:',len(manifest['events']),'music:',len(manifest['music']))
