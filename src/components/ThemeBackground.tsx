import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

/* ─── Attack on Titan: Survey Corps ──────────────────── */
function AoTBackground() {
  const WALL_Y = 710

  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMax slice">
        <defs>
          <pattern id="aot-bricks" width="72" height="36" patternUnits="userSpaceOnUse">
            <rect width="72" height="18" fill="none" stroke="rgba(120,82,55,0.26)" strokeWidth="0.9"/>
            <rect x="36" y="18" width="36" height="18" fill="none" stroke="rgba(120,82,55,0.20)" strokeWidth="0.8"/>
            <rect x="0"  y="18" width="36" height="18" fill="none" stroke="rgba(120,82,55,0.20)" strokeWidth="0.8"/>
          </pattern>
          <filter id="aot-eye-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="aot-steam" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4"/>
          </filter>
          <filter id="aot-wire-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ══ SMALL TITAN — left, only head peeks above wall ══ */}
        <ellipse cx="230" cy="676" rx="60" ry="48"
          fill="rgba(62,12,6,0.96)" stroke="rgba(100,22,8,0.35)" strokeWidth="2"/>
        {/* Pure black sockets */}
        <ellipse cx="210" cy="666" rx="20" ry="22" fill="black"/>
        <ellipse cx="250" cy="666" rx="20" ry="22" fill="black"/>
        {/* Red glow pupils */}
        <ellipse cx="210" cy="666" rx="12" ry="13" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(220,38,38,0);rgba(220,38,38,0.88);rgba(220,38,38,0.25);rgba(220,38,38,0.88);rgba(220,38,38,0)"
            dur="11s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="250" cy="666" rx="12" ry="13" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(220,38,38,0);rgba(220,38,38,0.88);rgba(220,38,38,0.25);rgba(220,38,38,0.88);rgba(220,38,38,0)"
            dur="11s" repeatCount="indefinite"/>
        </ellipse>
        {/* Mouth hint */}
        <path d="M200,694 Q230,703 260,694"
          fill="none" stroke="rgba(140,30,10,0.45)" strokeWidth="2.5" strokeLinecap="round"/>

        {/* ══ LARGE TITAN — right side, grounded to wall ══ */}

        {/* Arms */}
        <path d="M975,750 C960,698 950,634 958,578 C966,538 980,522 996,525
                 C1012,528 1020,548 1022,592 C1024,646 1016,700 1004,750 Z"
          fill="rgba(82,20,6,0.94)" stroke="rgba(155,48,16,0.42)" strokeWidth="2"/>
        <path d="M1185,750 C1200,698 1210,634 1202,578 C1194,538 1180,522 1164,525
                 C1148,528 1140,548 1138,592 C1136,646 1148,700 1160,750 Z"
          fill="rgba(82,20,6,0.94)" stroke="rgba(155,48,16,0.42)" strokeWidth="2"/>

        {/* Torso */}
        <path d="M1004,750 C994,698 990,642 994,594
                 C998,560 1016,538 1048,530 L1080,526 L1112,530
                 C1144,538 1162,560 1166,594
                 C1170,642 1166,698 1156,750 Z"
          fill="rgba(88,22,8,0.95)" stroke="rgba(162,52,18,0.45)" strokeWidth="2"/>

        {/* Neck */}
        <rect x="1063" y="566" width="54" height="76" rx="10"
          fill="rgba(95,24,9,0.97)" stroke="rgba(172,55,20,0.48)" strokeWidth="2"/>

        {/* ── HEAD ── */}
        <ellipse cx="1080" cy="465" rx="130" ry="105"
          fill="rgba(62,12,6,0.96)" stroke="rgba(110,28,12,0.40)" strokeWidth="2"/>
        {/* Brow ridge */}
        <ellipse cx="1080" cy="374" rx="124" ry="24"
          fill="rgba(48,9,4,0.98)" stroke="none"/>
        {/* Nasal cavity — removed on dark silhouette */}
        {/* Jaw — angular, squared chin */}
        <path d="M 1010,535 C 1010,527 1016,523 1024,521 L 1136,521 C 1144,523 1150,527 1150,535 L 1152,568 Q 1148,584 1130,588 L 1030,588 Q 1012,584 1008,568 Z"
          fill="rgba(55,10,5,0.97)" stroke="rgba(100,22,8,0.32)" strokeWidth="2"/>

        {/* Eye sockets — large, deep black voids */}
        <ellipse cx="1032" cy="441" rx="40" ry="30" fill="black"/>
        <ellipse cx="1128" cy="441" rx="40" ry="30" fill="black"/>
        {/* Brow overhang — dark crimson, matches head */}
        <path d="M 990,422 Q 1010,402 1032,407 Q 1056,412 1070,430 L 1067,444 Q 1050,427 1032,423 Q 1008,418 992,436 Z"
          fill="rgba(44,8,3,0.99)"/>
        <path d="M 1170,422 Q 1150,402 1128,407 Q 1104,412 1090,430 L 1093,444 Q 1110,427 1128,423 Q 1152,418 1168,436 Z"
          fill="rgba(44,8,3,0.99)"/>

        {/* Eye glow — wide outer burn */}
        <ellipse cx="1032" cy="441" rx="38" ry="28" fill="rgba(220,38,38,0)" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(180,20,20,0);rgba(180,20,20,0.38);rgba(220,38,38,0.12);rgba(180,20,20,0.38);rgba(180,20,20,0)"
            dur="5.5s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="1128" cy="441" rx="38" ry="28" fill="rgba(220,38,38,0)" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(180,20,20,0);rgba(180,20,20,0.38);rgba(220,38,38,0.12);rgba(180,20,20,0.38);rgba(180,20,20,0)"
            dur="5.5s" repeatCount="indefinite"/>
        </ellipse>
        {/* Eye core — intense red pupils */}
        <ellipse cx="1032" cy="441" rx="22" ry="16" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(220,38,38,0);rgba(220,38,38,0.95);rgba(220,38,38,0.30);rgba(220,38,38,0.95);rgba(220,38,38,0)"
            dur="5.5s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="1128" cy="441" rx="22" ry="16" filter="url(#aot-eye-glow)">
          <animate attributeName="fill"
            values="rgba(220,38,38,0);rgba(220,38,38,0.95);rgba(220,38,38,0.30);rgba(220,38,38,0.95);rgba(220,38,38,0)"
            dur="5.5s" repeatCount="indefinite"/>
        </ellipse>

        {/* Eyelids — blink, dark crimson to match silhouette */}
        <ellipse cx="1032" cy="411" rx="40" ry="0" fill="rgba(55,10,5,0.99)">
          <animate attributeName="ry"
            values="0;0;30;30;0;0" keyTimes="0;0.44;0.47;0.51;0.54;1"
            dur="11s" repeatCount="indefinite"/>
          <animate attributeName="cy"
            values="411;411;441;441;411;411" keyTimes="0;0.44;0.47;0.51;0.54;1"
            dur="11s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="1128" cy="411" rx="40" ry="0" fill="rgba(55,10,5,0.99)">
          <animate attributeName="ry"
            values="0;0;30;30;0;0" keyTimes="0;0.44;0.47;0.51;0.54;1"
            dur="11s" repeatCount="indefinite"/>
          <animate attributeName="cy"
            values="411;411;441;441;411;411" keyTimes="0;0.44;0.47;0.51;0.54;1"
            dur="11s" repeatCount="indefinite"/>
        </ellipse>

        {/* Mouth */}
        <path d="M1015,546 C1035,555 1058,561 1080,561 C1102,561 1125,555 1145,546"
          fill="none" stroke="rgba(160,40,15,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 0,0; 0,28; 0,28; 0,0" keyTimes="0;0.28;0.42;0.66;0.78"
            dur="9s" repeatCount="indefinite"/>
          <path d="M1015,550 C1040,564 1058,570 1080,570
                   C1102,570 1120,564 1145,550
                   C1145,582 1137,600 1118,610 C1100,620 1060,620 1042,610 C1023,600 1015,582 1015,550 Z"
            fill="rgba(4,1,0,0.99)" stroke="rgba(140,30,10,0.32)" strokeWidth="1.5"/>
          <path d="M1028,562 L1042,572 L1057,562 L1072,572 L1080,562 L1088,572 L1103,562 L1119,572 L1133,562"
            fill="none" stroke="rgba(180,160,140,0.30)" strokeWidth="2" strokeLinejoin="round"/>
        </g>

        {/* Muscle striations — removed (dark silhouette) */}

        {/* Steam wisps — rise from top of head */}
        {[
          { d: 'M1005,365 Q985,325 1000,287 Q1015,250 998,215',   dur: '5.2s', del: '0s',   w: 12 },
          { d: 'M1080,348 Q1068,310 1082,272 Q1096,236 1080,204', dur: '6.0s', del: '1.4s', w: 10 },
          { d: 'M1152,360 Q1172,322 1160,285',                    dur: '4.6s', del: '2.4s', w: 8  },
        ].map((s, i) => (
          <path key={i} d={s.d} fill="none"
            stroke="rgba(175,145,118,0.28)" strokeWidth={s.w} strokeLinecap="round"
            filter="url(#aot-steam)">
            <animate attributeName="opacity"
              values="0;0.55;0;0.55;0" dur={s.dur} begin={s.del} repeatCount="indefinite"/>
          </path>
        ))}

        {/* ══ Wall ══ */}
        <rect x="0" y={WALL_Y} width="1440" height={900 - WALL_Y} fill="rgba(22,15,11,0.92)"/>
        <rect x="0" y={WALL_Y} width="1440" height={900 - WALL_Y} fill="url(#aot-bricks)"/>
        <line x1="0" y1={WALL_Y} x2="1440" y2={WALL_Y}
          stroke="rgba(152,100,60,0.55)" strokeWidth="5"/>

        {/* ODM gear cables — prominent wires + soldier silhouettes */}
        {([
          { x1: -60,  y1: 860, x2: 500,  y2: 180, dur: '4.0s', del: '0s',   op: 0.48, px: 108,  py: 656 },
          { x1: 140,  y1: 900, x2: 720,  y2: 100, dur: '5.2s', del: '1.2s', op: 0.40, px: 459,  py: 460 },
          { x1: 820,  y1: 880, x2: 1320, y2: 160, dur: '3.8s', del: '2.0s', op: 0.38, px: 1170, py: 376 },
        ] as {x1:number;y1:number;x2:number;y2:number;dur:string;del:string;op:number;px:number;py:number}[]).map((c, i) => (
          <g key={i}>
            {/* Wire glow layer */}
            <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={`rgba(200,162,92,${c.op * 0.55})`} strokeWidth="8"
              strokeLinecap="round" filter="url(#aot-wire-glow)">
              <animateTransform attributeName="transform" type="translate"
                from="0,0" to="90,-45" dur={c.dur} begin={c.del} repeatCount="indefinite"/>
            </line>
            {/* Wire core — dashed cable */}
            <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={`rgba(220,180,100,${c.op})`} strokeWidth="2.5" strokeDasharray="14 5">
              <animateTransform attributeName="transform" type="translate"
                from="0,0" to="90,-45" dur={c.dur} begin={c.del} repeatCount="indefinite"/>
            </line>
            {/* Soldier — upright, slides with wire */}
            <g fill="rgba(210,170,80,0.88)" filter="url(#aot-wire-glow)">
              <animateTransform attributeName="transform" type="translate"
                values={`${c.px},${c.py}; ${c.px+90},${c.py-45}`}
                dur={c.dur} begin={c.del} repeatCount="indefinite"/>
              {/* Head */}
              <circle cx="0" cy="-18" r="5.5"/>
              {/* Body */}
              <line x1="0" y1="-12" x2="0" y2="4"
                stroke="rgba(210,170,80,0.88)" strokeWidth="3"/>
              {/* Arms spread wide */}
              <line x1="-12" y1="-6" x2="12" y2="-6"
                stroke="rgba(210,170,80,0.88)" strokeWidth="2.5"/>
              {/* Legs */}
              <line x1="0" y1="4" x2="-5" y2="15"
                stroke="rgba(210,170,80,0.88)" strokeWidth="2.5"/>
              <line x1="0" y1="4" x2="5" y2="15"
                stroke="rgba(210,170,80,0.88)" strokeWidth="2.5"/>
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ─── Black Clover: Black Bulls ───────────────────────── */
function BlackCloverBackground() {
  // Grimoire — open book, center-right stage (away from hero text)
  const GCX = 850, GCY = 465

  const runes = ['ᚠ', '✦', 'ᚨ', '⟡', 'ᚱ', '✧', 'ᛞ', '⬡']

  // Anti-magic fractures spreading from grimoire to all corners / edges
  const fractures = [
    { d: 'M615,478 L472,352 L368,228 L228,108 L62,14',     delay: '0s'   },
    { d: 'M615,478 L492,362 L402,255 L288,145',            delay: '0.5s' },
    { d: 'M615,478 L762,338 L908,205 L1092,88 L1268,12',   delay: '1.0s' },
    { d: 'M615,478 L780,348 L952,228 L1138,112',           delay: '1.5s' },
    { d: 'M615,478 L452,592 L308,702 L155,818 L18,892',    delay: '2.0s' },
    { d: 'M615,478 L475,602 L348,715 L208,828',            delay: '2.5s' },
    { d: 'M615,478 L802,605 L988,715 L1172,818 L1385,888', delay: '3.0s' },
    { d: 'M615,478 L812,615 L1018,728 L1232,842',          delay: '3.5s' },
    { d: 'M615,478 L328,472 L165,458 L12,448',             delay: '4.0s' },
    { d: 'M615,478 L928,472 L1148,458 L1418,445',          delay: '4.5s' },
  ]

  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="bc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="bc-beam" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="bc-crack" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="bc-asta-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgb(245,158,11)" stopOpacity="0.72"/>
            <stop offset="45%"  stopColor="rgb(245,158,11)" stopOpacity="0.38"/>
            <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity="0"/>
          </radialGradient>
          {/* Portrait clip — tight box around head + shoulders */}
          <clipPath id="bc-asta-portrait">
            <rect x="145" y="208" width="225" height="245"/>
          </clipPath>
        </defs>

        {/* ── Anti-magic fractures from grimoire center to all corners ── */}
        {fractures.map((f, i) => (
          <path key={i} d={f.d} fill="none"
            stroke="rgba(185,28,28,0)"
            strokeWidth={i % 2 === 0 ? 3 : 1.5}
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#bc-crack)">
            <animate attributeName="stroke"
              values={`rgba(185,28,28,0);rgba(245,158,11,${0.42 + (i % 3) * 0.08});rgba(185,28,28,0.30);rgba(185,28,28,0)`}
              dur={`${5.5 + (i % 4) * 0.8}s`} begin={f.delay} repeatCount="indefinite"/>
          </path>
        ))}

        {/* Grimoire glow — wide background pulse */}
        <ellipse cx={GCX} cy={GCY} rx="175" ry="118"
          fill="rgba(245,158,11,0.06)" filter="url(#bc-beam)">
          <animate attributeName="rx" values="160;195;160" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;1.0;0.5" dur="4s" repeatCount="indefinite"/>
        </ellipse>

        {/* ── Open Grimoire — center stage, two pages spread wide ── */}
        <g style={{ animation: 'bc-float 6s ease-in-out infinite' }}>
          {/* Left page (perspective foreshortened) */}
          <polygon
            points={`${GCX},${GCY-98} ${GCX-155},${GCY-86} ${GCX-163},${GCY+92} ${GCX},${GCY+98}`}
            fill="rgba(8,5,1,0.90)" stroke="rgba(245,158,11,0.48)" strokeWidth="2"/>
          {/* Left page ruled lines */}
          {[-58,-34,-10,14,38,62].map((dy, i) => (
            <line key={i}
              x1={GCX - 148 + Math.abs(dy) * 0.18} y1={GCY + dy}
              x2={GCX - 10} y2={GCY + dy}
              stroke="rgba(245,158,11,0.09)" strokeWidth="1"/>
          ))}
          {/* Right page */}
          <polygon
            points={`${GCX},${GCY-98} ${GCX+155},${GCY-86} ${GCX+163},${GCY+92} ${GCX},${GCY+98}`}
            fill="rgba(10,7,2,0.90)" stroke="rgba(245,158,11,0.48)" strokeWidth="2"/>
          {/* Right page ruled lines */}
          {[-58,-34,-10,14,38,62].map((dy, i) => (
            <line key={i}
              x1={GCX + 10} y1={GCY + dy}
              x2={GCX + 148 - Math.abs(dy) * 0.18} y2={GCY + dy}
              stroke="rgba(245,158,11,0.09)" strokeWidth="1"/>
          ))}
          {/* Five-leaf clover emblem on right page — proper heart-shaped petals */}
          {Array.from({ length: 5 }, (_, i) => {
            const angle = (i / 5) * 360 - 90
            return (
              <g key={i} transform={`translate(${GCX + 76}, ${GCY}) rotate(${angle})`}>
                <path
                  d="M 0,6 C 22,5 22,-22 0,-28 C -22,-22 -22,5 0,6 Z"
                  fill="rgba(245,158,11,0.22)" stroke="rgba(245,158,11,0.55)" strokeWidth="1.5"
                  filter="url(#bc-glow)"/>
              </g>
            )
          })}
          {/* Center jewel */}
          <circle cx={GCX + 76} cy={GCY} r="5"
            fill="rgba(245,158,11,0.70)" stroke="rgba(255,200,50,0.90)" strokeWidth="1.2"
            filter="url(#bc-glow)">
            <animate attributeName="r"       values="4;8;4"     dur="2.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;1.0;0.5" dur="2.8s" repeatCount="indefinite"/>
          </circle>
          {/* Spine */}
          <line x1={GCX} y1={GCY - 100} x2={GCX} y2={GCY + 100}
            stroke="rgba(245,158,11,0.55)" strokeWidth="3.5" strokeLinecap="round"/>
          {/* Page interior glow */}
          <ellipse cx={GCX} cy={GCY} rx="160" ry="94" fill="rgba(245,158,11,0)">
            <animate attributeName="fill"
              values="rgba(245,158,11,0);rgba(245,158,11,0.06);rgba(255,200,60,0.09);rgba(245,158,11,0.04);rgba(245,158,11,0)"
              dur="3.5s" repeatCount="indefinite"/>
          </ellipse>
        </g>

        {/* Light beams radiating from grimoire */}
        {[
          { angle: -58, len: 310, w: 20 },
          { angle: -22, len: 355, w: 15 },
          { angle:  18, len: 290, w: 22 },
          { angle:  52, len: 330, w: 17 },
          { angle: -118, len: 270, w: 15 },
          { angle:  158, len: 295, w: 17 },
        ].map((beam, i) => {
          const rad = (beam.angle * Math.PI) / 180
          return (
            <line key={i}
              x1={GCX} y1={GCY}
              x2={GCX + Math.cos(rad) * beam.len}
              y2={GCY + Math.sin(rad) * beam.len}
              stroke="rgba(245,158,11,0)" strokeWidth={beam.w} strokeLinecap="round"
              filter="url(#bc-beam)">
              <animate attributeName="stroke"
                values="rgba(245,158,11,0);rgba(255,200,60,0.36);rgba(245,158,11,0)"
                dur="3.5s" begin={`${i * 0.22}s`} repeatCount="indefinite"/>
            </line>
          )
        })}

        {/* ── Large Black Bulls skull — bottom left ── */}
        <g transform="translate(105, 778)" filter="url(#bc-glow)">
          <ellipse cx="0" cy="-8" rx="72" ry="76"
            fill="rgba(12,8,1,0.70)" stroke="rgba(245,158,11,0.48)" strokeWidth="2.5">
            <animate attributeName="opacity" values="0.62;0.90;0.62" dur="6s" repeatCount="indefinite"/>
          </ellipse>
          <path d="M-68,-28 Q0,-62 68,-28" fill="none" stroke="rgba(245,158,11,0.32)" strokeWidth="2"/>
          <ellipse cx="-26" cy="-16" rx="20" ry="24" fill="rgba(4,2,0,0.92)"/>
          <ellipse cx="-26" cy="-16" rx="9" ry="11" fill="rgba(245,158,11,0.24)" filter="url(#bc-glow)">
            <animate attributeName="opacity" values="0.2;0.85;0.2" dur="4s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="26" cy="-16" rx="20" ry="24" fill="rgba(4,2,0,0.92)"/>
          <ellipse cx="26" cy="-16" rx="9" ry="11" fill="rgba(245,158,11,0.24)" filter="url(#bc-glow)">
            <animate attributeName="opacity" values="0.2;0.85;0.2" dur="4s" begin="0.5s" repeatCount="indefinite"/>
          </ellipse>
          <path d="M-8,16 L0,26 L8,16" fill="rgba(4,2,0,0.80)" stroke="none"/>
          <path d="M-62,34 Q0,66 62,34 L62,58 Q0,88 -62,58 Z"
            fill="rgba(10,6,1,0.65)" stroke="rgba(245,158,11,0.35)" strokeWidth="1.5"/>
          {[-38,-19,0,19,38].map((x, ti) => (
            <rect key={ti} x={x - 7} y="38" width="12" height={20 - Math.abs(x) * 0.15}
              rx="2" fill="rgba(220,180,80,0.52)" stroke="rgba(245,158,11,0.32)" strokeWidth="1"/>
          ))}
          <path d="M-12,-64 L-20,-32 L-10,-30 L-16,-6" fill="none" stroke="rgba(245,158,11,0.28)" strokeWidth="1.5"/>
          <path d="M22,-62 L30,-30 L22,-28 L26,-4"  fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="1.2"/>
        </g>

        {/* ── Asta's Anti-Magic Broadsword — right side, tall, near-vertical ── */}
        <g transform="translate(1282, 448) rotate(6)">
          {/* Blade aura */}
          <rect x="-24" y="-430" width="48" height="560" rx="8"
            fill="none" stroke="rgba(245,158,11,0.13)" strokeWidth="34"
            filter="url(#bc-beam)">
            <animate attributeName="opacity" values="0.28;0.72;0.28" dur="3.5s" repeatCount="indefinite"/>
          </rect>
          {/* Blade body */}
          <polygon points="0,-445 -15,-385 -15,108 15,108 15,-385"
            fill="rgba(12,8,0,0.94)" stroke="rgba(245,158,11,0.52)" strokeWidth="1.8"/>
          {/* Blade tip */}
          <polygon points="0,-445 -15,-385 15,-385"
            fill="rgba(12,8,0,0.94)" stroke="rgba(245,158,11,0.52)" strokeWidth="1.8"/>
          {/* Crossguard */}
          <rect x="-55" y="100" width="110" height="18" rx="5"
            fill="rgba(180,130,30,0.82)" stroke="rgba(245,158,11,0.62)" strokeWidth="2"/>
          {/* Grip */}
          <rect x="-12" y="118" width="24" height="85" rx="4"
            fill="rgba(70,45,12,0.88)" stroke="rgba(180,130,30,0.50)" strokeWidth="1.5"/>
          {/* Pommel */}
          <ellipse cx="0" cy="214" rx="18" ry="13"
            fill="rgba(180,130,30,0.82)" stroke="rgba(245,158,11,0.62)" strokeWidth="1.5"/>
          {/* Anti-magic veins on blade */}
          <path d="M-5,-400 Q7,-330 -5,-255 Q7,-182 -5,-108 Q7,-38 -4,55" fill="none"
            stroke="rgba(185,28,28,0)" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="stroke"
              values="rgba(185,28,28,0);rgba(185,28,28,0.78);rgba(0,0,0,0.52);rgba(185,28,28,0)"
              dur="2.8s" repeatCount="indefinite"/>
          </path>
        </g>

        {/* ── Asta — proper silhouette, Gon-proportioned body + sword + wild hair ── */}
        <g transform="translate(240, 408) scale(0.48)">
          {/* Backlight glow */}
          <ellipse cx="0" cy="-60" rx="210" ry="340" fill="url(#bc-asta-halo)">
            <animate attributeName="opacity" values="0.82;1.0;0.82" dur="3.5s" repeatCount="indefinite"/>
          </ellipse>

          <g opacity="0.70">
            {/* SWORD — large anti-magic blade from shoulder height up-left to tip */}
            <path d="M-58,-94 L-192,-272 Q-174,-294 -152,-286 Q-132,-278 -128,-256 L-36,-78 Z"
              fill="rgb(6,4,2)"/>

            {/* HEAD + HAIR — one closed path: chin at y≈-132, hair tips at y≈-326 */}
            <path d="M 0,-132
                     Q 55,-148 57,-196
                     Q 58,-232 50,-258
                     L 74,-282 L 86,-314 L 62,-282
                     L 50,-320 L 26,-284
                     L 10,-328
                     L -6,-286 L -28,-318
                     L -52,-280 L -72,-310 L -84,-270
                     Q -60,-248 -57,-196
                     Q -55,-148 0,-132 Z"
              fill="rgb(6,4,2)"/>

            {/* NECK */}
            <rect x="-13" y="-154" width="28" height="28" rx="4" fill="rgb(6,4,2)"/>

            {/* SHIRT — torso, matches Gon proportions */}
            <path d="M-58,-122 L60,-122 L62,20 L-60,20 Z" fill="rgb(6,4,2)"/>

            {/* CAPE — behind body, flares wide toward bottom */}
            <path d="M-58,-55 Q-140,55 -124,232 Q-78,266 0,262 Q 68,256 74,230 Q 86,52 58,-55 Z"
              fill="rgb(6,4,2)"/>

            {/* SHORTS */}
            <path d="M-60,18 L62,18 L70,114 L-70,114 Z" fill="rgb(6,4,2)"/>

            {/* LEFT ARM — raised toward sword grip */}
            <path d="M-56,-96 Q-76,-82 -84,-52 Q-90,-22 -80,10"
              fill="none" stroke="rgb(6,4,2)" strokeWidth="30" strokeLinecap="round"/>

            {/* RIGHT ARM — hangs at side, slight forward swing */}
            <path d="M56,-96 Q90,-42 108,42 Q112,82 104,108"
              fill="none" stroke="rgb(6,4,2)" strokeWidth="26" strokeLinecap="round"/>

            {/* LEGS — matching Gon leg style */}
            <path d="M10,110 L52,110 Q88,192 102,268 Q106,294 100,320 L68,320 Q60,294 44,262 Q22,180 4,110 Z"
              fill="rgb(6,4,2)"/>
            <path d="M-52,110 L-12,110 Q-12,188 -30,256 Q-42,294 -56,320 L-88,320 Q-80,288 -70,252 Q-62,178 -68,110 Z"
              fill="rgb(6,4,2)"/>
          </g>

          {/* Anti-magic particles */}
          {([
            {cx:-90,cy:60,r:4},{cx:80,cy:54,r:3.5},
          ] as {cx:number;cy:number;r:number}[]).map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r}
              fill="rgba(245,158,11,0.70)" filter="url(#bc-glow)">
              <animate attributeName="opacity"
                values="0;0.85;0" dur={`${2.8 + i * 0.5}s`} begin={`${i * 0.55}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </g>
        {[
          { x: 82,  y: 62,  s: 22, r: -15, delay: '0s'   },
          { x: 345, y: 142, s: 16, r:   8, delay: '1.2s' },
          { x: 852, y: 78,  s: 18, r: -6,  delay: '2.4s' },
          { x: 1185,y: 152, s: 14, r:  12, delay: '0.8s' },
          { x: 92,  y: 728, s: 18, r: -18, delay: '3.2s' },
          { x: 425, y: 828, s: 14, r:   5, delay: '1.8s' },
          { x: 885, y: 772, s: 16, r:  -8, delay: '4.0s' },
          { x: 1125,y: 818, s: 12, r:  14, delay: '2.8s' },
        ].map((ru, i) => (
          <text key={i} x={ru.x} y={ru.y} fontSize={ru.s} textAnchor="middle"
            fill="rgba(245,158,11,0)"
            style={{ fontFamily: 'serif' }}
            transform={`rotate(${ru.r},${ru.x},${ru.y})`}>
            {runes[i % runes.length]}
            <animate attributeName="fill"
              values="rgba(245,158,11,0);rgba(255,210,80,0.70);rgba(245,158,11,0)"
              dur={`${4.5 + i * 0.55}s`} begin={ru.delay} repeatCount="indefinite"/>
          </text>
        ))}

        {/* Grimoire title */}
        <text x={GCX} y={GCY - 110} textAnchor="middle" fontSize="11"
          fill="rgba(245,158,11,0.35)"
          style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.24em' }}>
          GRIMOIRE OF DESPAIR
        </text>
      </svg>
    </div>
  )
}

/* ─── Demon Slayer: Water Breathing ───────────────────── */
function DemonSlayerBackground() {
  const drops = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11
    return { x: -60 + t * 1360, y: 700 - t * 600 + Math.sin(t * Math.PI * 2.2) * 50, r: 3 + (i % 3), delay: i * 0.38 }
  })

  const HANA_CX = 1240, HANA_CY = 200, HANA_R = 60, SEGS = 12
  const hanaSegs = Array.from({ length: SEGS }, (_, i) => {
    const a1 = (i / SEGS) * Math.PI * 2 - Math.PI / 2
    const a2 = ((i + 1) / SEGS) * Math.PI * 2 - Math.PI / 2
    const x1 = HANA_CX + Math.cos(a1) * HANA_R, y1 = HANA_CY + Math.sin(a1) * HANA_R
    const x2 = HANA_CX + Math.cos(a2) * HANA_R, y2 = HANA_CY + Math.sin(a2) * HANA_R
    return { path: `M${HANA_CX},${HANA_CY} L${x1},${y1} A${HANA_R},${HANA_R} 0 0,1 ${x2},${y2} Z`, isRed: i % 2 === 0 }
  })

  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="ds-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ds-soft"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="ds-wide-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16"/>
          </filter>
          <filter id="ds-fabric" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.058" numOctaves="4" seed="9" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="11" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          {/* Tanjiro haori — forest-green and Nezuko-pink ichimatsu with woven cloth texture */}
          <pattern id="ds-ichimatsu" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            {/* Transparent base */}
            <rect width="32" height="32" fill="none"/>
            {/* Forest-green squares — Tanjiro color (top-left, bottom-right) */}
            <rect x="0"  y="0"  width="16" height="16" fill="rgba(18,108,50,0.12)"/>
            <rect x="16" y="16" width="16" height="16" fill="rgba(18,108,50,0.12)"/>
            {/* Pink/rose squares — Nezuko color (top-right, bottom-left) */}
            <rect x="16" y="0"  width="16" height="16" fill="rgba(219,39,119,0.12)"/>
            <rect x="0"  y="16" width="16" height="16" fill="rgba(219,39,119,0.12)"/>
          </pattern>
        </defs>

        {/* Ichimatsu base coat — clean green + pink checker */}
        <rect width="1440" height="900" fill="url(#ds-ichimatsu)"/>
        {/* Cloth wrinkle layer — displaced copy gives woven textile depth */}
        <rect width="1440" height="900" fill="url(#ds-ichimatsu)" filter="url(#ds-fabric)" opacity="0.35"/>

        {/* ── Water Breathing slash — First Form: Water Surface Slash ── */}
        {/* Wide luminous glow layer */}
        <path d="M-100,780 C200,610 500,310 840,130 C1000,55 1160,42 1270,160"
          fill="none" stroke="rgba(14,165,233,0.45)" strokeWidth="55" strokeLinecap="round"
          filter="url(#ds-wide-glow)">
          <animate attributeName="opacity"
            values="0;1.0;1.0;0" keyTimes="0;0.06;0.90;1" dur="5s" repeatCount="indefinite"/>
        </path>
        {/* Core bright line */}
        <path d="M-100,780 C200,610 500,310 840,130 C1000,55 1160,42 1270,160"
          fill="none" stroke="rgba(56,189,248,1.0)" strokeWidth="5" strokeLinecap="round"
          filter="url(#ds-soft)">
          <animate attributeName="stroke-dasharray"
            values="0 2700;2300 400;0 2700" dur="5s" repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0;1.0;1.0;0" keyTimes="0;0.05;0.92;1" dur="5s" repeatCount="indefinite"/>
        </path>

        {/* ── Water Breathing — Second Form: Water Wheel ── */}
        <path d="M1540,760 C1210,572 890,328 548,148 C390,68 228,60 88,192"
          fill="none" stroke="rgba(56,189,248,0.92)" strokeWidth="4.5" strokeLinecap="round"
          filter="url(#ds-soft)">
          <animate attributeName="stroke-dasharray"
            values="0 2700;2100 600;0 2700" dur="6.2s" begin="2.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0;1.0;1.0;0" keyTimes="0;0.08;0.92;1" dur="6.2s" begin="2.5s" repeatCount="indefinite"/>
        </path>

        {/* ── Water Breathing — Whirlpool spiral ── */}
        <path d="M740,700 C840,592 900,488 858,382 C818,278 716,238 634,298
                 C552,358 552,462 612,522 C672,582 754,572 796,520"
          fill="none" stroke="rgba(56,189,248,0.88)" strokeWidth="3.5" strokeLinecap="round"
          filter="url(#ds-soft)">
          <animate attributeName="stroke-dasharray"
            values="0 1300;1050 250;0 1300" dur="7s" begin="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0;0.95;0.95;0" keyTimes="0;0.10;0.88;1" dur="7s" begin="1s" repeatCount="indefinite"/>
        </path>

        {/* Water droplets */}
        {drops.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r}
            fill="rgba(56,189,248,0.95)" filter="url(#ds-glow)">
            <animate attributeName="opacity"
              values="0;1.0;0" dur="5s" begin={`${d.delay}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* ── Hanafuda earring motif — upper right ── */}
        <circle cx={HANA_CX} cy={HANA_CY} r={HANA_R + 10} fill="none"
          stroke="rgba(220,38,38,0.55)" strokeWidth="3"/>
        {hanaSegs.map((s, i) => (
          <path key={i} d={s.path}
            fill={s.isRed ? 'rgba(220,38,38,0.65)' : 'rgba(245,230,200,0.35)'}
            stroke="rgba(180,30,20,0.65)" strokeWidth="1"/>
        ))}
        <circle cx={HANA_CX} cy={HANA_CY} r={18}
          fill="rgba(245,230,200,0.38)" stroke="rgba(220,38,38,0.70)" strokeWidth="2"/>
        <circle cx={HANA_CX} cy={HANA_CY} r={6}
          fill="rgba(220,38,38,0.90)" filter="url(#ds-glow)">
          <animate attributeName="opacity" values="0.6;1.0;0.6" dur="3s" repeatCount="indefinite"/>
        </circle>

        {/* ── Sun Breathing flame arcs — lower right ── */}
        {[
          { r: 160, aS: -0.95, aE: -0.08, col: 'rgba(251,146,60,',   delay: '0s'   },
          { r: 215, aS: -0.88, aE: -0.04, col: 'rgba(239,68,68,',    delay: '0.8s' },
          { r: 120, aS: -1.05, aE:  0.02, col: 'rgba(253,186,116,',  delay: '1.6s' },
        ].map((f, i) => {
          const cx = 1340, cy = 820
          const x1 = cx + Math.cos(f.aS * Math.PI) * f.r
          const y1 = cy + Math.sin(f.aS * Math.PI) * f.r
          const x2 = cx + Math.cos(f.aE * Math.PI) * f.r
          const y2 = cy + Math.sin(f.aE * Math.PI) * f.r
          return (
            <path key={i}
              d={`M${cx},${cy} L${x1},${y1} A${f.r},${f.r} 0 0,1 ${x2},${y2} Z`}
              fill={`${f.col}0.18)`} stroke={`${f.col}0.85)`} strokeWidth="2.5">
              <animate attributeName="opacity"
                values="0;0.90;0.55;0.90;0" dur={`${4.5 + i * 0.9}s`} begin={f.delay}
                repeatCount="indefinite"/>
            </path>
          )
        })}

        {/* Nezuko accent glow */}
        <circle cx="160" cy="790" r="130" fill="rgba(219,39,119,0.06)" filter="url(#ds-glow)">
          <animate attributeName="r" values="120;148;120" dur="5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  )
}

/* ─── Jujutsu Kaisen ──────────────────────────────────── */
function JJKBackground() {
  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="jjk-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="jjk-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="22"/>
          </filter>
          <filter id="jjk-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>

        {/* ══ GOJO DOMAIN — Infinite Void backdrop (right half) ══ */}
        <ellipse cx="1065" cy="590" rx="420" ry="460"
          fill="rgba(22,14,48,0.22)" filter="url(#jjk-blur)">
          <animate attributeName="opacity" values="0.45;0.75;0.45" dur="7s" repeatCount="indefinite"/>
        </ellipse>
        {/* Infinity concentric rings */}
        {[195, 265, 335, 405].map((r, i) => (
          <circle key={i} cx="1065" cy="450" r={r}
            fill="none" stroke={`rgba(129,140,248,${0.16 - i * 0.025})`} strokeWidth={2.2 - i * 0.35}>
            <animate attributeName="opacity"
              values="0.35;0.80;0.35" dur={`${7 + i * 0.9}s`} begin={`${i * 0.7}s`} repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 1065 450`} to={`${i % 2 === 0 ? 360 : -360} 1065 450`}
              dur={`${28 + i * 6}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* ══ GOJO SATORU — proportional, right edge ══ */}
        <g transform="translate(1330, 650) scale(0.52)" filter="url(#jjk-glow)">
          {/* Aura glow */}
          <ellipse cx="0" cy="-20" rx="105" ry="330"
            fill="rgba(99,102,241,0.07)" filter="url(#jjk-blur)">
            <animate attributeName="opacity" values="0.35;0.75;0.35" dur="5s" repeatCount="indefinite"/>
          </ellipse>

          {/* White spiky hair */}
          <polygon points="-18,-352 -40,-430 -10,-358" fill="rgba(238,238,255,0.92)" stroke="rgba(165,180,252,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="-5,-356 -12,-448 12,-358"   fill="rgba(242,242,255,0.95)" stroke="rgba(165,180,252,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="5,-356 22,-446 28,-350"     fill="rgba(238,238,255,0.92)" stroke="rgba(165,180,252,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="26,-344 54,-420 47,-340"    fill="rgba(238,238,255,0.88)" stroke="rgba(165,180,252,0.50)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="-32,-340 -60,-410 -44,-335" fill="rgba(238,238,255,0.88)" stroke="rgba(165,180,252,0.50)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="40,-328 70,-390 58,-322"    fill="rgba(238,238,255,0.82)" stroke="rgba(165,180,252,0.45)" strokeWidth="1.5" strokeLinejoin="round"/>
          <polygon points="-50,-315 -78,-375 -62,-308" fill="rgba(238,238,255,0.82)" stroke="rgba(165,180,252,0.45)" strokeWidth="1.5" strokeLinejoin="round"/>
          {/* Hair base */}
          <path d="M-72,-290 Q-80,-335 -55,-352 Q-30,-368 0,-370 Q30,-368 55,-352 Q80,-335 72,-290 Q55,-270 0,-262 Q-55,-270 -72,-290 Z"
            fill="rgba(238,238,255,0.90)" stroke="rgba(165,180,252,0.52)" strokeWidth="1.8"/>

          {/* Head / face */}
          <path d="M-42,-290 Q-52,-264 -50,-234 Q-48,-206 -38,-194 Q-22,-182 0,-179 Q22,-182 38,-194 Q48,-206 50,-234 Q52,-264 42,-290 Q22,-300 0,-303 Q-22,-300 -42,-290 Z"
            fill="rgba(245,238,222,0.84)" stroke="rgba(165,180,252,0.38)" strokeWidth="1.5"/>

          {/* Blindfold — wide white strip, slightly angled */}
          <rect x="-50" y="-254" width="100" height="22" rx="3"
            fill="rgba(238,238,255,0.94)" stroke="rgba(165,180,252,0.35)" strokeWidth="1">
            <animate attributeName="opacity" values="0.80;1.0;0.80" dur="3.5s" repeatCount="indefinite"/>
          </rect>
          {/* Six Eyes — two blazing orbs burning through the blindfold */}
          <ellipse cx="-20" cy="-243" rx="20" ry="10"
            fill="rgba(165,180,252,0.80)" filter="url(#jjk-glow)">
            <animate attributeName="opacity" values="0.45;1.0;0.45" dur="3.5s" repeatCount="indefinite"/>
            <animate attributeName="rx" values="16;26;16" dur="3.5s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="20" cy="-243" rx="20" ry="10"
            fill="rgba(165,180,252,0.80)" filter="url(#jjk-glow)">
            <animate attributeName="opacity" values="0.45;1.0;0.45" dur="3.5s" begin="0.35s" repeatCount="indefinite"/>
            <animate attributeName="rx" values="16;26;16" dur="3.5s" begin="0.35s" repeatCount="indefinite"/>
          </ellipse>

          {/* Neck */}
          <rect x="-13" y="-179" width="26" height="26" rx="6" fill="rgba(245,238,222,0.78)" stroke="rgba(165,180,252,0.30)" strokeWidth="1.2"/>

          {/* Body — Jujutsu High black uniform */}
          <path d="M-52,-155 Q-68,-124 -72,-64 Q-75,-5 -70,54 Q-65,112 -60,156 Q-42,176 -22,183 Q-8,186 0,186 Q8,186 22,183 Q42,176 60,156 Q65,112 70,54 Q75,-5 72,-64 Q68,-124 52,-155 Q30,-168 0,-172 Q-30,-168 -52,-155 Z"
            fill="rgba(38,30,82,0.97)" stroke="rgba(129,140,248,0.45)" strokeWidth="2"/>
          {/* Collar */}
          <path d="M-18,-155 L-8,-140 L0,-136 L8,-140 L18,-155"
            fill="none" stroke="rgba(215,205,235,0.55)" strokeWidth="2" strokeLinecap="round"/>
          {/* Shirt buttons down center */}
          {[-118, -88, -58, -28, 2, 32].map((y, i) => (
            <circle key={i} cx="0" cy={y} r="3.5"
              fill="rgba(165,180,252,0.65)" stroke="rgba(200,210,255,0.50)" strokeWidth="1"/>
          ))}

          {/* Left arm */}
          <path d="M-52,-155 Q-82,-124 -98,-72 Q-112,-20 -108,34 Q-104,68 -96,92"
            fill="none" stroke="rgba(38,30,82,0.97)" strokeWidth="26" strokeLinecap="round"/>
          <path d="M-52,-155 Q-82,-124 -98,-72 Q-112,-20 -108,34 Q-104,68 -96,92"
            fill="none" stroke="rgba(129,140,248,0.35)" strokeWidth="2" strokeLinecap="round"/>
          {/* Left fist */}
          <rect x="-115" y="90" width="38" height="28" rx="8"
            fill="rgba(245,238,222,0.90)" stroke="rgba(129,140,248,0.35)" strokeWidth="1.5"/>
          <line x1="-108" y1="90" x2="-108" y2="98" stroke="rgba(180,160,130,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="-97"  y1="90" x2="-97"  y2="99" stroke="rgba(180,160,130,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="-86"  y1="90" x2="-86"  y2="98" stroke="rgba(180,160,130,0.55)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* Right arm — slightly raised (Infinity pose) */}
          <path d="M52,-155 Q82,-124 98,-72 Q112,-12 106,44 Q100,78 92,102"
            fill="none" stroke="rgba(38,30,82,0.97)" strokeWidth="26" strokeLinecap="round"/>
          <path d="M52,-155 Q82,-124 98,-72 Q112,-12 106,44 Q100,78 92,102"
            fill="none" stroke="rgba(129,140,248,0.35)" strokeWidth="2" strokeLinecap="round"/>
          {/* Right fist + Infinity orb */}
          <rect x="76" y="100" width="38" height="28" rx="8"
            fill="rgba(245,238,222,0.82)" stroke="rgba(129,140,248,0.18)" strokeWidth="1.5"/>
          <line x1="83"  y1="100" x2="83"  y2="108" stroke="rgba(180,160,130,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="94"  y1="100" x2="94"  y2="109" stroke="rgba(180,160,130,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="105" y1="100" x2="105" y2="108" stroke="rgba(180,160,130,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="90" cy="124" r="18"
            fill="rgba(129,140,248,0.18)" stroke="rgba(165,180,252,0.55)" strokeWidth="2"
            filter="url(#jjk-glow)">
            <animate attributeName="r"       values="14;22;14" dur="3.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.45;1.0;0.45" dur="3.2s" repeatCount="indefinite"/>
          </circle>

          {/* Legs */}
          <path d="M-26,183 Q-28,252 -26,318 Q-24,368 -22,412"
            fill="none" stroke="rgba(38,30,82,0.97)" strokeWidth="24" strokeLinecap="round"/>
          <path d="M26,183 Q28,252 26,318 Q24,368 22,412"
            fill="none" stroke="rgba(38,30,82,0.97)" strokeWidth="24" strokeLinecap="round"/>
        </g>

        {/* ══ SUKUNA CURSE MARK — main focal (left-center) ══ */}
        <g transform="translate(335, 438)" filter="url(#jjk-glow)">
          {/* Cursed aura behind mark */}
          <ellipse cx="0" cy="0" rx="172" ry="195" fill="rgba(99,102,241,0.06)" filter="url(#jjk-blur)">
            <animate attributeName="opacity" values="0.40;0.90;0.40" dur="5s" repeatCount="indefinite"/>
          </ellipse>

          {/* Central spine */}
          <line x1="0" y1="-168" x2="0" y2="168"
            stroke="rgba(165,180,252,0.84)" strokeWidth="5.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.55;0.95;0.55" dur="5s" repeatCount="indefinite"/>
          </line>

          {/* Upper crossbar + tick marks */}
          <line x1="-92" y1="-108" x2="92" y2="-108" stroke="rgba(165,180,252,0.72)" strokeWidth="4" strokeLinecap="round"/>
          <line x1="-68" y1="-122" x2="-68" y2="-94" stroke="rgba(165,180,252,0.55)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-24" y1="-118" x2="-24" y2="-98" stroke="rgba(165,180,252,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24"  y1="-118" x2="24"  y2="-98" stroke="rgba(165,180,252,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="68"  y1="-122" x2="68"  y2="-94" stroke="rgba(165,180,252,0.55)" strokeWidth="3" strokeLinecap="round"/>

          {/* Mid crossbars */}
          <line x1="-75" y1="-38" x2="75" y2="-38" stroke="rgba(165,180,252,0.65)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-58" y1="28"  x2="58" y2="28"  stroke="rgba(165,180,252,0.60)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-25" y1="-38" x2="-25" y2="-24" stroke="rgba(165,180,252,0.40)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="25"  y1="-38" x2="25"  y2="-24" stroke="rgba(165,180,252,0.40)" strokeWidth="2" strokeLinecap="round"/>

          {/* Lower crossbar + ticks */}
          <line x1="-82" y1="102" x2="82" y2="102" stroke="rgba(165,180,252,0.65)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-60" y1="89"  x2="-60" y2="115" stroke="rgba(165,180,252,0.48)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="0"   y1="91"  x2="0"  y2="113"  stroke="rgba(165,180,252,0.40)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="60"  y1="89"  x2="60"  y2="115" stroke="rgba(165,180,252,0.48)" strokeWidth="2.5" strokeLinecap="round"/>

          {/* Top triple fork */}
          <path d="M0,-168 L-52,-222" stroke="rgba(165,180,252,0.68)" strokeWidth="4" strokeLinecap="round"/>
          <path d="M0,-168 L52,-222"  stroke="rgba(165,180,252,0.68)" strokeWidth="4" strokeLinecap="round"/>
          <path d="M0,-168 L0,-235"   stroke="rgba(165,180,252,0.76)" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="-78" y1="-228" x2="-28" y2="-228" stroke="rgba(165,180,252,0.52)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="28"  y1="-228" x2="78"  y2="-228" stroke="rgba(165,180,252,0.52)" strokeWidth="3" strokeLinecap="round"/>

          {/* Bottom spread */}
          <path d="M0,168 L-62,218" stroke="rgba(165,180,252,0.58)" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M0,168 L62,218"  stroke="rgba(165,180,252,0.58)" strokeWidth="3.5" strokeLinecap="round"/>

          {/* Side radiating lines from upper crossbar */}
          <line x1="-92" y1="-108" x2="-142" y2="-155" stroke="rgba(165,180,252,0.42)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-142" y1="-155" x2="-162" y2="-164" stroke="rgba(165,180,252,0.28)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="92"  y1="-108" x2="142"  y2="-155" stroke="rgba(165,180,252,0.42)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="142" y1="-155" x2="162"  y2="-164" stroke="rgba(165,180,252,0.28)" strokeWidth="2" strokeLinecap="round"/>

          {/* Sukuna eye dots — pair above mid crossbar */}
          <circle cx="-44" cy="-75" r="6.5" fill="rgba(165,180,252,0.78)" filter="url(#jjk-glow)">
            <animate attributeName="opacity" values="0.52;1.0;0.52" dur="4s" repeatCount="indefinite"/>
          </circle>
          <circle cx="44"  cy="-75" r="6.5" fill="rgba(165,180,252,0.78)" filter="url(#jjk-glow)">
            <animate attributeName="opacity" values="0.52;1.0;0.52" dur="4s" begin="0.45s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* Secondary Sukuna mark — upper-left (diagonal slash style) */}
        <g transform="translate(142, 178)" opacity="0.65">
          <line x1="-58" y1="-68" x2="58" y2="68"
            stroke="rgba(165,180,252,0.65)" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="opacity" values="0.42;0.85;0.42" dur="7s" begin="1.2s" repeatCount="indefinite"/>
          </line>
          <line x1="-40" y1="-54" x2="-22" y2="-72" stroke="rgba(165,180,252,0.50)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-12" y1="-18" x2="6"   y2="-36" stroke="rgba(165,180,252,0.44)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="12"  y1="18"  x2="30"  y2="2"   stroke="rgba(165,180,252,0.44)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="40"  y1="54"  x2="60"  y2="36"  stroke="rgba(165,180,252,0.50)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-44" y1="-40" x2="44" y2="84"   stroke="rgba(165,180,252,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="-18" cy="-22" r="4.5" fill="rgba(165,180,252,0.62)"/>
          <circle cx="18"  cy="22"  r="4.5" fill="rgba(165,180,252,0.62)"/>
        </g>

        {/* Tertiary Sukuna mark — lower-left (vertical with ticks) */}
        <g transform="translate(188, 726)" opacity="0.55">
          <line x1="0" y1="-72" x2="0" y2="72"
            stroke="rgba(165,180,252,0.58)" strokeWidth="3.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.38;0.78;0.38" dur="8s" begin="3s" repeatCount="indefinite"/>
          </line>
          <line x1="-40" y1="-30" x2="40" y2="-30" stroke="rgba(165,180,252,0.48)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="-30" y1="14"  x2="30" y2="14"  stroke="rgba(165,180,252,0.42)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="-30" y1="-42" x2="-30" y2="-18" stroke="rgba(165,180,252,0.36)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="30"  y1="-42" x2="30"  y2="-18" stroke="rgba(165,180,252,0.36)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M0,72 L-30,98 M0,72 L30,98" stroke="rgba(165,180,252,0.44)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="0" cy="-8" r="4" fill="rgba(165,180,252,0.55)"/>
        </g>

        {/* ══ Hollow Purple orb — Gojo's technique ══ */}
        <circle cx="648" cy="215" r="55"
          fill="rgba(99,102,241,0.12)" filter="url(#jjk-blur)">
          <animate attributeName="r"       values="46;64;46" dur="5.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.45;0.90;0.45" dur="5.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="648" cy="215" r="26"
          fill="rgba(139,92,246,0.30)" stroke="rgba(165,180,252,0.52)" strokeWidth="2"
          filter="url(#jjk-glow)">
          <animate attributeName="opacity" values="0.28;0.85;0.28" dur="5.5s" begin="0.6s" repeatCount="indefinite"/>
        </circle>

        {/* ══ Cursed energy wisps ══ */}
        {[
          { d: 'M52,185 Q145,148 228,172 Q312,196 358,152',  delay: '0s'   },
          { d: 'M85,648 Q172,612 258,636 Q342,658 398,618',  delay: '2.2s' },
          { d: 'M622,682 Q705,648 785,665 Q862,682 900,648', delay: '4.0s' },
        ].map((w, i) => (
          <path key={i} d={w.d} fill="none"
            stroke="rgba(99,102,241,0)" strokeWidth="3" strokeLinecap="round"
            filter="url(#jjk-glow)">
            <animate attributeName="stroke"
              values="rgba(99,102,241,0);rgba(129,140,248,0.55);rgba(99,102,241,0.28);rgba(99,102,241,0)"
              dur={`${5.5 + i * 1.2}s`} begin={w.delay} repeatCount="indefinite"/>
          </path>
        ))}

        {/* ══ Ofuda talismans (vertical kanji strips) ══ */}
        {([
          { x: 90,  y: 328, rotate: -8,  chars: ['呪', '縛', '術'], delay: '0s'   },
          { x: 578, y: 695, rotate:  6,  chars: ['無', '量', '空'], delay: '3.2s' },
        ] as const).map((tali, i) => (
          <g key={i} transform={`translate(${tali.x}, ${tali.y}) rotate(${tali.rotate})`}>
            {tali.chars.map((char, j) => (
              <text key={j} x="0" y={j * 26 + 14} textAnchor="middle" fontSize="16"
                fill="rgba(165,180,252,0)"
                style={{ fontFamily: 'serif' }}>
                {char}
                <animate attributeName="fill"
                  values="rgba(165,180,252,0);rgba(165,180,252,0.70);rgba(165,180,252,0)"
                  dur={`${8 + i * 2}s`} begin={tali.delay} repeatCount="indefinite"/>
              </text>
            ))}
          </g>
        ))}

        {/* ══ Floating kanji ══ */}
        {['呪', '術', '廻', '戦', '無', '限'].map((k, i) => {
          const x = 118 + i * 62
          const y = 82 + (i % 2) * 42
          return (
            <text key={i} x={x} y={y} fontSize="18" textAnchor="middle"
              fill="rgba(129,140,248,0)"
              style={{ fontFamily: 'serif' }}>
              {k}
              <animate attributeName="fill"
                values="rgba(129,140,248,0);rgba(165,180,252,0.50);rgba(129,140,248,0)"
                dur={`${6 + i * 0.8}s`} begin={`${i * 1.5}s`} repeatCount="indefinite"/>
              <animate attributeName="y"
                values={`${y};${y - 14};${y}`}
                dur={`${6 + i * 0.8}s`} begin={`${i * 1.5}s`} repeatCount="indefinite"/>
            </text>
          )
        })}
      </svg>
    </div>
  )
}


/* ─── Avatar: The Last Airbender ─────────────────────── */
function ATLABackground() {
  // Air triskelion arm path (R=90): 3/4 outer arc then inner spiral hook
  const airArm = 'M 0,-90 C 51,-90 90,-51 90,0 C 90,51 51,90 0,90 C -34,90 -65,63 -72,25 C -56,5 -36,3 -22,14 C -9,24 -4,36 -11,45'

  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="atla-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="atla-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18"/>
          </filter>
          <filter id="atla-soft"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>

        {/* Quadrant tints — air=top-left, fire=top-right, water=bottom-left, earth=bottom-right */}
        <rect x="0"   y="0"   width="720" height="450" fill="rgba(249,115,22,0.05)"/>
        <rect x="720" y="0"   width="720" height="450" fill="rgba(220,38,38,0.05)"/>
        <rect x="0"   y="450" width="720" height="450" fill="rgba(56,189,248,0.05)"/>
        <rect x="720" y="450" width="720" height="450" fill="rgba(77,124,15,0.05)"/>
        <line x1="720" y1="0" x2="720" y2="900" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        <line x1="0" y1="450" x2="1440" y2="450" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>

        {/* ══ FIRE SCENE — upper-right ══ */}
        <ellipse cx="1160" cy="215" rx="340" ry="265"
          fill="rgba(249,115,22,0.10)" filter="url(#atla-blur)">
          <animate attributeName="rx" values="310;365;310" dur="3.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;1.0;0.6" dur="3.5s" repeatCount="indefinite"/>
        </ellipse>
        <path d="M1350,440 Q1330,350 1355,295 Q1380,235 1360,170 Q1390,220 1395,290 Q1420,230 1408,158 Q1440,218 1432,310 Q1440,252 1438,320 Q1440,270 1440,420 Z"
          fill="rgba(249,115,22,0.28)" filter="url(#atla-soft)">
          <animate attributeName="opacity" values="0.5;1.0;0.5" dur="2.6s" repeatCount="indefinite"/>
        </path>
        <path d="M1220,460 Q1192,370 1218,305 Q1244,238 1215,165 Q1255,228 1260,302 Q1290,240 1278,148 Q1318,225 1308,318 Q1328,258 1332,342 Q1348,282 1344,438 Z"
          fill="rgba(249,115,22,0.24)" filter="url(#atla-soft)">
          <animate attributeName="opacity" values="0.4;0.92;0.4" dur="3.1s" begin="0.4s" repeatCount="indefinite"/>
        </path>
        <path d="M1285,445 Q1270,368 1290,312 Q1310,248 1285,185 Q1318,248 1315,322 Q1335,265 1325,192 Q1355,262 1342,355 Q1362,295 1358,440 Z"
          fill="rgba(251,191,36,0.32)" filter="url(#atla-soft)">
          <animate attributeName="opacity" values="0.4;0.88;0.4" dur="2.2s" begin="0.8s" repeatCount="indefinite"/>
        </path>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          const r1 = 55, r2 = 38
          const x1 = 1310 + Math.cos(a) * r1, y1 = 88 + Math.sin(a) * r1
          const xm = 1310 + Math.cos(a + Math.PI / 8) * r2, ym = 88 + Math.sin(a + Math.PI / 8) * r2
          const x2 = 1310 + Math.cos(a + Math.PI / 4) * r1, y2 = 88 + Math.sin(a + Math.PI / 4) * r1
          return (
            <path key={i} d={`M1310,88 L${x1},${y1} L${xm},${ym} L${x2},${y2}`}
              fill="rgba(249,115,22,0.22)" stroke="rgba(251,146,60,0.35)" strokeWidth="1"
              strokeLinejoin="round"/>
          )
        })}
        <circle cx="1310" cy="88" r="28"
          fill="rgba(249,115,22,0.38)" stroke="rgba(251,146,60,0.55)" strokeWidth="2"
          filter="url(#atla-glow)">
          <animate attributeName="r" values="25;32;25" dur="3s" repeatCount="indefinite"/>
        </circle>

        {/* ══ WATER SCENE — lower-left ══ */}
        <ellipse cx="285" cy="762" rx="365" ry="175"
          fill="rgba(14,116,144,0.14)" filter="url(#atla-blur)">
          <animate attributeName="ry" values="165;190;165" dur="4s" repeatCount="indefinite"/>
        </ellipse>
        {[
          { y: 848, amp: 28, color: 'rgba(56,189,248,0.28)', w: 3.5 },
          { y: 872, amp: 22, color: 'rgba(56,189,248,0.20)', w: 2.5 },
          { y: 895, amp: 16, color: 'rgba(56,189,248,0.14)', w: 2   },
        ].map((wave, wi) => {
          const pts = Array.from({ length: 9 }, (_, i) => {
            const x = i * 180
            const y = wave.y + (i % 2 === 0 ? wave.amp : -wave.amp)
            return i === 0 ? `M${x},${y}` : `Q${x - 90},${wave.y} ${x},${y}`
          }).join(' ')
          return (
            <path key={wi} d={pts} fill="none" stroke={wave.color} strokeWidth={wave.w} strokeLinecap="round">
              <animate attributeName="d"
                values={`${pts};${pts.replace(/Q(\d+),(\d+) (\d+),/g, (_m, qx, _qy, px) => `Q${qx},${wave.y + wave.amp * 0.8} ${px},`)};${pts}`}
                dur={`${4 + wi * 0.6}s`} begin={`${wi * 0.5}s`} repeatCount="indefinite"/>
            </path>
          )
        })}
        <path d="M-20,620 Q80,548 175,598 Q270,648 362,588 Q452,530 540,572"
          fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="4.5" strokeLinecap="round">
          <animate attributeName="opacity" values="0.5;1.0;0.5" dur="5s" repeatCount="indefinite"/>
        </path>
        <circle cx="82" cy="592" r="48" fill="none" stroke="rgba(56,189,248,0.28)" strokeWidth="2.5">
          <animate attributeName="opacity" values="0.5;0.92;0.5" dur="6s" repeatCount="indefinite"/>
        </circle>
        <path d="M82,544 A48,48 0 0,0 82,640" fill="rgba(56,189,248,0.14)"/>
        <circle cx="82" cy="592" r="22" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="1.5" strokeDasharray="8 5"/>
        {[
          { cx: 155, cy: 545, r: 5 }, { cx: 210, cy: 522, r: 4 }, { cx: 275, cy: 540, r: 6 },
          { cx: 322, cy: 518, r: 3.5 }, { cx: 390, cy: 534, r: 5 },
        ].map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
            fill="rgba(56,189,248,0.65)" filter="url(#atla-glow)">
            <animate attributeName="opacity"
              values="0;0.85;0" dur={`${4 + i * 0.5}s`} begin={`${i * 0.8}s`} repeatCount="indefinite"/>
            <animate attributeName="cy"
              values={`${d.cy};${d.cy - 18};${d.cy}`}
              dur={`${4 + i * 0.5}s`} begin={`${i * 0.8}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* ══ EARTH SCENE — lower-right ══ */}
        <ellipse cx="1200" cy="772" rx="310" ry="168"
          fill="rgba(77,124,15,0.10)" filter="url(#atla-blur)">
          <animate attributeName="ry" values="158;182;158" dur="5s" repeatCount="indefinite"/>
        </ellipse>
        <rect x="985" y="720" width="68" height="185" rx="4"
          fill="rgba(77,124,15,0.22)" stroke="rgba(101,163,13,0.32)" strokeWidth="2">
          <animate attributeName="y" values="720;698;720" dur="5s" repeatCount="indefinite"/>
          <animate attributeName="height" values="185;207;185" dur="5s" repeatCount="indefinite"/>
        </rect>
        <rect x="1072" y="685" width="80" height="220" rx="4"
          fill="rgba(77,124,15,0.26)" stroke="rgba(101,163,13,0.38)" strokeWidth="2">
          <animate attributeName="y" values="685;660;685" dur="5s" begin="0.5s" repeatCount="indefinite"/>
          <animate attributeName="height" values="220;245;220" dur="5s" begin="0.5s" repeatCount="indefinite"/>
        </rect>
        <rect x="1165" y="705" width="72" height="200" rx="4"
          fill="rgba(77,124,15,0.22)" stroke="rgba(101,163,13,0.32)" strokeWidth="2">
          <animate attributeName="y" values="705;683;705" dur="5s" begin="1.0s" repeatCount="indefinite"/>
          <animate attributeName="height" values="200;222;200" dur="5s" begin="1.0s" repeatCount="indefinite"/>
        </rect>
        <rect x="1258" y="725" width="62" height="180" rx="4"
          fill="rgba(77,124,15,0.18)" stroke="rgba(101,163,13,0.26)" strokeWidth="2">
          <animate attributeName="y" values="725;705;725" dur="5s" begin="1.5s" repeatCount="indefinite"/>
          <animate attributeName="height" values="180;200;180" dur="5s" begin="1.5s" repeatCount="indefinite"/>
        </rect>
        <rect x="1342" y="738" width="56" height="168" rx="4"
          fill="rgba(77,124,15,0.14)" stroke="rgba(101,163,13,0.20)" strokeWidth="2">
          <animate attributeName="y" values="738;720;738" dur="5s" begin="2.0s" repeatCount="indefinite"/>
        </rect>
        <rect x="1088" y="618" width="48" height="48" rx="3"
          fill="rgba(77,124,15,0.18)" stroke="rgba(101,163,13,0.38)" strokeWidth="2"
          transform="rotate(45,1112,642)" filter="url(#atla-glow)">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="5s" repeatCount="indefinite"/>
        </rect>
        <rect x="1098" y="628" width="28" height="28" rx="2"
          fill="rgba(101,163,13,0.22)" stroke="rgba(132,204,22,0.30)" strokeWidth="1.5"
          transform="rotate(45,1112,642)"/>

        {/* ══ AIR — Appa flying upper-left ══ */}
        <g transform="translate(210,132)" opacity="0.30"
          style={{ animation: 'atla-float 8s ease-in-out infinite' }}>
          <ellipse cx="0" cy="0" rx="92" ry="46" fill="rgba(210,235,255,0.88)"/>
          <ellipse cx="-80" cy="-4" rx="36" ry="29" fill="rgba(210,235,255,0.88)"/>
          <path d="M-100,-15 L-72,-25 L-55,-14"
            fill="none" stroke="rgba(56,189,248,0.92)" strokeWidth="4" strokeLinejoin="round"/>
          <line x1="-92" y1="-27" x2="-102" y2="-40" stroke="rgba(210,235,255,0.72)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-82" y1="-30" x2="-88" y2="-43" stroke="rgba(210,235,255,0.72)" strokeWidth="3.5" strokeLinecap="round"/>
          {[-55, -18, 20, 56].map((x, i) => (
            <ellipse key={i} cx={x} cy="40" rx="12" ry="18" fill="rgba(190,220,250,0.78)"/>
          ))}
          <path d="M92,-6 Q126,8 120,28"
            fill="none" stroke="rgba(210,235,255,0.78)" strokeWidth="15" strokeLinecap="round"/>
          <ellipse cx="22" cy="-31" rx="29" ry="13" fill="rgba(160,120,60,0.40)"
            stroke="rgba(180,140,80,0.32)" strokeWidth="1.5"/>
        </g>
        {/* Air currents sweeping across middle band */}
        {[
          { d: 'M-30,388 Q180,345 388,382 Q595,418 808,365 Q1020,312 1220,348 Q1350,368 1460,342', del: '0s' },
          { d: 'M-30,422 Q160,378 368,415 Q575,452 788,398 Q998,345 1198,380 Q1345,405 1460,378', del: '1.5s' },
          { d: 'M-30,458 Q170,415 378,450 Q586,485 798,432 Q1008,380 1208,414 Q1352,438 1460,414', del: '3.0s' },
        ].map((c, i) => (
          <path key={i} d={c.d} fill="none"
            stroke="rgba(186,230,253,0)" strokeWidth={3 - i * 0.5} strokeLinecap="round"
            filter="url(#atla-soft)">
            <animate attributeName="stroke"
              values="rgba(186,230,253,0);rgba(186,230,253,0.42);rgba(186,230,253,0.18);rgba(186,230,253,0)"
              dur={`${6 + i * 0.8}s`} begin={c.del} repeatCount="indefinite"/>
          </path>
        ))}

        {/* ══ ELEMENT SYMBOLS — one per corner ══ */}
        {/* AIR triskelion — top-left corner */}
        <g transform="translate(185, 175)" filter="url(#atla-glow)">
          <circle cx="0" cy="0" r="82" fill="none" stroke="rgba(249,115,22,0.22)" strokeWidth="2">
            <animate attributeName="opacity" values="0.4;0.85;0.4" dur="5s" repeatCount="indefinite"/>
          </circle>
          {[0, 120, 240].map((deg, i) => (
            <g key={i} transform={`rotate(${deg}) scale(0.78)`}>
              <path d={airArm} fill="none" stroke="rgba(249,115,22,0.65)"
                strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="opacity"
                  values="0.45;0.85;0.45" dur={`${4 + i * 0.6}s`} begin={`${i * 0.5}s`} repeatCount="indefinite"/>
              </path>
            </g>
          ))}
          <circle cx="0" cy="0" r="7" fill="rgba(249,115,22,0.55)" filter="url(#atla-glow)">
            <animate attributeName="r" values="5;10;5" dur="3s" repeatCount="indefinite"/>
          </circle>
        </g>
        {/* FIRE flame — top-right corner */}
        <g transform="translate(1255, 175)" filter="url(#atla-glow)">
          <circle cx="0" cy="0" r="82" fill="none" stroke="rgba(220,38,38,0.22)" strokeWidth="2">
            <animate attributeName="opacity" values="0.4;0.85;0.4" dur="4.5s" repeatCount="indefinite"/>
          </circle>
          <path d="M 0,56 C -20,42 -26,19 -20,-11 C -14,-41 -6,-58 0,-70 C 6,-58 14,-41 20,-11 C 26,19 20,42 0,56 Z"
            fill="none" stroke="rgba(220,38,38,0.65)" strokeWidth="5.5" strokeLinejoin="round">
            <animate attributeName="opacity" values="0.50;0.92;0.50" dur="3s" repeatCount="indefinite"/>
          </path>
          <path d="M -3,48 C -25,37 -44,17 -44,-6 C -44,-30 -30,-47 -12,-48"
            fill="none" stroke="rgba(220,38,38,0.50)" strokeWidth="4.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.40;0.82;0.40" dur="3.4s" begin="0.5s" repeatCount="indefinite"/>
          </path>
          <path d="M 3,48 C 25,37 44,17 44,-6 C 44,-30 30,-47 12,-48"
            fill="none" stroke="rgba(220,38,38,0.50)" strokeWidth="4.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.40;0.82;0.40" dur="3.4s" begin="1.0s" repeatCount="indefinite"/>
          </path>
          <circle cx="0" cy="22" r="7" fill="rgba(251,146,60,0.55)" filter="url(#atla-glow)">
            <animate attributeName="r" values="5;10;5" dur="2.5s" repeatCount="indefinite"/>
          </circle>
        </g>
        {/* WATER scroll — bottom-left corner */}
        <g transform="translate(185, 725)" filter="url(#atla-glow)">
          <circle cx="0" cy="0" r="82" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="2">
            <animate attributeName="opacity" values="0.4;0.85;0.4" dur="5.5s" repeatCount="indefinite"/>
          </circle>
          <path d="M -70,0 C -70,-40 -40,-70 0,-70 C 40,-70 70,-40 70,0 C 70,32 49,58 25,63 C 12,48 14,23 30,7 C 40,-5 49,-7 46,-21 C 42,-35 25,-46 5,-43 C -14,-41 -26,-30 -26,-16 C -26,-2 -16,10 0,10"
            fill="none" stroke="rgba(56,189,248,0.65)" strokeWidth="6" strokeLinecap="round">
            <animate attributeName="opacity" values="0.50;0.90;0.50" dur="4.5s" repeatCount="indefinite"/>
          </path>
          <circle cx="0" cy="0" r="7" fill="rgba(56,189,248,0.55)" filter="url(#atla-glow)">
            <animate attributeName="r" values="5;10;5" dur="3.2s" repeatCount="indefinite"/>
          </circle>
        </g>
        {/* EARTH mountain/arch — bottom-right corner */}
        <g transform="translate(1255, 725)" filter="url(#atla-glow)">
          <circle cx="0" cy="0" r="82" fill="none" stroke="rgba(77,124,15,0.22)" strokeWidth="2">
            <animate attributeName="opacity" values="0.4;0.85;0.4" dur="6s" repeatCount="indefinite"/>
          </circle>
          <path d="M -54,-9 L -39,-61 L 39,-61 L 54,-9"
            fill="none" stroke="rgba(101,163,13,0.62)" strokeWidth="6"
            strokeLinejoin="round" strokeLinecap="round">
            <animate attributeName="opacity" values="0.50;0.90;0.50" dur="5s" repeatCount="indefinite"/>
          </path>
          <line x1="-54" y1="-9" x2="54" y2="-9"
            stroke="rgba(101,163,13,0.48)" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M 0,-47 C 17,-47 28,-36 28,-22 C 28,-8 17,3 0,3 C -16,3 -25,-6 -23,-19 C -22,-30 -11,-36 0,-34 C 9,-33 14,-23 11,-14"
            fill="none" stroke="rgba(101,163,13,0.55)" strokeWidth="4.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.50;0.90;0.50" dur="4.8s" begin="0.3s" repeatCount="indefinite"/>
          </path>
          <rect x="-53" y="6"  width="106" height="12" rx="3"
            fill="none" stroke="rgba(101,163,13,0.55)" strokeWidth="3.5"/>
          <rect x="-53" y="25" width="106" height="12" rx="3"
            fill="none" stroke="rgba(101,163,13,0.55)" strokeWidth="3.5"/>
          <circle cx="0" cy="-22" r="6" fill="rgba(101,163,13,0.50)" filter="url(#atla-glow)">
            <animate attributeName="r" values="5;9;5" dur="4s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* ══ CENTER — Aang's glowing airbender arrow ══ */}
        <g transform="translate(720, 450)" filter="url(#atla-glow)">
          <path d="M0,-220 L0,165" stroke="rgba(56,189,248,0)" strokeWidth="38" strokeLinecap="round"
            filter="url(#atla-blur)">
            <animate attributeName="stroke"
              values="rgba(56,189,248,0);rgba(56,189,248,0.55);rgba(186,230,253,0.35);rgba(56,189,248,0.55);rgba(56,189,248,0)"
              dur="4s" repeatCount="indefinite"/>
          </path>
          <path d="M0,-220 L0,165" stroke="rgba(186,230,253,0)" strokeWidth="11" strokeLinecap="round">
            <animate attributeName="stroke"
              values="rgba(186,230,253,0);rgba(186,230,253,0.95);rgba(56,189,248,0.78);rgba(186,230,253,0.95);rgba(186,230,253,0)"
              dur="4s" repeatCount="indefinite"/>
          </path>
          <path d="M-34,122 L0,172 L34,122" fill="none"
            stroke="rgba(186,230,253,0)" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round">
            <animate attributeName="stroke"
              values="rgba(186,230,253,0);rgba(186,230,253,0.95);rgba(56,189,248,0.78);rgba(186,230,253,0.95);rgba(186,230,253,0)"
              dur="4s" repeatCount="indefinite"/>
          </path>
          {[-155,-95,-35,25,85].map((dy, i) => (
            <path key={i} d={`M-14,${dy} L0,${dy+14} L14,${dy}`} fill="none"
              stroke="rgba(186,230,253,0)" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round">
              <animate attributeName="stroke"
                values="rgba(186,230,253,0);rgba(186,230,253,0.68);rgba(56,189,248,0.48);rgba(186,230,253,0.68);rgba(186,230,253,0)"
                dur="4s" begin={`${i * 0.12}s`} repeatCount="indefinite"/>
            </path>
          ))}
        </g>
      </svg>
    </div>
  )
}

/* ─── Hunter × Hunter ────────────────────────── */
function HxHBackground() {
  // Godspeed lightning web — diagonal lines spanning full canvas
  const webLines = [
    // Upper-left to mid-right
    { d: 'M12,22 L285,188 L228,188 L458,355 L398,355 L658,538',      delay: '0s'   },
    { d: 'M88,12 L348,195 L295,195 L522,368',                         delay: '0.6s' },
    { d: 'M185,8 L428,205 L368,205 L585,385 L528,385 L735,548',       delay: '1.2s' },
    // Upper-right to mid-left
    { d: 'M1428,18 L1158,192 L1215,192 L982,362 L1042,362 L788,535',  delay: '1.8s' },
    { d: 'M1352,8 L1095,198 L1145,198 L922,372',                      delay: '2.4s' },
    // Cross-web branches
    { d: 'M228,188 L175,238 L195,238 L138,298',                       delay: '0.9s' },
    { d: 'M458,355 L525,318 L505,318 L572,282',                       delay: '1.5s' },
    { d: 'M982,362 L912,322 L932,322 L862,282',                       delay: '2.1s' },
    // Lower horizontal sweep
    { d: 'M12,682 L285,638 L225,638 L498,595 L438,595 L712,548',      delay: '3.0s' },
    { d: 'M1428,688 L1158,645 L1218,645 L942,598',                    delay: '3.6s' },
  ]

  const nenTypes = ['強化', '変化', '放出', '操作', '具現化', '特質']

  return (
    <div className="theme-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" className="theme-bg__svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="hxh-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="hxh-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18"/>
          </filter>
          <filter id="hxh-elec" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Godspeed lightning web — diagonal grid across full canvas ── */}
        {webLines.map((l, i) => (
          <g key={i}>
            {/* Glow layer */}
            <path d={l.d} fill="none"
              stroke="rgba(147,210,255,0)" strokeWidth={22 - (i % 3) * 4} strokeLinecap="round"
              filter="url(#hxh-blur)">
              <animate attributeName="stroke"
                values="rgba(147,210,255,0);rgba(147,210,255,0.40);rgba(200,235,255,0.22);rgba(147,210,255,0)"
                dur={`${5 + (i % 4) * 0.6}s`} begin={l.delay} repeatCount="indefinite"/>
            </path>
            {/* Core line */}
            <path d={l.d} fill="none"
              stroke="rgba(220,240,255,0)" strokeWidth={i % 2 === 0 ? 3 : 1.8} strokeLinecap="round"
              filter="url(#hxh-elec)">
              <animate attributeName="stroke"
                values="rgba(220,240,255,0);rgba(220,240,255,0.85);rgba(147,210,255,0.48);rgba(220,240,255,0)"
                dur={`${5 + (i % 4) * 0.6}s`} begin={l.delay} repeatCount="indefinite"/>
              <animate attributeName="stroke-dasharray"
                values="0 2000;1800 200;0 2000"
                dur={`${5 + (i % 4) * 0.6}s`} begin={l.delay} repeatCount="indefinite"/>
            </path>
          </g>
        ))}

        {/* Lightning node sparkles at intersections */}
        {[
          { cx: 285, cy: 188, r: 10 }, { cx: 458, cy: 355, r: 8  },
          { cx: 658, cy: 538, r: 12 }, { cx: 982, cy: 362, r: 9  },
          { cx: 1158, cy: 192, r: 8 }, { cx: 428, cy: 205, r: 7  },
          { cx: 712, cy: 548, r: 10 }, { cx: 942, cy: 598, r: 8  },
        ].map((node, i) => (
          <circle key={i} cx={node.cx} cy={node.cy} r={node.r}
            fill="rgba(220,240,255,0)" filter="url(#hxh-elec)">
            <animate attributeName="fill"
              values="rgba(220,240,255,0);rgba(220,240,255,0.88);rgba(147,210,255,0.50);rgba(220,240,255,0)"
              dur={`${4 + i * 0.4}s`} begin={`${i * 0.5}s`} repeatCount="indefinite"/>
            <animate attributeName="r"
              values={`${node.r};${node.r * 2.2};${node.r}`}
              dur={`${4 + i * 0.4}s`} begin={`${i * 0.5}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* ── Large faded Hunter Association star — background ── */}
        {(() => {
          const cx = 720, cy = 448, pts = Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2
            const r = i % 2 === 0 ? 220 : 95
            return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
          }).join(' ')
          return (
            <polygon points={pts}
              fill="rgba(22,163,74,0.04)" stroke="rgba(22,163,74,0.15)" strokeWidth="1.5" strokeLinejoin="round">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="8s" repeatCount="indefinite"/>
            </polygon>
          )
        })()}

        {/* ── Nen energy currents — diagonal green flows ── */}
        {[
          { d: 'M-20,445 Q245,398 495,442 Q745,485 992,432 Q1238,378 1460,418', del: '0s'   },
          { d: 'M-20,498 Q245,452 495,495 Q745,538 992,486 Q1238,432 1460,470', del: '2.2s' },
          { d: 'M-20,392 Q245,348 495,390 Q745,432 992,382 Q1238,330 1460,365', del: '4.5s' },
        ].map((c, i) => (
          <path key={i} d={c.d} fill="none"
            stroke="rgba(22,163,74,0)" strokeWidth={2.5 - i * 0.4} strokeLinecap="round">
            <animate attributeName="stroke"
              values="rgba(22,163,74,0);rgba(34,197,94,0.38);rgba(22,163,74,0.18);rgba(22,163,74,0)"
              dur={`${7 + i * 0.8}s`} begin={c.del} repeatCount="indefinite"/>
            <animate attributeName="stroke-dasharray"
              values="0 2200;2000 200;0 2200"
              dur={`${7 + i * 0.8}s`} begin={c.del} repeatCount="indefinite"/>
          </path>
        ))}

        {/* ── Gon — compact action pose silhouette (Image #19) ── */}
        <g transform="translate(195, 590) scale(0.58)">
          {/* Nen backlight */}
          <ellipse cx="0" cy="-60" rx="180" ry="380" fill="rgba(34,197,94,0.36)" filter="url(#hxh-blur)">
            <animate attributeName="opacity" values="0.45;0.78;0.45" dur="3.2s" repeatCount="indefinite"/>
          </ellipse>
          {/* Body — leaning forward ~12 degrees */}
          <g transform="rotate(-12, 0, -50)">
            {/* Back arm — right, elbow up behind */}
            <path d="M52,-96 Q90,-58 98,0 Q102,44 90,82"
              fill="none" stroke="rgba(8,12,8,0.98)" strokeWidth="28" strokeLinecap="round"/>
            {/* Forward arm — left, reaching down-forward with fist */}
            <path d="M-50,-96 Q-88,-22 -110,52 Q-116,72 -118,90"
              fill="none" stroke="rgba(8,12,8,0.98)" strokeWidth="28" strokeLinecap="round"/>
            <circle cx="-118" cy="100" r="18" fill="rgba(8,12,8,0.98)"/>
            {/* Forward leg — left, bent knee angled down-left */}
            <path d="M-48,110 L-8,110 Q-4,182 -24,252 Q-34,288 -46,316 L-78,316 Q-76,284 -74,252 Q-68,178 -76,110 Z"
              fill="rgba(8,12,8,0.98)"/>
            {/* Back leg — right, sweeping right and down */}
            <path d="M10,110 L52,110 Q84,190 96,268 Q102,298 96,326 L64,326 Q56,296 40,264 Q18,182 0,110 Z"
              fill="rgba(8,12,8,0.98)"/>
            {/* Shorts */}
            <path d="M-62,18 L64,18 L72,114 L-76,114 Z" fill="rgba(6,10,6,0.99)"/>
            {/* Jacket */}
            <path d="M-60,-122 L62,-122 L62,20 L-60,20 Z" fill="rgba(8,12,8,0.98)"/>
            {/* Neck */}
            <rect x="-12" y="-144" width="32" height="26" rx="5" fill="rgba(8,12,8,0.98)"/>
            {/* Hair — spiky, swept upward with subtle sway */}
            <path d="M 50,-196 L 62,-236 L 80,-280 L 54,-260 L 50,-348 L 26,-298 L 6,-408 L -14,-298 L -38,-342 L -52,-264 L -74,-278 L -60,-238 L -46,-196 Z"
              fill="rgba(8,12,8,0.98)">
              <animateTransform attributeName="transform" type="rotate"
                values="0 6 -300; 1.8 6 -300; 0 6 -300; -1.2 6 -300; 0 6 -300"
                dur="3.8s" repeatCount="indefinite" additive="sum"/>
            </path>
            {/* Face */}
            <circle cx="4" cy="-186" r="54" fill="rgba(8,12,8,0.98)"/>
          </g>
          {/* Nen particles */}
          {([
            {cx:-72,cy:6,r:4},{cx:70,cy:-8,r:3.5},
            {cx:-60,cy:148,r:3},{cx:62,cy:142,r:3},
          ] as {cx:number;cy:number;r:number}[]).map((p,i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r}
              fill="rgba(34,197,94,0.72)" filter="url(#hxh-glow)">
              <animate attributeName="opacity"
                values="0;0.88;0" dur={`${3.0+i*0.5}s`} begin={`${i*0.6}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </g>

        {/* ── Shared Nen blend — green+blue merge between Gon and Killua ── */}
        <ellipse cx="278" cy="460" rx="110" ry="260" fill="rgba(80,200,140,0.18)" filter="url(#hxh-blur)">
          <animate attributeName="opacity" values="0.22;0.45;0.22" dur="4.0s" repeatCount="indefinite"/>
        </ellipse>

        {/* ── Killua — playful running silhouette ── */}
        <g transform="translate(355, 590) scale(0.50)">
          {/* Electric blue backlight */}
          <ellipse cx="0" cy="-60" rx="175" ry="375" fill="rgba(147,210,255,0.36)" filter="url(#hxh-blur)">
            <animate attributeName="opacity" values="0.45;0.78;0.45" dur="2.8s" repeatCount="indefinite"/>
          </ellipse>
          {/* Body — leaning forward-right ~8 degrees */}
          <g transform="rotate(8, 0, -50)">
            {/* Back arm — left, pulled back */}
            <path d="M-52,-96 Q-85,-30 -90,42 Q-92,80 -78,112"
              fill="none" stroke="rgba(6,10,6,0.98)" strokeWidth="26" strokeLinecap="round"/>
            {/* Forward arm — right, swinging forward */}
            <path d="M50,-96 Q88,-20 112,52 Q118,72 112,88"
              fill="none" stroke="rgba(6,10,6,0.98)" strokeWidth="26" strokeLinecap="round"/>
            {/* Forward leg — right, reaching forward */}
            <path d="M10,110 L52,110 Q88,190 102,268 Q108,296 102,322 L68,322 Q60,294 44,262 Q24,182 4,110 Z"
              fill="rgba(6,10,6,0.98)"/>
            {/* Back leg — left, pushing off */}
            <path d="M-52,110 L-12,110 Q-12,186 -30,254 Q-42,292 -58,318 L-90,318 Q-80,286 -72,252 Q-62,180 -68,110 Z"
              fill="rgba(6,10,6,0.98)"/>
            {/* Shorts */}
            <path d="M-60,18 L62,18 L70,114 L-72,114 Z" fill="rgba(4,8,4,0.99)"/>
            {/* Shirt */}
            <path d="M-58,-122 L60,-122 L60,20 L-58,20 Z" fill="rgba(6,10,6,0.98)"/>
            {/* Neck */}
            <rect x="-12" y="-144" width="28" height="26" rx="5" fill="rgba(6,10,6,0.98)"/>
            {/* Hair — compact upward spikes, 5 tips, stays above face width */}
            <path d="M-48,-200
                     L-62,-242 L-44,-224
                     L-52,-272 L-28,-246
                     L-18,-286 L 4,-252
                     L 18,-280 L 38,-248
                     L 50,-264 L 64,-238
                     Q 56,-208 56,-198
                     Q 10,-192 -48,-200 Z"
              fill="rgba(6,10,6,0.98)">
              <animateTransform attributeName="transform" type="rotate"
                values="0 4 -240; 0.5 4 -240; 0 4 -240; -0.3 4 -240; 0 4 -240"
                dur="4.2s" repeatCount="indefinite" additive="sum"/>
            </path>
            {/* Face */}
            <circle cx="4" cy="-186" r="52" fill="rgba(6,10,6,0.98)"/>
          </g>
          {/* Electric Nen particles */}
          {([
            {cx:68,cy:4,r:4},{cx:-62,cy:-4,r:3.5},
            {cx:58,cy:142,r:3},{cx:-54,cy:140,r:3},
          ] as {cx:number;cy:number;r:number}[]).map((p,i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r}
              fill="rgba(147,210,255,0.72)" filter="url(#hxh-elec)">
              <animate attributeName="opacity"
                values="0;0.88;0" dur={`${3.0+i*0.5}s`} begin={`${i*0.6}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </g>

        {/* ── Killua Godspeed — dominant diagonal lightning bolt ── */}
        {/* Blur glow */}
        <path d="M62,38 L312,245 L245,245 L495,462 L428,462 L678,678"
          fill="none" stroke="rgba(147,210,255,0)" strokeWidth="42" strokeLinecap="round"
          filter="url(#hxh-blur)">
          <animate attributeName="stroke"
            values="rgba(147,210,255,0);rgba(147,210,255,0.55);rgba(200,235,255,0.32);rgba(147,210,255,0)"
            dur="4.5s" repeatCount="indefinite"/>
        </path>
        {/* Main bolt */}
        <path d="M62,38 L312,245 L245,245 L495,462 L428,462 L678,678"
          fill="none" stroke="rgba(220,240,255,0)" strokeWidth="6.5" strokeLinecap="round"
          filter="url(#hxh-elec)">
          <animate attributeName="stroke"
            values="rgba(220,240,255,0);rgba(220,240,255,0.95);rgba(147,210,255,0.58);rgba(220,240,255,0)"
            dur="4.5s" repeatCount="indefinite"/>
          <animate attributeName="stroke-width" values="6.5;11;4;6.5" dur="4.5s" repeatCount="indefinite"/>
          <animate attributeName="stroke-dasharray"
            values="0 1800;1600 200;0 1800" dur="4.5s" repeatCount="indefinite"/>
        </path>

        {/* ── Hunter License card (bottom-right) ── */}
        <g transform="translate(1248, 728)" filter="url(#hxh-glow)">
          <rect x="-140" y="-52" width="280" height="104" rx="8"
            fill="rgba(6,12,4,0.85)" stroke="rgba(22,163,74,0.42)" strokeWidth="1.5">
            <animate attributeName="stroke-opacity" values="0.42;0.75;0.42" dur="4s" repeatCount="indefinite"/>
          </rect>
          <rect x="-140" y="-52" width="36" height="104" rx="8"
            fill="rgba(22,163,74,0.16)" stroke="rgba(22,163,74,0.28)" strokeWidth="1"/>
          <polygon points="0,-20 -4.8,-9.5 -18.5,-9.5 -8,0 -12,14 0,6 12,14 8,0 18.5,-9.5 4.8,-9.5"
            transform="translate(-122, 0)"
            fill="rgba(22,163,74,0.72)" stroke="rgba(34,197,94,0.85)" strokeWidth="1"
            filter="url(#hxh-glow)">
            <animate attributeName="opacity" values="0.60;1.0;0.60" dur="3s" repeatCount="indefinite"/>
          </polygon>
          <text x="-88" y="-33" fontSize="9" fill="rgba(34,197,94,0.72)"
            style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.18em' }}>HUNTER LICENSE</text>
          <rect x="-88" y="-20" width="140" height="6" rx="2" fill="rgba(34,197,94,0.12)"/>
          <rect x="-88" y="-8"  width="110" height="5" rx="2" fill="rgba(34,197,94,0.10)"/>
          <rect x="-88" y="4"   width="80"  height="5" rx="2" fill="rgba(34,197,94,0.08)"/>
          <text x="-88" y="38" fontSize="8" fill="rgba(34,197,94,0.42)"
            style={{ fontFamily: 'monospace', letterSpacing: '0.12em' }}>★ PRO HUNTER</text>
          <rect x="82" y="-40" width="52" height="68" rx="4"
            fill="rgba(22,163,74,0.08)" stroke="rgba(22,163,74,0.22)" strokeWidth="1"/>
        </g>

        {/* ── Nen type labels — scattered (not in a ring) ── */}
        {nenTypes.map((t, i) => {
          const positions = [
            { x: 92,  y: 285 }, { x: 1380, y: 145 },
            { x: 842, y: 58  }, { x: 1285, y: 488 },
            { x: 425, y: 828 }, { x: 1125, y: 842 },
          ]
          const p = positions[i]
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="13" fill="rgba(34,197,94,0)"
              style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
              {t}
              <animate attributeName="fill"
                values="rgba(34,197,94,0);rgba(34,197,94,0.62);rgba(34,197,94,0)"
                dur={`${6.5 + i * 1.1}s`} begin={`${i * 0.9}s`} repeatCount="indefinite"/>
            </text>
          )
        })}

        {/* Floating 念 kanji — scattered */}
        {[
          { x: 158, y: 168, delay: '0s',   size: 20 },
          { x: 725, y: 128, delay: '2.5s', size: 15 },
          { x: 1058, y: 248, delay: '5.0s', size: 17 },
        ].map((k, i) => (
          <text key={i} x={k.x} y={k.y} textAnchor="middle" fontSize={k.size}
            fill="rgba(34,197,94,0)"
            style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
            念
            <animate attributeName="fill"
              values="rgba(34,197,94,0);rgba(34,197,94,0.58);rgba(34,197,94,0)"
              dur={`${6 + i * 1.5}s`} begin={k.delay} repeatCount="indefinite"/>
            <animate attributeName="y"
              values={`${k.y};${k.y - 20};${k.y}`}
              dur={`${6 + i * 1.5}s`} begin={k.delay} repeatCount="indefinite"/>
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ─── Router ──────────────────────────────────────────── */
const BACKGROUNDS: Partial<Record<string, FC>> = {
  aot:         AoTBackground,
  blackclover: BlackCloverBackground,
  demonslayer: DemonSlayerBackground,
  jjk:         JJKBackground,
  atla:        ATLABackground,
  hxh:         HxHBackground,
}

export default function ThemeBackground() {
  const { colorTheme } = useTheme()
  const Bg = BACKGROUNDS[colorTheme]

  // Touch devices render a plain CSS gradient instead of the full SVG scene,
  // not just pause its animations once mounted — the feGaussianBlur filters
  // and shape count still cost a paint/composite on every scroll frame even
  // with SMIL paused, which is the actual source of mobile scroll jank, not
  // the animation itself. Desktop is untouched.
  const [isTouchDevice, setIsTouchDevice] = useState(
    () => window.matchMedia('(hover: none) and (pointer: coarse)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    const apply = () => setIsTouchDevice(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (isTouchDevice) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const svg = document.querySelector<SVGSVGElement>('.theme-bg__svg')
    const apply = () => (mq.matches ? svg?.pauseAnimations() : svg?.unpauseAnimations())
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [colorTheme, isTouchDevice])

  if (!Bg) return null
  if (isTouchDevice) return <div className="theme-bg theme-bg--plain" aria-hidden="true" />
  return <Bg />
}
