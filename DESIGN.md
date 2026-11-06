---
name: ClipPass
description: A reel read as literal 35mm film on an editor's lightbox; every license is a frame and its edge code is the Stellar transaction.
colors:
  lightbox: "#e9eef0"
  glass: "#dbe3e7"
  rule: "#c3ccd1"
  field-white: "#f7f9fa"
  acetate: "#c75f2a"
  acetate-deep: "#a84a1c"
  acetate-press: "#8c3d15"
  frame: "#1a120d"
  ink-2: "#5a4a40"
  unexposed: "#0d0907"
  print: "#f1bd45"
  fog: "#f3ece4"
  pencil: "#c42a24"
  pencil-deep: "#8f1d18"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.4vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 86"
  headline:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 88"
  title:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 800
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 900
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  button:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    fontVariation: "'wdth' 108"
  edge:
    fontFamily: "'DotGothic16', ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  none: "0"
spacing:
  xs: "8px"
  sm: "16px"
  md: "32px"
  lg: "48px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.acetate-deep}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 26px"
    height: "54px"
  button-primary-hover:
    backgroundColor: "{colors.acetate-press}"
  field:
    backgroundColor: "{colors.field-white}"
    textColor: "{colors.frame}"
    rounded: "{rounded.none}"
    padding: "13px 14px"
    height: "54px"
  field-leader:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.print}"
    rounded: "{rounded.none}"
    padding: "13px 14px"
  network-badge:
    textColor: "{colors.frame}"
    typography: "{typography.edge}"
    rounded: "{rounded.none}"
    padding: "7px 12px 6px"
  film-frame:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.fog}"
    rounded: "{rounded.none}"
    padding: "14px"
    width: "210px"
  film-frame-refused:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.pencil}"
  gauge-track:
    backgroundColor: "rgba(26, 18, 13, 0.07)"
    height: "24px"
---

# Design System: ClipPass

## Overview

**Creative North Star: "The Edge-Code Reel"**

The product is read as a strip of 35mm film laid on an editor's lightbox. The ground is cool lightbox glass with a faint 48px grid; the strip is orange-mask acetate with round sprocket perforations; each license is a frame, and the edge print beside it carries the lane, the price and the Stellar transaction. Light is the state: a frame develops from unexposed black when its license is paid, and a refused frame overexposes to fog and takes a grease-pencil cross that stays.

The system is a strict three-colour commitment (acetate orange, frame black, edge-print yellow) on a cool neutral ground, with grease-pencil red held back for refusals alone. Archivo's width axis does the typographic work: condensed and heavy for headlines, expanded for the wordmark, plain for reading. DotGothic16 is the edge print, the machine voice for codes, lanes and network status. Corners are square, depth is flat, and there are no cards: content sits on rules and on the film itself.

Motion belongs to the reel. The strip pulls down one frame at a time on an underdamped spring, holds, and registers; film artifacts (develop, warm flash, fog) fire on exact events, never as an ambient filter. Under reduced motion the reel is fully developed and parked on the refusal.

**Key Characteristics:**
- Cool lightbox ground with a 48px glass grid; film is the only warm surface.
- Three colours plus a refusal red; red never decorates.
- Archivo width axis as hierarchy; DotGothic16 as edge print.
- Square corners everywhere; the only curves are sprocket holes and the hand-drawn pencil ring.
- Flat surfaces separated by 2px frame-black rules and 1px cool rules, never shadows.
- Every fact (price, refusal reason, tx link) lives in the DOM; the WebGL reel only restates it.

## Colors

A cool, nearly colourless lightbox carrying one warm material (acetate film) and one alarm (grease pencil).

### Primary
- **Orange-Mask Acetate** (acetate): the film base. Owns the WebGL strip, the reduced-motion fallback strip, gauge bars and the scrollbar thumb. Used as a large fill, not as text.
- **Deep Acetate** (acetate-deep): acetate tuned for text and text-bearing fills at 4.5:1 or better. The primary button, links, the focus ring, the "Pass" in the wordmark, and paid states in tags, trace lines and job status.
- **Pressed Acetate** (acetate-press): primary button hover only.

### Secondary
- **Edge-Print Yellow** (print): the edge code. Appears only on film and on black leader: frame edge print, prices on frames, the script textarea text and caret, and text selection on black.

### Tertiary
- **Grease Pencil** (pencil): a refusal, nothing else. The ring around a refused price or note, the cross on the refused frame, error text, refused and failed tags and status.
- **Deep Pencil** (pencil-deep): the dark half of the hazard stripe on an over-limit gauge bar.

### Neutral
- **Frame Black** (frame): body ink, film frames, the black leader field, 2px structural rules, field borders, and the paid gauge bar.
- **Secondary Ink** (ink-2): warm grey tinted from frame black for taglines, captions, hints, table heads and fact labels.
- **Unexposed Stock** (unexposed): an empty frame, darker than frame black.
- **Fog** (fog): overexposed film. The refused frame's ground and the light text on black frames.
- **Lightbox Glass** (lightbox): the page ground.
- **Glass Grid** (glass): the 48px lightbox grid lines and the scrollbar track.
- **Cool Rule** (rule): 1px dividers between table rows, trace lines and facts.
- **Field White** (field-white): the ground of ordinary inputs and selects, a step brighter than the lightbox.

### Named Rules
**The Red Means No Rule.** Grease pencil appears only where the card or the agent refused or failed something. If nothing was refused, the screen has no red.

**The Print Stays On Film Rule.** Edge-print yellow is legible only on black; it never sits on the lightbox.

**The Acetate Splits Rule.** Raw acetate is a fill; any acetate that carries or is text uses Deep Acetate.

## Typography

**Display Font:** Archivo Variable (width axis), with Archivo and system-ui fallback
**Body Font:** Archivo Variable
**Label/Mono Font:** DotGothic16 (latin 400), with ui-monospace fallback

**Character:** One grotesque stretched and squeezed through its width axis, set against a dot-matrix face that reads like film edge print. Both faces are self-hosted.

### Hierarchy
- **Display** (800, clamp(2rem, 3.4vw, 3.1rem), 1.02, width 86): the start-page headline, balanced, capped near 27ch.
- **Headline** (800, clamp(1.75rem, 3vw, 2.75rem), 1.05, width 88): job page and notice headlines.
- **Title** (800, 1.3125rem): section heads on the license sheet and sidebar.
- **Wordmark** (900, 1.75rem, width 125): "ClipPass", with "Pass" in Deep Acetate.
- **Body** (400, 1.0625rem, 1.5): reading text; long lines capped at 75ch, intros at about 54ch.
- **Body Small** (400, 0.9375rem): taglines, captions, hints, episode lines.
- **Label** (700, 0.875rem): form labels and outcome tags. Fact and table heads drop to 600 at 0.8125rem in Secondary Ink.
- **Edge** (DotGothic16 400, 0.875 to 1rem, uppercase, 0.03 to 0.04em): lane names, proof hashes, the network badge, and the refusal note.

### Named Rules
**The Width Is Hierarchy Rule.** Headlines condense (width 86 to 88), the wordmark expands (125), buttons widen slightly (108). Change width and weight before reaching for size.

**The Edge Print Is Data Rule.** DotGothic16 sets codes, lanes, hashes and status, always uppercase. Each letter I is set narrower so words do not open a gap; screen readers get the plain words from a hidden copy. It never sets sentences of prose or headings.

**The Tabular Money Rule.** Prices, amounts and facts use tabular numerals.

## Layout

A single centred column, max 1320px, with 32px side padding (16px under 640px). The reel band is the exception: it breaks out to full viewport width and tilts about 3 degrees across the page, tipped back on the lightbox (230 to 370px tall depending on page and viewport).

Start page: a compact headline and one-line promise, the reel, replay link and refusal, a live chain strip, the four-node pipeline, then the script console, segmented mood radios, budget slider and checkout action. Job page: the reel band on top, a headline and a facts strip, then a two-column grid (license sheet, 380px sticky sidebar, 56px gap).

Spacing rhythm runs 8, 16, 32, 48, 56px, with 10 to 22px used for tight internal gaps. The 48px lightbox grid is the ground's rhythm, not a layout grid content snaps to.

Breakpoints: at 1200px the console becomes two columns, with script and checkout spanning both, and the job grid collapses with a non-sticky sidebar. At 640px the header stacks, the form goes single column with a full-width button, the pipeline becomes vertical, gauge rows drop a column, and the license table turns into two-column stacked rows.

## Elevation & Depth

Flat. No box shadows anywhere. Depth comes from the lightbox metaphor: the film is the only object, and it gets its depth from the WebGL scene (tilt, perspective, perforations punched through to the ground). On the DOM, structure is drawn with rules: a 2px Frame Black rule opens a block (facts, table head, claim section) and 1px Cool Rules separate rows.

### Named Rules
**The Light Is The State Rule.** On the reel, state is exposure: unexposed black, developed with one warm flash when paid, overexposed to fog with a pencil cross when refused. Artifacts fire on that event and settle; there is no constant grain or glow filter.

**The Rules Not Shadows Rule.** Separate content with Frame Black and Cool Rules; never lift it with a shadow.

## Shapes

Square corners throughout: buttons, fields, the network badge, frames and gauge bars all use 0 radius. Borders are 2px Frame Black on fields and the badge. The curves the world uses are its own materials: the round sprocket perforations on the film, and the hand-drawn grease-pencil ring (a single SVG loop at 2.4 stroke width, round caps, non-scaling stroke, overshooting along the top) around a refusal. The over-limit gauge bar is a 135-degree pencil hazard stripe (7px bands).

## Components

### Buttons
Heavy, wide and square; one action per surface.
- **Shape:** square (0).
- **Primary:** white text on Deep Acetate, 54px tall, 26px side padding, Archivo 800 at width 108.
- **Hover / Focus:** background darkens to Pressed Acetate over 0.2s on cubic-bezier(0.16, 1, 0.3, 1); active presses down 1px; focus is a 3px Deep Acetate outline offset 3px; disabled drops to 60% opacity with a progress cursor.

### Inputs / Fields
- **Style:** Field White ground, 2px Frame Black border, square, 54px minimum height, 500 weight text, Deep Acetate caret. Selects draw their own SVG chevron in Frame Black.
- **Black Leader (script field):** the script textarea is black leader: Frame Black ground, Edge-Print Yellow text and caret at 600 weight, selection inverted to yellow on black.
- **Focus:** the global 3px Deep Acetate outline, offset 2px on fields.
- **Error:** a 700-weight Grease Pencil line spanning the form.

### Navigation
The header holds the wordmark, four text links (Library, Artists, Activity, Sample reel), STELLAR TESTNET, a small acetate live dot and a sound toggle. The network badge uses Edge print inside a 2px Frame Black border. It stacks under 640px. The footer is one wrapping edge-print line: TESTNET ONLY · MOCKED MEDIA · REELS RESET ON RESTART · NOIR + VELO.

### The Reel (signature)
A three.js strip of 35mm acetate crossing the page. Frames carry the asset, artist and price; the edge print carries the lane and the transaction. Motion: an underdamped spring pull-down (stiffness 70, damping ratio 0.72) so each advance overshoots slightly and locks onto the pin; the replay advances one frame every 2.4s and holds 3.6s at the end of the loop. Develop and fog approach exponentially (rate 3.2 per second, fog at 0.8 of that); the warm flash decays at 2.4 per second, with grain stepping at 12fps only while the flash is live. It pauses off-screen and in hidden tabs. Under reduced motion it renders fully developed and parked on the refused frame. Without WebGL it falls back to a flat, horizontally scrolling acetate strip of 210px black frames (refused frames on Fog with a 3px inset Grease Pencil outline; empty frames in Unexposed Stock).

### Grease-Pencil Mark (signature)
A refused price or refusal note gets a hand-drawn Grease Pencil ring that stays. It is the DOM counterpart of the cross on the refused frame, and it is used only for refusals.

### Lane Gauge
Rows of edge-print lane name, track, price and outcome tag. The track is a 24px bar on 7% Frame Black; the bar is Acetate, Frame Black once paid, and a pencil hazard stripe when over the limit. A 2px Frame Black tick marks the card's per-payment limit.

### License Sheet and Facts
Rule-drawn tables, not cards: 2px Frame Black head rule, 1px Cool Rule rows, Secondary Ink heads at 0.8125rem, lanes and proofs in edge print, amounts tabular. The trace list uses the same rows, with the action word coloured by outcome (Deep Acetate paid, Grease Pencil refused or failed, Secondary Ink skipped).

## Do's and Don'ts

### Do:
- **Do** put the page on Lightbox Glass with the 48px Glass Grid, and keep warmth to the film.
- **Do** use Deep Acetate for every acetate-coloured text, link, button and focus ring (4.5:1 or better on the lightbox).
- **Do** mark every refusal with Grease Pencil, in text and with the pencil ring, and keep the mark visible.
- **Do** set lanes, hashes and network status in uppercase DotGothic16 through the edge-print treatment.
- **Do** build hierarchy with Archivo's width axis and weight 800 to 900.
- **Do** separate content with a 2px Frame Black rule above and 1px Cool Rules between rows.
- **Do** keep every price, refusal reason and transaction link in the DOM next to the reel, and give the reel a still state under reduced motion.

### Don't:
- **Don't** use Grease Pencil for emphasis, branding or anything that was not refused or failed.
- **Don't** put Edge-Print Yellow on the lightbox or any light ground.
- **Don't** round corners on buttons, fields, frames or bars; perforations and the pencil ring are the only curves.
- **Don't** add box shadows or wrap content in cards.
- **Don't** run film grain, flicker or glow as a constant filter; artifacts fire on a paid or refused event and settle.
- **Don't** set prose or headings in DotGothic16.


## F1 product components

- **Identity and proof:** deterministic FNV-1a 5×5 mirrored Identicons, acetate and print squares on frame black; decorative and hidden from assistive technology. Address and Hash show shortened edge print, copy with a 1.2s check, and a Testnet explorer icon. Artist names remain account links. Icons are inline SVG with 2px square-capped strokes.
- **Reel evidence:** a semantic caption retains every frame price, artist, refusal reason and receipt link alongside the decorative canvas. Keyboard focus reveals the caption so receipt links remain visible when tabbing through them.
- **CountUp:** tabular amounts interpolate bigint stroops over 450ms with exponential ease-out. The final amount uses the exact XLM formatter. Counts use whole integers. Reduced motion updates immediately.
- **ChainStrip:** three rule-separated stats: card escrow from the API, 1 XLM card limit, four artists. Refreshes no faster than 10s, with requests stopped in hidden tabs.
- **Pipeline:** four icon nodes on a single rule: 402 QUOTE, AGENT PICKS, CARD CHECK, PAID + LICENSED. An acetate square follows the line over 4s; nodes light in sequence. Runs only in view and while the tab is visible. At phone width it becomes vertical. Reduced motion leaves all nodes lit. A plain accessible sentence describes the flow.
- **Console:** black leader script with a character count and matched prefix-tag chips; empty state USING MOOD. Four native mood radios share square segments. The 2–5 XLM budget range steps by 0.1, with a square thumb and acetate fill. Start reel · 1 XLM sits above CHECKOUT BY VELO. The lane gauge stays compact below the form.
- **Job:** exact spent-of-budget meter below the facts. License rows carry Identicons, artist addresses and transaction proof tools. Agent log uses a vertical status-icon timeline, seven plan chips and Full plan disclosure, concise paid reasons, refusal ring and three-line result. AGENT WORKING pulses at the tail while running. Pending artist amounts appear above payout; claiming sweeps acetate across the list, and receipts replace each pending state.
- **Header nav:** real links in Archivo 700. The active link is Deep Acetate on a 2px rule with `aria-current="page"`. Only plain left-clicks stay in the app. Under 640px the links wrap on their own row.
- **ReelView:** the job page as a pure view of a job. It takes no sound and fetches nothing, so /sample shares it. Sound, polling and the LICENSED stamp stay in JobPage; the payout block appears only when payout props are passed, and the two balance facts only when balances are passed.
- **Failure states:** one rule-drawn row with a 2px Grease Pencil top rule, a failed icon, one line and one action. Checkout `failed`, `expired` or `cancelled` ends the reel with Start a new reel. A server that stops answering offers Retry above the reel, which stays on screen. ChainStrip shows `…` while loading and an em dash only after a failure.
- **Sample reel:** /sample replays the recorded README reel through ReelView under the line `Recorded Testnet reel. Nothing here spends.`
- **Receipt:** rule-drawn sheet at /jobs/:id/receipt and /sample/receipt: script, mood, date, budget, license table with terms, Total spent on a closing 2px rule, refusals with the pencil ring, and the mocked-media line. Save as PDF uses the browser's print sheet; print hides the header, footer, buttons and copy tools, and spells out each full transaction hash.
- **Finish:** a LICENSED edge-print stamp appears beside the headline only when a running session reaches done; finished reels do not replay this on load.

## Sound

Web Audio synthesizes the film projector and editing bench; no audio files or dependencies. Sound defaults on, with its preference saved in localStorage where available. The context is lazy and unlocks only after a pointer or key gesture. The job-page toggle gently pulses if sound is enabled but still locked. Unsupported audio and blocked storage are silent no-ops. Master gain is 0.3.

Tick is a filtered noise click for chips, radio segments and slider steps. Press is a button shutter. Advance combines a low thump and two sprocket clicks; paid adds a warm two-note chime. Refused is a low dull thud with a bandpassed pencil scratch. Done uses three rising warm notes; payout uses quick ascending ticks. Every cue lasts less than 700ms. A very quiet filtered noise hum with slow flutter runs only while the agent is running, and stops on completion, failure and unmount. Toggle off silences every cue and the hum. Reduced motion does not mute sound.

New trace decisions trigger their action cue, spaced 150ms when a poll adds several; the first poll records history silently. Test reels navigate through SPA state and pushState to preserve the unlocked context. Velo checkout retains its full navigation.

## DOM motion

The reel remains the focal moment and keeps its existing film physics. DOM motion explains state with cubic-bezier(0.16, 1, 0.3, 1), without bounce. License rows develop over 500ms with a left-to-right clip-path wipe, brightness 0.3 to 1 and a settling warm flash. Log lines enter over 200ms with a small rise. Refusal rings draw over 600ms using stroke-dashoffset and then stay. The completion stamp scales in once over 450ms. Chips pop in over 200ms. Content is visible by default without animation. Reduced-motion styles disable animations and transitions while preserving final colour, opacity and content states.
