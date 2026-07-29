# Night Index Visual System

## Intent

A sleepless viewer sits in a demolished motel lounge after midnight, lit by a warm floor lamp, a cold corridor, and an impossible television broadcast. The room feels intimate before it feels threatening.

## Color Strategy

Environmental and drenched. Near-black negative space carries most of the frame. Oxblood, reddish wood, and tobacco brown establish the room; violet-black shadow anchors the product identity; teletext cyan, green, yellow, and red are reserved for signal state and interaction.

```css
:root {
  --bg: oklch(0.07 0 0);
  --surface: oklch(0.14 0.018 270);
  --ink: oklch(0.94 0.018 90);
  --muted: oklch(0.70 0.025 260);
  --primary: oklch(0.36 0.19 270);
  --accent: oklch(0.84 0.16 205);
  --urgent: oklch(0.62 0.23 24);
}
```

The full teletext palette uses black, red, green, yellow, blue, magenta, cyan, and white. Color never carries a choice alone; labels and page numbers remain visible.

## Typography

- Teletext50 renders the broadcast, title, receiver states, page numbers, and short system labels.
- Arial and Helvetica render settings, descriptions, and accessible controls.
- Teletext stays within a 40-column, 24-row grid on a 4:3 texture.
- Interface labels remain short and concrete.

## Spatial Composition

- Fixed seated first-person view, 46° field of view.
- The television sits slightly left of center so the cold corridor remains visible.
- Focus mode eases closer to 38° without cutting away from the room.
- The room uses dark green drapery, reddish timber, oxblood accents, an irregular tobacco diamond carpet, brass practical light, and frosted teal glass. It does not reproduce any recognizable television set.

## Components

- Intro: title, premise, one primary tuning action, sound preference.
- Teletext screen: page header, section, title, packet-rendered rows, four color links, receiver footer.
- Remote panel: three-digit keypad, current quick links, Reveal, Hold, and Size.
- Settings panel: sound, sound captions, reduced motion, reduced flashing, keyboard reference, credits.
- Status line: current page and concise receiver feedback.

## Motion and Signal

- Camera movement is a slow dolly and barely perceptible seated drift.
- Pages arrive in row packets, not a modern typewriter animation.
- Signal corruption is occasional and cell-based.
- Reduced motion removes drift and shortens tuning.
- Reduced flashing softens screen pulses, chromatic splitting, and corruption.

## Environmental Story Reactions

- Weather pages fog the corridor.
- Missing-person pages introduce an amber-lit silhouette.
- Relay pages deepen the electrical hum.
- Unlisted pages change corridor and screen light.
- The mirror page makes the corridor figure most legible.
- Each ending produces a distinct room-light state.
