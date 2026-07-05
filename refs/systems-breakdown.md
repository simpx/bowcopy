# Systems Breakdown

这份文件把视频内容转成实现任务。后续开始写代码时，可以按这里拆 milestone。

## Core Loop

1. 生成或加载一张房间图。
2. 玩家从起始房进入普通房。
3. 进入房间中心触发门关闭和刷怪。
4. 玩家用弓箭、翻滚和走位清怪。
5. 房间敌人清空后打开相邻方向的门。
6. 玩家探索更多房间，遇到巫师房拿 power-up。
7. 难度随房间深度或已清房数提高。

## Data Shapes

### Dungeon Map Cell

```ts
type RoomKind = "start" | "normal" | "wizard" | "boss";

type RoomCell = {
  x: number;
  y: number;
  kind: RoomKind;
  theme?: "wood" | "stone" | "mushroom";
  cleared: boolean;
  opened: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
};
```

### Enemy Definition

```ts
type EnemyDefinition = {
  id: string;
  hp: number;
  speed: number;
  contactDamage: number;
  behavior: "ranged" | "spore" | "hopper" | "bomb" | "ghost";
  projectile?: string;
  spawnWeight: number;
};
```

### Animation Profile

```ts
type SquashProfile = {
  frequency: number;
  yScaleAmplitude: number;
  rotationAmplitude: number;
  phaseOffset?: number;
};
```

### Sigil

```ts
type Sigil = {
  id: string;
  name: string;
  description: string;
  apply: (stats: PlayerStats) => PlayerStats;
};
```

## Player Systems

### Movement

- WASD 或左摇杆移动。
- 鼠标方向决定瞄准。
- 角色朝向可独立于移动方向。
- 移动状态驱动动画 profile。

### Bow

- 鼠标按下进入 `charging`。
- 根据蓄力时间更新弓动画帧、镜头拉近和暗角。
- 鼠标松开发射箭，进入冷却。
- 箭矢用方向向量、速度、最大距离和命中圆实现。

### Dodge Roll

- 空格触发短时冲刺。
- 冲刺期间可选无敌或穿过部分弹体。
- 生成玩家残影。
- 冲刺结束后进入短冷却。

## Enemy Systems

### Ranged Goober

- 获取玩家方向。
- 加随机偏角。
- 移动一段距离。
- 停下并发射弹体。
- 循环。

### Variant Ranged Goober

- 复用 ranged 行为。
- 改 `hp`、`speed`、尺寸、颜色、弹体速度即可形成新怪。

### Mushroom

- 移动和射击节奏类似 ranged。
- 发射多个停留型 hazard。
- hazard 有持续时间和接触伤害。

### Slime

- 周期性跳跃。
- 跳跃方向有随机性，并可小概率远离玩家。
- 死亡后生成多个小史莱姆。
- 小史莱姆血量低、速度快，可被翻滚秒杀。

### Bomb

- 追逐玩家。
- 接近后进入 armed 状态。
- 闪烁频率逐渐提高。
- 倒计时结束或被箭击中后爆炸。
- 爆炸对敌人是范围秒杀，对玩家按距离环计算伤害。

### Ghost

- 在房间内选择出现点。
- 显形后短暂停留，发射三发弹体。
- 隐身移动或等待。
- 只有显形阶段可被箭命中。

## Dungeon Systems

### Map Blueprint

推荐先用二维字符数组，而不是图片解析：

```txt
..P..
.NNN.
PNYNP
.NNN.
..B..
```

- `Y`: start
- `N`: normal
- `P`: wizard/power-up
- `B`: boss placeholder
- `.`: empty

之后如果需要更贴近视频，可以改成读取像素图颜色。

### Room Template

房间模板应包含：

- 房间尺寸。
- 墙体和门位置。
- 可刷怪点。
- 可装饰点。
- 主题限制。
- 可用敌人池。

### Doors

- 房间有相邻 cell 时才显示对应方向门。
- 未触发房间时门可开。
- 战斗中门关闭。
- 清怪后门打开。

### Spawning

- 玩家第一次进入中心触发区后开始刷怪。
- 按难度表决定敌人数量和权重。
- 敌人逐个出现，配生成粒子。

## Juice Systems

- `CameraShake`: 输入强度和持续时间。
- `CameraZoom`: 蓄力时拉近，发射后回弹。
- `Vignette`: 蓄力时加深，释放后消失。
- `Particles`: 命中墙、怪物死亡、敌人生成、炸弹爆炸、弹体拖尾。
- `HealthHud`: 平时轻微 bob，受击时闪白并抖动。
- `HitStop`: 可选，命中或爆炸时暂停 40-80ms。

## Asset Strategy

- 角色和敌人优先用简单形状或低成本手绘图。
- 动画优先程序化：缩放、旋转、偏移、颜色闪烁。
- 敌人变体优先参数化，不急着新增 AI。
- 房间内容优先模板化和随机装饰，不急着做复杂地图算法。
- 粒子和相机反馈优先级高，因为它们直接影响手感。

## MVP Cut

最小版本只需要：

- 一个玩家；
- 弓箭蓄力和发射；
- 翻滚；
- 一个房间模板；
- 一个基础远程怪；
- 门关闭/清怪/开门；
- 两到三个房间组成的小地图。

这个 MVP 成立后，再加入程序地图、更多敌人、巫师房和 sigil。
