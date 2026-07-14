import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'

// ── Anime catalog (80 titles) ─────────────────────────────────────────────────
// Indexed 0-79 in group order — cluster vectors below must match this order
// Groups: Shonen/Action 0-19 | Dark Fantasy 20-27 | Psychological 28-35
//         Sci-Fi/Mecha 36-45 | Martial Arts 46-51 | Ghibli/Fantasy 52-57
//         Drama/Slice of Life 58-67 | Romance 68-75 | Comedy/Sports 76-79 (+ more below)

const ANIME: { id: string; title: string; genres: string[] }[] = [
  // ── Shonen / Action (0-19)
  { id: 'aot',       title: 'Attack on Titan',                    genres: ['Action', 'Dark Fantasy']         },
  { id: 'jjk',       title: 'Jujutsu Kaisen',                     genres: ['Action', 'Shonen']               },
  { id: 'demon',     title: 'Demon Slayer',                       genres: ['Action', 'Shonen']               },
  { id: 'hxh',       title: 'Hunter × Hunter',                   genres: ['Action', 'Shonen', 'Adventure']  },
  { id: 'fmab',      title: 'Fullmetal Alchemist: Brotherhood',   genres: ['Action', 'Shonen', 'Adventure']  },
  { id: 'naruto',    title: 'Naruto / Shippuden',                 genres: ['Action', 'Shonen']               },
  { id: 'dbz',       title: 'Dragon Ball Z',                      genres: ['Action', 'Shonen', 'Martial Arts'] },
  { id: 'onepiece',  title: 'One Piece',                          genres: ['Action', 'Shonen', 'Adventure']  },
  { id: 'bleach',    title: 'Bleach',                             genres: ['Action', 'Shonen']               },
  { id: 'mha',       title: 'My Hero Academia',                   genres: ['Action', 'Shonen']               },
  { id: 'mob',       title: 'Mob Psycho 100',                     genres: ['Action', 'Psychological']        },
  { id: 'opo',       title: 'One Punch Man',                      genres: ['Action', 'Comedy']               },
  { id: 'chainsaw',  title: 'Chainsaw Man',                       genres: ['Action', 'Dark Fantasy', 'Horror'] },
  { id: 'souleater', title: 'Soul Eater',                         genres: ['Action', 'Dark Fantasy']         },
  { id: 'fireforce', title: 'Fire Force',                         genres: ['Action', 'Shonen']               },
  { id: 'fairytail', title: 'Fairy Tail',                         genres: ['Action', 'Shonen', 'Adventure']  },
  { id: 'blueexo',   title: 'Blue Exorcist',                      genres: ['Action', 'Shonen']               },
  { id: 'noragami',  title: 'Noragami',                           genres: ['Action', 'Shonen', 'Supernatural'] },
  { id: 'blackclov', title: 'Black Clover',                       genres: ['Action', 'Shonen']               },
  { id: 'nanatsu',   title: 'Seven Deadly Sins',                  genres: ['Action', 'Shonen', 'Fantasy']    },
  // ── Dark Fantasy (20-27)
  { id: 'berserk',   title: 'Berserk',                            genres: ['Dark Fantasy', 'Action', 'Historical'] },
  { id: 'vinland',   title: 'Vinland Saga',                       genres: ['Dark Fantasy', 'Historical', 'Action'] },
  { id: 'mia',       title: 'Made in Abyss',                      genres: ['Dark Fantasy', 'Adventure']      },
  { id: 'tokyoghoul',title: 'Tokyo Ghoul',                        genres: ['Dark Fantasy', 'Horror']         },
  { id: 'rezero',    title: 'Re:Zero',                            genres: ['Dark Fantasy', 'Psychological']   },
  { id: 'goblin',    title: 'Goblin Slayer',                      genres: ['Dark Fantasy', 'Horror']         },
  { id: 'claymore',  title: 'Claymore',                           genres: ['Dark Fantasy', 'Action']         },
  { id: 'dororo',    title: 'Dororo',                             genres: ['Dark Fantasy', 'Historical']     },
  // ── Psychological / Thriller (28-35)
  { id: 'deathnote', title: 'Death Note',                         genres: ['Psychological', 'Mystery', 'Thriller'] },
  { id: 'geass',     title: 'Code Geass',                         genres: ['Psychological', 'Mecha']         },
  { id: 'parasyte',  title: 'Parasyte: the maxim',               genres: ['Psychological', 'Horror', 'Sci-Fi'] },
  { id: 'monster',   title: 'Monster',                           genres: ['Psychological', 'Mystery', 'Thriller'] },
  { id: 'psychopass',title: 'Psycho-Pass',                        genres: ['Psychological', 'Sci-Fi']        },
  { id: 'erased',    title: 'Erased',                            genres: ['Psychological', 'Mystery']        },
  { id: 'terror',    title: 'Terror in Resonance',                genres: ['Psychological', 'Mystery']        },
  { id: 'tpn',       title: 'The Promised Neverland',            genres: ['Psychological', 'Thriller']       },
  // ── Sci-Fi / Mecha (36-45)
  { id: 'eva',       title: 'Neon Genesis Evangelion',           genres: ['Mecha', 'Psychological', 'Sci-Fi'] },
  { id: 'steinsgate',title: 'Steins;Gate',                       genres: ['Sci-Fi', 'Psychological']         },
  { id: 'cowboy',    title: 'Cowboy Bebop',                      genres: ['Sci-Fi', 'Action']                },
  { id: 'gits',      title: 'Ghost in the Shell',                genres: ['Sci-Fi', 'Psychological']         },
  { id: 'logh',      title: 'Legend of the Galactic Heroes',     genres: ['Sci-Fi', 'Historical']            },
  { id: 'planetes',  title: 'Planetes',                          genres: ['Sci-Fi', 'Drama']                 },
  { id: 'trigun',    title: 'Trigun',                            genres: ['Sci-Fi', 'Action']                },
  { id: 'gurren',    title: 'Gurren Lagann',                     genres: ['Mecha', 'Action', 'Sci-Fi']       },
  { id: 'eighty6',   title: '86 Eighty-Six',                     genres: ['Mecha', 'Sci-Fi', 'Action']       },
  { id: 'darling',   title: 'DARLING in the FranXX',             genres: ['Mecha', 'Sci-Fi', 'Romance']      },
  // ── Martial Arts / Historical (46-51)
  { id: 'samurai',   title: 'Samurai Champloo',                  genres: ['Martial Arts', 'Historical', 'Action'] },
  { id: 'kenshin',   title: 'Rurouni Kenshin',                   genres: ['Martial Arts', 'Historical', 'Action'] },
  { id: 'katana',    title: 'Katanagatari',                      genres: ['Martial Arts', 'Historical', 'Adventure'] },
  { id: 'ippo',      title: 'Hajime no Ippo',                    genres: ['Sports', 'Martial Arts', 'Comedy'] },
  { id: 'kenichi',   title: 'Kenichi: The Mightiest Disciple',   genres: ['Martial Arts', 'Action', 'Comedy'] },
  { id: 'gintama',   title: 'Gintama',                          genres: ['Comedy', 'Action', 'Historical', 'Martial Arts'] },
  // ── Ghibli / Fantasy / Adventure (52-57)
  { id: 'mononoke',  title: 'Princess Mononoke',                 genres: ['Fantasy', 'Adventure']            },
  { id: 'spirited',  title: 'Spirited Away',                     genres: ['Fantasy', 'Adventure']            },
  { id: 'nausicaa',  title: 'Nausicaä of the Valley of the Wind',genres: ['Fantasy', 'Sci-Fi', 'Adventure']  },
  { id: 'laputa',    title: 'Castle in the Sky',                 genres: ['Fantasy', 'Adventure']            },
  { id: 'howl',      title: "Howl's Moving Castle",              genres: ['Fantasy', 'Romance']              },
  { id: 'totoro',    title: 'My Neighbor Totoro',                genres: ['Fantasy', 'Slice of Life']        },
  // ── Drama / Slice of Life (58-67)
  { id: 'violet',    title: 'Violet Evergarden',                 genres: ['Drama', 'Fantasy']                },
  { id: 'clannad',   title: 'Clannad + After Story',            genres: ['Drama', 'Romance', 'Slice of Life'] },
  { id: 'anohana',   title: 'Anohana',                          genres: ['Drama', 'Supernatural']           },
  { id: 'lieinapril',title: 'Your Lie in April',                genres: ['Drama', 'Music', 'Romance']       },
  { id: 'marchcome', title: 'March Comes in Like a Lion',        genres: ['Drama', 'Slice of Life', 'Sports'] },
  { id: 'mushishi',  title: 'Mushishi',                         genres: ['Slice of Life', 'Fantasy', 'Mystery'] },
  { id: 'barakamon', title: 'Barakamon',                        genres: ['Slice of Life', 'Comedy']         },
  { id: 'asilentv',  title: 'A Silent Voice',                   genres: ['Drama', 'Romance']                },
  { id: 'nana',      title: 'Nana',                             genres: ['Drama', 'Music', 'Romance']       },
  { id: 'fruits',    title: 'Fruits Basket',                    genres: ['Romance', 'Drama', 'Slice of Life'] },
  // ── Romance (68-75)
  { id: 'toradora',  title: 'Toradora!',                        genres: ['Romance', 'Comedy', 'Drama']      },
  { id: 'kaguya',    title: 'Kaguya-sama: Love is War',         genres: ['Romance', 'Comedy']               },
  { id: 'horimiya',  title: 'Horimiya',                         genres: ['Romance', 'Slice of Life']        },
  { id: 'oregairu',  title: 'My Teen Romantic Comedy SNAFU',    genres: ['Romance', 'Drama', 'Comedy']      },
  { id: 'quintup',   title: 'The Quintessential Quintuplets',   genres: ['Romance', 'Comedy']               },
  { id: 'chunibyo',  title: 'Love, Chunibyo & Other Delusions', genres: ['Romance', 'Comedy']               },
  { id: 'yumeiro',   title: 'Ao Haru Ride',                     genres: ['Romance', 'Drama']                },
  { id: 'ouran',     title: 'Ouran High School Host Club',      genres: ['Romance', 'Comedy']               },
  // ── Comedy (76-79)
  { id: 'konosuba',  title: 'KonoSuba',                         genres: ['Comedy', 'Fantasy']               },
  { id: 'nichijou',  title: 'Nichijou',                         genres: ['Comedy', 'Slice of Life']         },
  { id: 'grandblue', title: 'Grand Blue',                       genres: ['Comedy', 'Slice of Life']         },
  { id: 'saiki',     title: 'The Disastrous Life of Saiki K',   genres: ['Comedy', 'Supernatural']          },
  // ── Sports (80-87)
  { id: 'haikyuu',   title: 'Haikyuu!!',                        genres: ['Sports', 'Comedy']                },
  { id: 'kuroko',    title: "Kuroko's Basketball",              genres: ['Sports', 'Action']                },
  { id: 'slamdunk',  title: 'Slam Dunk',                        genres: ['Sports', 'Comedy']                },
  { id: 'yuriice',   title: 'Yuri!!! on Ice',                   genres: ['Sports', 'Romance', 'Drama']      },
  { id: 'free',      title: 'Free! Iwatobi Swim Club',          genres: ['Sports', 'Drama']                 },
  { id: 'runwind',   title: 'Run with the Wind',                genres: ['Sports', 'Drama']                 },
  { id: 'ashita',    title: 'Ashita no Joe',                    genres: ['Sports', 'Martial Arts', 'Drama']   },
  { id: 'capttsubas',title: 'Captain Tsubasa',                  genres: ['Sports', 'Shonen']                  },
  { id: 'bluelock',  title: 'Blue Lock',                        genres: ['Sports', 'Psychological', 'Shonen'] },
  { id: 'inazuma',   title: 'Inazuma Eleven',                   genres: ['Sports', 'Shonen', 'Adventure']     },
  // ── Action / Isekai (100-109)
  { id: 'sololevel', title: 'Solo Leveling',                    genres: ['Action', 'Fantasy', 'Adventure']    },
  { id: 'shieldhero',title: 'Rising of the Shield Hero',        genres: ['Action', 'Fantasy', 'Adventure']    },
  { id: 'overlord',  title: 'Overlord',                         genres: ['Action', 'Fantasy', 'Dark Fantasy'] },
  { id: 'tensura',   title: 'That Time I Got Reincarnated as a Slime', genres: ['Fantasy', 'Comedy', 'Adventure'] },
  { id: 'sao',       title: 'Sword Art Online',                 genres: ['Action', 'Fantasy', 'Romance']      },
  { id: 'towerofgod',title: 'Tower of God',                     genres: ['Action', 'Fantasy', 'Psychological'] },
  { id: 'redo',      title: 'The Beginning After the End',      genres: ['Action', 'Fantasy', 'Adventure']    },
  { id: 'arifureta', title: 'Arifureta',                        genres: ['Action', 'Fantasy', 'Dark Fantasy'] },
  { id: 'isekaich',  title: 'Isekai Cheat Magician',            genres: ['Action', 'Fantasy']                 },
  { id: 'mahouka',   title: 'The Irregular at Magic High School', genres: ['Action', 'Sci-Fi', 'Fantasy']    },
  // ── Martial Arts / Fighter (110-115)
  { id: 'baki',      title: 'Baki Hanma',                       genres: ['Martial Arts', 'Action']            },
  { id: 'kengan',    title: 'Kengan Ashura',                     genres: ['Martial Arts', 'Action']            },
  { id: 'dragonball',title: 'Dragon Ball Super',                genres: ['Martial Arts', 'Action', 'Shonen']  },
  { id: 'yuyuhaku',  title: 'Yu Yu Hakusho',                    genres: ['Martial Arts', 'Action', 'Shonen']  },
  { id: 'ushio',     title: 'Ushio and Tora',                   genres: ['Action', 'Shonen', 'Supernatural']  },
  { id: 'ruroken2',  title: 'Rurouni Kenshin (2023)',            genres: ['Martial Arts', 'Historical', 'Action'] },
  // ── Western-influenced / Other (116-119)
  { id: 'blueeyesam',title: 'Blue Eye Samurai',                 genres: ['Martial Arts', 'Historical', 'Dark Fantasy'] },
  { id: 'castlevan', title: 'Castlevania',                      genres: ['Dark Fantasy', 'Action', 'Horror']  },
  { id: 'arcane',    title: 'Arcane',                           genres: ['Action', 'Sci-Fi', 'Dark Fantasy']  },
  { id: 'witcher',   title: 'The Witcher: Nightmare of the Wolf', genres: ['Dark Fantasy', 'Action', 'Fantasy'] },
]

// N = number of series
const N = ANIME.length  // 96

// ── All genre tags derived from catalog ───────────────────────────────────────
const ALL_GENRES = Array.from(
  new Set(ANIME.flatMap(a => a.genres))
).sort()

// ── Synthetic user dataset: 80 users × N series ───────────────────────────────
// 4 taste clusters — each is a baseline rating vector of length N
// Cluster A: Shonen/Action fan
// Cluster B: Psychological/Sci-Fi fan
// Cluster C: Drama/Romance fan
// Cluster D: Comedy/Sports fan
function makeDataset(): number[][] {
  const rng = (seed: number) => {
    let s = seed
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0xffffffff }
  }

  // Helper: genre-based rating for each cluster
  const genreScore = (genres: string[], cluster: 'A' | 'B' | 'C' | 'D'): number => {
    const g = new Set(genres)
    if (cluster === 'A') {
      if (g.has('Shonen') || g.has('Action') || g.has('Martial Arts')) return 5
      if (g.has('Dark Fantasy') || g.has('Adventure')) return 4
      if (g.has('Psychological') || g.has('Sports') || g.has('Historical')) return 3
      if (g.has('Sci-Fi') || g.has('Mecha') || g.has('Comedy')) return 2
      return 1
    }
    if (cluster === 'B') {
      if (g.has('Psychological') || g.has('Sci-Fi') || g.has('Mecha')) return 5
      if (g.has('Mystery') || g.has('Thriller') || g.has('Dark Fantasy')) return 4
      if (g.has('Action') || g.has('Historical')) return 3
      if (g.has('Romance') || g.has('Slice of Life') || g.has('Comedy')) return 2
      return 2
    }
    if (cluster === 'C') {
      if (g.has('Drama') || g.has('Romance') || g.has('Slice of Life') || g.has('Music')) return 5
      if (g.has('Fantasy') || g.has('Supernatural')) return 4
      if (g.has('Comedy') || g.has('Mystery')) return 3
      if (g.has('Action') || g.has('Dark Fantasy') || g.has('Horror')) return 2
      return 1
    }
    // D: Comedy/Sports
    if (g.has('Comedy') || g.has('Sports')) return 5
    if (g.has('Romance') || g.has('Slice of Life') || g.has('Shonen')) return 4
    if (g.has('Action') || g.has('Adventure') || g.has('Fantasy')) return 3
    if (g.has('Psychological') || g.has('Horror') || g.has('Thriller')) return 1
    return 2
  }

  const clusters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D']
  const users: number[][] = []

  for (let u = 0; u < 80; u++) {
    const r = rng(u * 11 + 17)
    // Mixed cluster: primary + some secondary influence
    const primary   = clusters[u % 4]
    const secondary = clusters[(u + 1) % 4]
    const mix       = r() * 0.4  // 0-40% secondary influence

    const row = ANIME.map(anime => {
      const baseA = genreScore(anime.genres, primary)
      const baseB = genreScore(anime.genres, secondary)
      const base  = Math.round(baseA * (1 - mix) + baseB * mix)
      const noise = Math.round((r() - 0.5) * 2)
      const seen  = r() > 0.25  // 75% seen-rate — enough overlap for meaningful similarity
      const rating = Math.max(1, Math.min(5, base + noise))
      return seen ? rating : 0
    })
    users.push(row)
  }
  return users
}

const DATASET = makeDataset()

// ── Sasideep's profile — added as a named profile in the dataset ──────────────
// Visitors compare their taste against this. Not editable.
function makeSasideepProfile(): number[] {
  const r = Array(N).fill(0)
  const seed: [string, number][] = [
    ['aot',        5], ['jjk',        5], ['demon',      4], ['hxh',        5],
    ['fmab',       5], ['naruto',      3], ['dbz',        3], ['mha',         3],
    ['mob',        5], ['opo',         4], ['chainsaw',   4], ['blackclov',   3],
    ['berserk',    5], ['vinland',     5], ['mia',        4], ['rezero',      4],
    ['deathnote',  5], ['geass',       4], ['monster',    5], ['psychopass',  4],
    ['erased',     4], ['tpn',         4],
    ['eva',        4], ['steinsgate',  5], ['cowboy',     5], ['gits',        4],
    ['gurren',     4], ['mononoke',    4], ['spirited',   4],
    ['violet',     4], ['haikyuu',     4], ['bluelock',   4],
    ['sololevel',  5], ['towerofgod',  4],
    ['baki',       4], ['blueeyesam',  5],
  ]
  seed.forEach(([id, rating]) => {
    const idx = ANIME.findIndex(a => a.id === id)
    if (idx !== -1) r[idx] = rating
  })
  return r
}

const SASIDEEP_IDX = DATASET.length     // Sasideep is profile 80 (0-indexed)
const DATASET_WITH_SASI = [...DATASET, makeSasideepProfile()]

// ── Math helpers ──────────────────────────────────────────────────────────────
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0 || b[i] === 0) continue
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function pearsonSim(a: number[], b: number[]): number {
  const paired: [number, number][] = []
  for (let i = 0; i < a.length; i++) {
    if (a[i] > 0 && b[i] > 0) paired.push([a[i], b[i]])
  }
  if (paired.length < 2) return 0
  const meanA = paired.reduce((s, p) => s + p[0], 0) / paired.length
  const meanB = paired.reduce((s, p) => s + p[1], 0) / paired.length
  let num = 0, da = 0, db = 0
  for (const [x, y] of paired) {
    num += (x - meanA) * (y - meanB)
    da  += (x - meanA) ** 2
    db  += (y - meanB) ** 2
  }
  if (da === 0 || db === 0) return 0
  return num / Math.sqrt(da * db)
}

type SimilarityFn = typeof cosineSim

function computeRecommendations(
  myRatings: number[],
  k: number,
  simFn: SimilarityFn,
): {
  recommendations: { animeIdx: number; score: number; supporters: number[] }[]
  neighbors: { userId: number; similarity: number; overlap: number }[]
} {
  if (myRatings.every(r => r === 0)) return { recommendations: [], neighbors: [] }

  const MIN_OVERLAP = 5  // need 4 co-rated series for meaningful signal

  const sims = DATASET_WITH_SASI
    .map((row, uid) => {
      const overlap = myRatings.filter((r, i) => r > 0 && row[i] > 0).length
      if (overlap < MIN_OVERLAP) return null
      const similarity = simFn(myRatings, row)
      if (similarity <= 0) return null
      return { userId: uid, similarity, overlap }
    })
    .filter((u): u is { userId: number; similarity: number; overlap: number } => u !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)

  const MIN_NEIGHBORS = 3  // need at least 3 matching profiles for reliable recs

  if (sims.length < MIN_NEIGHBORS) return { recommendations: [], neighbors: sims }

  const recs: { animeIdx: number; score: number; supporters: number[] }[] = []
  for (let fi = 0; fi < ANIME.length; fi++) {
    if (myRatings[fi] > 0) continue

    let weightedSum = 0, weightSum = 0
    const supporters: number[] = []
    for (const { userId, similarity } of sims) {
      const r = DATASET_WITH_SASI[userId][fi]
      if (r === 0) continue
      weightedSum += similarity * r
      weightSum   += Math.abs(similarity)
      supporters.push(userId)
    }
    if (weightSum === 0) continue
    recs.push({ animeIdx: fi, score: weightedSum / weightSum, supporters })
  }

  return {
    recommendations: recs.sort((a, b) => b.score - a.score).slice(0, 8),
    neighbors: sims,
  }
}

// ── Tooltip — absolute, right-aligned to trigger ─────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 9999,
          background: 'var(--card)',
          border: '1px solid var(--border-mid)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: '0.625rem',
          lineHeight: 1.6,
          color: 'var(--text-2)',
          width: '16rem',
          whiteSpace: 'pre-line',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          textAlign: 'left',
        }}>{text}</div>
      )}
    </div>
  )
}

// ── Star rating ───────────────────────────────────────────────────────────────
function Stars({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 2 }} role="group" aria-label={`Rating: ${value} of 5 stars`}>
      {[1,2,3,4,5].map(s => (
        <button key={s}
          onClick={() => onChange(value === s ? 0 : s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 1px',
            fontSize: '0.875rem', lineHeight: 1,
            color: s <= (hover || value) ? accent : 'var(--border-mid)',
            transition: 'color 0.1s',
          }}
        >★</button>
      ))}
    </div>
  )
}

function ConfBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', width: 72 }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, background: accent, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const DEMO_BTN_BASE: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 7, border: 'none',
  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font)', letterSpacing: '0.04em',
}

const SIM_FUNS: Record<string, SimilarityFn> = { Cosine: cosineSim, Pearson: pearsonSim }
const K_OPTIONS = [5, 10, 20, 40]

export default function RecoDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [myRatings, setMyRatings] = useState<number[]>(Array(N).fill(0))
  const [simKey,        setSimKey]         = useState<'Cosine' | 'Pearson'>('Cosine')
  const [k,             setK]             = useState(10)
  const [activeRec,     setActiveRec]     = useState<number | null>(null)
  const [showHow,       setShowHow]       = useState(false)
  const [activeGenres,  setActiveGenres]  = useState<Set<string>>(new Set())
  const [search,        setSearch]        = useState('')
  const [sortMode,      setSortMode]      = useState<'genre' | 'rated'>('genre')
  const [page,          setPage]          = useState(0)
  const PAGE_SIZE = 10

  const rate = useCallback((idx: number, stars: number) => {
    setMyRatings(prev => { const next = [...prev]; next[idx] = stars; return next })
    setActiveRec(null)
  }, [])

  const toggleGenre = useCallback((g: string) => {
    setActiveGenres(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }, [])

  const visibleAnime = useMemo(() => {
    const q = search.toLowerCase().trim()
    const filtered = ANIME
      .map((a, i) => ({ ...a, idx: i }))
      .filter(a => {
        const matchesGenre  = activeGenres.size === 0 || a.genres.some(g => activeGenres.has(g))
        const matchesSearch = !q || a.title.toLowerCase().includes(q) || a.genres.some(g => g.toLowerCase().includes(q))
        return matchesGenre && matchesSearch
      })

    if (sortMode === 'rated') {
      return [...filtered].sort((a, b) => {
        const ra = myRatings[a.idx], rb = myRatings[b.idx]
        if (ra > 0 && rb === 0) return -1
        if (ra === 0 && rb > 0) return  1
        return rb - ra  // rated: highest first; unrated: original order
      })
    }
    return filtered  // genre order (catalog order)
  }, [activeGenres, search, sortMode, myRatings])

  const totalPages = Math.ceil(visibleAnime.length / PAGE_SIZE)
  const pagedAnime = visibleAnime.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const { recommendations, neighbors } = useMemo(
    () => computeRecommendations(myRatings, k, SIM_FUNS[simKey]),
    [myRatings, k, simKey],
  )

  const ratedCount = myRatings.filter(r => r > 0).length

  // Compute similarity to Sasideep's profile directly
  const sasiProfile   = DATASET_WITH_SASI[SASIDEEP_IDX]
  const sasiOverlap   = myRatings.filter((r, i) => r > 0 && sasiProfile[i] > 0).length
  const sasiSimilarity = sasiOverlap >= 3 ? SIM_FUNS[simKey](myRatings, sasiProfile) : null
  const sasiPct        = sasiSimilarity !== null ? Math.round(sasiSimilarity * 100) : null

  // Reset to first page whenever filter/sort changes
  useEffect(() => { setPage(0) }, [activeGenres, search, sortMode])

  const whyRec = activeRec !== null ? recommendations.find(r => r.animeIdx === activeRec) : null
  const whyNeighbors = whyRec
    ? whyRec.supporters.slice(0, 5).map(uid => ({
        uid,
        sim:    SIM_FUNS[simKey](myRatings, DATASET_WITH_SASI[uid]),
        rating: DATASET_WITH_SASI[uid][whyRec.animeIdx],
      }))
    : []

  return (
    <div style={{ fontFamily: 'var(--font)', maxWidth: 960 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setShowHow(false)} style={{
          ...DEMO_BTN_BASE, padding: '3px 10px',
          background: !showHow ? accent : 'var(--surface)',
          color: !showHow ? '#000' : 'var(--text-2)',
        }}>Demo</button>
        <button onClick={() => setShowHow(true)} style={{
          ...DEMO_BTN_BASE, padding: '3px 10px',
          background: showHow ? accent : 'var(--surface)',
          color: showHow ? '#000' : 'var(--text-2)',
        }}>How it works</button>
      </div>

      {showHow ? (
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Collaborative Filtering — how recommendations are computed
          </p>
          <p>
            You're looking at <strong>Sasideep's anime taste profile</strong> — pre-seeded with real ratings across 36 series.
            Adjust any rating to change the profile and watch the algorithm recalculate in real time.
            The algorithm finds synthetic viewers whose taste most closely matches this profile,
            then predicts ratings for unseen series — purely from the rating matrix, no content analysis.
          </p>
          <pre className="code-block">{`// ── Step 1: Build your sparse rating vector ──────────
you = [5, 0, 4, 0, 3, ...]   // 0 = not seen, 1–5 = your rating

// ── Step 2: Cosine similarity vs every other user ─────
sim(A, B) = (A · B) / (|A| × |B|)
// Only uses titles both users have rated (non-zero overlap)
// 1.0 = identical taste  ·  0 = no overlap  ·  -1 = opposite

// ── Step 3: Top-K nearest neighbors ───────────────────
neighbors = sort(all_users, by=similarity).take(K)

// ── Step 4: Predict score for each unseen title ────────
predicted(title) =
  Σ(neighbor.sim × neighbor.rating[title])
  ────────────────────────────────────────
  Σ(|neighbor.sim|)

// ── Step 5: Rank unseen titles by predicted score ──────
recommendations = sort(unrated, by=predicted).take(8)

// Switch to Pearson for mean-centered ratings:
// handles users who always rate high or always rate low
pearson(A,B) = Σ((a-ā)(b-b̄)) / √(Σ(a-ā)² × Σ(b-b̄)²)`}</pre>
          <p className="demo-stack-note">
            Stack: React · TypeScript · Pure math — no ML library · 80-user synthetic dataset · {N} anime titles
          </p>
        </div>
      ) : (
        <div className="demo-two-col" style={{ minHeight: 'calc(100vh - 300px)', alignItems: 'flex-start', gap: 16 }}>

          {/* ── Left: catalog + filters ───────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Search */}
            <input
              type="search"
              className="reco-search-input"
              placeholder="Search anime or genre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', color: 'var(--text)',
                fontFamily: 'var(--font)', fontSize: '0.75rem', outline: 'none',
              }}
              aria-label="Search anime titles"
            />

            {/* Genre filter chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ALL_GENRES.map(g => {
                const active = activeGenres.has(g)
                return (
                  <button key={g} onClick={() => toggleGenre(g)}
                    aria-pressed={active}
                    style={{
                      padding: '2px 8px', borderRadius: 99, cursor: 'pointer',
                      fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                      border: `1px solid ${active ? accent : 'var(--border)'}`,
                      background: active ? `${accent}22` : 'var(--surface)',
                      color: active ? accent : 'var(--text-3)',
                      transition: 'all 0.1s',
                    }}>{g}</button>
                )
              })}
              {activeGenres.size > 0 && (
                <button onClick={() => setActiveGenres(new Set())}
                  style={{
                    padding: '2px 8px', borderRadius: 99, cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                    border: '1px solid var(--border)', background: 'none',
                    color: 'var(--text-3)',
                  }}>✕ clear</button>
              )}
            </div>

            {/* Sort + status row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700,
                letterSpacing: '0.1em', color: 'var(--text-3)' }}>
                YOUR RATINGS · {ratedCount} / {N}
                {sasiPct !== null && (
                  <span style={{ color: accent, marginLeft: 8 }}>
                    · {sasiPct}% match with Sasideep
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                {([['genre', 'By Genre'], ['rated', 'Rated First']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setSortMode(mode)} style={{
                    padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                    border: `1px solid ${sortMode === mode ? accent : 'var(--border)'}`,
                    background: sortMode === mode ? `${accent}22` : 'none',
                    color: sortMode === mode ? accent : 'var(--text-3)',
                    transition: 'all 0.1s',
                  }}>{label}</button>
                ))}
                <button onClick={() => setMyRatings(Array(N).fill(0))} style={{
                  padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text-3)', transition: 'all 0.1s',
                }} title="Clear all ratings">↺ Clear</button>
              </div>
            </div>

            {/* Anime list — paginated */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pagedAnime.map(anime => (
                <div key={anime.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 8,
                  background: myRatings[anime.idx] > 0 ? `${accent}0a` : 'var(--surface)',
                  border: `1px solid ${myRatings[anime.idx] > 0 ? accent + '33' : 'var(--border)'}`,
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {anime.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                      {anime.genres.map(g => (
                        <span key={g} style={{
                          fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 600,
                          padding: '1px 5px', borderRadius: 99,
                          background: activeGenres.has(g) ? `${accent}22` : 'var(--card)',
                          border: `1px solid ${activeGenres.has(g) ? accent + '55' : 'var(--border)'}`,
                          color: activeGenres.has(g) ? accent : 'var(--text-3)',
                        }}>{g}</span>
                      ))}
                    </div>
                  </div>
                  <Stars value={myRatings[anime.idx]} onChange={v => rate(anime.idx, v)} accent={accent} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{
                    padding: '4px 10px', borderRadius: 6, cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: page === 0 ? 'var(--text-3)' : 'var(--text)', opacity: page === 0 ? 0.4 : 1,
                  }}>← Prev</button>
                <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-3)' }}>
                  {page + 1} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{
                    padding: '4px 10px', borderRadius: 6, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: page === totalPages - 1 ? 'var(--text-3)' : 'var(--text)',
                    opacity: page === totalPages - 1 ? 0.4 : 1,
                  }}>Next →</button>
              </div>
            )}
          </div>

          {/* ── Right sidebar — wider for reco panel ──────────────── */}
          <div className="demo-two-col__sidebar" style={{ flex: '0 0 260px' }}>

            {/* Controls */}
            <div style={{ background: 'var(--surface)', borderRadius: 10,
              border: '1px solid var(--border-mid)', flexShrink: 0 }}>
              <div style={{ padding: '7px 12px 6px', borderBottom: '1px solid var(--border)' }}>
                <span className="demo-card-header">PARAMETERS</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span className="demo-controls__label">Similarity metric</span>
                    <Tooltip text={`Cosine\n· Measures the angle between rating vectors\n· Best when users rate different quantities\n· Handles sparse data well\n\nPearson\n· Mean-centers each user's ratings first\n· Handles "generous raters" (always 5★) vs "strict raters" (tops out at 3★)\n· More accurate when rating styles differ`}>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', cursor: 'help' }}>(?)</span>
                    </Tooltip>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['Cosine', 'Pearson'] as const).map(s => (
                      <button key={s} onClick={() => setSimKey(s)} style={{
                        flex: 1, padding: '4px 0', borderRadius: 5, cursor: 'pointer',
                        fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                        border: `1px solid ${simKey === s ? accent : 'var(--border)'}`,
                        background: simKey === s ? `${accent}22` : 'var(--card)',
                        color: simKey === s ? accent : 'var(--text-2)',
                        transition: 'all 0.1s',
                      }}>{s}</button>
                    ))}
                  </div>
                  <div style={{ marginTop: 5, fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                    {simKey === 'Cosine'
                      ? '↳ Angle between rating vectors — good for sparse ratings'
                      : '↳ Mean-centered — handles strict vs generous raters fairly'}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span className="demo-controls__label">Neighbors (K)</span>
                    <Tooltip text={`Neighbors (K) — how many similar profiles drive recommendations

· Low K (5–10): uses your closest taste matches — more personal, narrower
· High K (20–40): broader pool — more coverage, slightly diluted

Start with 10. Increase if recommendations feel too niche.`}>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', cursor: 'help' }}>(?)</span>
                    </Tooltip>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {K_OPTIONS.map(v => (
                      <button key={v} onClick={() => setK(v)} style={{
                        flex: 1, padding: '4px 0', borderRadius: 5, cursor: 'pointer',
                        fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                        border: `1px solid ${k === v ? accent : 'var(--border)'}`,
                        background: k === v ? `${accent}22` : 'var(--card)',
                        color: k === v ? accent : 'var(--text-2)',
                        transition: 'all 0.1s',
                      }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations — primary output, visually dominant */}
            <div style={{
              flex: 1, background: 'var(--bg)', borderRadius: 12,
              border: `2px solid ${accent}55`,
              boxShadow: `0 0 24px ${accent}18`,
              
            }}>
              <div style={{
                padding: '10px 14px 8px',
                borderBottom: `1px solid ${accent}22`,
                background: `${accent}0a`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700,
                    letterSpacing: '0.12em', color: accent,
                  }}>RECOMMENDED FOR YOU</span>
                  <Tooltip text={`Predicted score (1–5 scale)

· Computed as a weighted average of similar profiles' ratings
· Profiles with higher taste-match contribute more weight
· Bar length = confidence — longer means stronger signal

Click any row → see exactly which profiles drove it`}>
                    <span style={{ fontSize: '0.625rem', color: accent, fontFamily: 'monospace', opacity: 0.6, cursor: 'help' }}>(?)</span>
                  </Tooltip>
                </div>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ratedCount === 0 ? (
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
                    Rate 5+ series across different genres to get recommendations
                  </p>
                ) : recommendations.length === 0 ? (
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
                    Rate more series — need at least 3 viewers with similar taste
                  </p>
                ) : (
                  recommendations.map((rec, rank) => {
                    const anime  = ANIME[rec.animeIdx]
                    const pct    = (rec.score - 1) / 4
                    const active = activeRec === rec.animeIdx
                    return (
                      <button key={anime.id} onClick={() => setActiveRec(active ? null : rec.animeIdx)}
                        aria-expanded={active}
                        aria-label={`${anime.title}, predicted ${rec.score.toFixed(1)} stars. ${rec.supporters.length} supporters. Click for details.`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          background: active ? `${accent}14` : 'none',
                          border: `1px solid ${active ? accent + '44' : 'transparent'}`,
                          borderRadius: 6, padding: '5px 6px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace',
                          width: 12, flexShrink: 0 }}>{rank + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {anime.title}
                          </div>
                          <ConfBar pct={pct} accent={accent} />
                        </div>
                        <span style={{ fontSize: '0.625rem', color: accent, fontFamily: 'monospace',
                          flexShrink: 0 }}>{rec.score.toFixed(1)}</span>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Why recommended */}
              {whyRec && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700,
                    letterSpacing: '0.1em', color: accent, marginBottom: 6 }}>
                    WHY {ANIME[whyRec.animeIdx].title.toUpperCase()}?
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {whyNeighbors.map(({ uid, sim, rating }) => (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.625rem', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--text-3)', width: 60, flexShrink: 0 }}>Profile #{uid + 1}</span>
                        <span style={{ color: accent, width: 28, flexShrink: 0 }}>{sim.toFixed(2)}</span>
                        <span style={{ color: 'var(--text-2)', flexShrink: 0 }}>rated</span>
                        <span style={{ color: 'var(--text)' }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace',
                    margin: '6px 0 0', lineHeight: 1.6 }}>
                    Profiles most similar to you rated this highly —
                    their ratings are weighted by similarity to predict your score.
                  </p>
                </div>
              )}
            </div>

            {/* Viewers with similar taste — summary in plain English */}
            <div style={{ background: 'var(--surface)', borderRadius: 10,
              border: '1px solid var(--border-mid)', flexShrink: 0 }}>
              <div style={{ padding: '7px 12px 6px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="demo-card-header">TASTE COMPARISON</span>
                  <Tooltip text={`Taste comparison

· vs Sasideep: cosine/Pearson similarity on series you've both rated
· vs 80 synthetic profiles: viewer clusters across action, drama, sci-fi, romance
· Rate more series across genres for a more accurate score

All profiles are generated data, not real users.`}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', cursor: 'help' }}>(?)</span>
                  </Tooltip>
                </div>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Sasideep comparison — always shown first */}
                <div style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: `${accent}0d`, border: `1px solid ${accent}33`,
                }}>
                  <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700,
                    color: accent, letterSpacing: '0.1em', marginBottom: 4 }}>
                    vs SASIDEEP
                  </div>
                  {sasiPct !== null ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: accent, lineHeight: 1 }}>
                        {sasiPct}%
                      </span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        taste match · {sasiOverlap} shared series
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
                      Rate 3+ series you've seen to compare
                    </p>
                  )}
                </div>

                {/* Other viewers summary */}
                {ratedCount === 0 ? (
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
                    Rate series to find viewers with similar taste
                  </p>
                ) : neighbors.length === 0 ? (
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
                    No strong matches yet — try rating across different genres
                  </p>
                ) : (() => {
                  const strong   = neighbors.filter(n => n.userId !== SASIDEEP_IDX && n.similarity >= 0.90).length
                  const good     = neighbors.filter(n => n.userId !== SASIDEEP_IDX && n.similarity >= 0.70 && n.similarity < 0.90).length
                  const total    = neighbors.filter(n => n.userId !== SASIDEEP_IDX).length
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <p style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
                        {total > 0 ? `${total} synthetic viewer${total > 1 ? 's' : ''} also match your taste` : 'No other matches yet'}
                        {strong > 0 && ` — ${strong} at 90%+`}
                        {good   > 0 && `, ${good} at 70–90%`}
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
