export interface TestCase {
  description: string
  check: (fn: (...args: unknown[]) => unknown) => { actual: unknown; expected: unknown }
}

export interface Problem {
  id: string
  title: string
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  functionName: string
  starterCode: string
  solution: string
  tests: TestCase[]
  concepts: string[]
  explanation: string
}

export const PROBLEMS: Problem[] = [
  {
    id: 'flatten',
    title: 'Flatten Array',
    category: 'JavaScript',
    difficulty: 'Easy',
    description: `Implement flatten(arr) that recursively flattens a nested array to any depth.

Examples:
  flatten([1, [2, [3]]]) → [1, 2, 3]
  flatten([1, [2, 3], [4, [5]]]) → [1, 2, 3, 4, 5]
  flatten([]) → []`,
    functionName: 'flatten',
    starterCode: `function flatten(arr) {
  // flatten a nested array to any depth
}`,
    solution: `function flatten(arr) {
  return arr.reduce((acc, val) =>
    Array.isArray(val)
      ? acc.concat(flatten(val))
      : acc.concat(val),
    []
  )
}

// Alternative one-liner:
// return arr.flat(Infinity)`,
    tests: [
      {
        description: 'flattens one level',
        check: (fn) => ({ actual: fn([[1, 2], [3, 4]]), expected: [1, 2, 3, 4] }),
      },
      {
        description: 'flattens three levels deep',
        check: (fn) => ({ actual: fn([1, [2, [3, [4]]]]), expected: [1, 2, 3, 4] }),
      },
      {
        description: 'handles empty array',
        check: (fn) => ({ actual: fn([]), expected: [] }),
      },
      {
        description: 'handles mixed nesting',
        check: (fn) => ({ actual: fn([1, [2, 3], [4, [5, [6]]]]), expected: [1, 2, 3, 4, 5, 6] }),
      },
    ],
    concepts: ['recursion', 'reduce', 'Array.isArray'],
    explanation: 'The key insight is checking if each element is an array using Array.isArray — if so, recurse; otherwise push the value. reduce builds the flat array in one pass. Array.flat(Infinity) is the native version, but implementing it manually shows you understand recursion and accumulator patterns.',
  },

  {
    id: 'groupby',
    title: 'Group By',
    category: 'JavaScript',
    difficulty: 'Easy',
    description: `Implement groupBy(arr, fn) that groups array elements by the result of calling fn on each element.

Examples:
  groupBy([6.1, 4.2, 6.3], Math.floor) → { 4: [4.2], 6: [6.1, 6.3] }
  groupBy(['one','two','three'], x => x.length) → { 3: ['one','two'], 5: ['three'] }`,
    functionName: 'groupBy',
    starterCode: `function groupBy(arr, fn) {
  // group elements by the key returned by fn
}`,
    solution: `function groupBy(arr, fn) {
  return arr.reduce((acc, val) => {
    const key = fn(val)
    if (!acc[key]) acc[key] = []
    acc[key].push(val)
    return acc
  }, {})
}`,
    tests: [
      {
        description: 'groups numbers by Math.floor',
        check: (fn) => ({
          actual: (fn as any)([6.1, 4.2, 6.3], Math.floor),
          expected: { 4: [4.2], 6: [6.1, 6.3] },
        }),
      },
      {
        description: 'groups strings by length',
        check: (fn) => ({
          actual: (fn as any)(['one', 'two', 'three'], (x: string) => x.length),
          expected: { 3: ['one', 'two'], 5: ['three'] },
        }),
      },
      {
        description: 'handles empty array',
        check: (fn) => ({
          actual: (fn as any)([], Math.floor),
          expected: {},
        }),
      },
      {
        description: 'groups booleans by even/odd',
        check: (fn) => ({
          actual: (fn as any)([1, 2, 3, 4], (n: number) => n % 2 === 0 ? 'even' : 'odd'),
          expected: { odd: [1, 3], even: [2, 4] },
        }),
      },
    ],
    concepts: ['reduce', 'accumulator pattern', 'higher-order function'],
    explanation: 'Classic reduce pattern. The accumulator is an object, and for each element you compute a key via fn, then push into the matching bucket. The "|| []" guard initializes a new bucket lazily. Interviewers love this because it combines higher-order functions, reduce, and dynamic object mutation.',
  },

  {
    id: 'pipe',
    title: 'Pipe',
    category: 'JavaScript',
    difficulty: 'Easy',
    description: `Implement pipe(...fns) that returns a function which passes its argument through each function left-to-right.

Examples:
  pipe(x => x * 2, x => x + 1)(5) → 11   // double then add 1
  pipe(x => x + 1, x => x * 2)(5) → 12   // add 1 then double
  pipe()(5) → 5                            // no-op`,
    functionName: 'pipe',
    starterCode: `function pipe(...fns) {
  // return a function that passes its value through each fn left to right
}`,
    solution: `function pipe(...fns) {
  return (x) => fns.reduce((v, fn) => fn(v), x)
}

// compose is the reverse (right-to-left):
// const compose = (...fns) => (x) => fns.reduceRight((v, fn) => fn(v), x)`,
    tests: [
      {
        description: 'applies functions left to right',
        check: (fn) => ({
          actual: (fn as any)((x: number) => x * 2, (x: number) => x + 1)(5),
          expected: 11,
        }),
      },
      {
        description: 'order matters',
        check: (fn) => ({
          actual: (fn as any)((x: number) => x + 1, (x: number) => x * 2)(5),
          expected: 12,
        }),
      },
      {
        description: 'works with a single function',
        check: (fn) => ({
          actual: (fn as any)((x: number) => x * x)(4),
          expected: 16,
        }),
      },
      {
        description: 'returns identity when no functions passed',
        check: (fn) => ({
          actual: (fn as any)()(5),
          expected: 5,
        }),
      },
    ],
    concepts: ['reduce', 'function composition', 'rest parameters'],
    explanation: 'One line with reduce. The initial value is x (the input), and each step calls the next function with the previous result. pipe = left-to-right (functional programming standard). compose = right-to-left (mathematical convention). Knowing both and the distinction between reduceRight vs reduce shows depth.',
  },

  {
    id: 'memoize',
    title: 'Memoize',
    category: 'JavaScript',
    difficulty: 'Medium',
    description: `Implement memoize(fn) that caches results — if called again with the same arguments, return the cached value without re-executing fn.

Examples:
  const slowDouble = memoize(n => { /* expensive */ return n * 2 })
  slowDouble(5) // computes → 10
  slowDouble(5) // cached → 10  (fn NOT called again)
  slowDouble(6) // computes → 12`,
    functionName: 'memoize',
    starterCode: `function memoize(fn) {
  // return a cached version of fn
}`,
    solution: `function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}`,
    tests: [
      {
        description: 'returns correct result',
        check: (fn) => {
          const memoized = (fn as any)((n: number) => n * 2)
          return { actual: memoized(7), expected: 14 }
        },
      },
      {
        description: 'calls original fn only once for same args',
        check: (fn) => {
          let calls = 0
          const memoized = (fn as any)((n: number) => { calls++; return n * 2 })
          memoized(5); memoized(5); memoized(5)
          return { actual: calls, expected: 1 }
        },
      },
      {
        description: 'different args call fn separately',
        check: (fn) => {
          let calls = 0
          const memoized = (fn as any)((n: number) => { calls++; return n * 2 })
          memoized(1); memoized(2); memoized(3)
          return { actual: calls, expected: 3 }
        },
      },
      {
        description: 'works with multiple arguments',
        check: (fn) => {
          const memoized = (fn as any)((a: number, b: number) => a + b)
          return { actual: memoized(3, 4), expected: 7 }
        },
      },
    ],
    concepts: ['closure', 'Map', 'caching', 'JSON.stringify'],
    explanation: 'The cache lives in the closure — each call to memoize creates a new Map shared by all invocations of the returned function. JSON.stringify(args) creates a cache key from the argument list. Caveat: this breaks for non-serializable args (functions, circular refs). For production, use a WeakMap or deep-equality comparison. Interviewers often follow up: "what are the limitations of JSON.stringify as a key?"',
  },

  {
    id: 'once',
    title: 'Once',
    category: 'JavaScript',
    difficulty: 'Easy',
    description: `Implement once(fn) that returns a new function which calls fn at most once. After the first call, subsequent calls return the first result without calling fn again.

Examples:
  const init = once(() => 'initialized')
  init()  → 'initialized'
  init()  → 'initialized'  (fn NOT called again)
  init()  → 'initialized'`,
    functionName: 'once',
    starterCode: `function once(fn) {
  // return a function that calls fn at most once
}`,
    solution: `function once(fn) {
  let called = false
  let result
  return function(...args) {
    if (!called) {
      called = true
      result = fn.apply(this, args)
    }
    return result
  }
}`,
    tests: [
      {
        description: 'returns the result on first call',
        check: (fn) => {
          const f = (fn as any)(() => 42)
          return { actual: f(), expected: 42 }
        },
      },
      {
        description: 'fn is only called once',
        check: (fn) => {
          let calls = 0
          const f = (fn as any)(() => { calls++; return calls })
          f(); f(); f()
          return { actual: calls, expected: 1 }
        },
      },
      {
        description: 'always returns the first result',
        check: (fn) => {
          let n = 0
          const f = (fn as any)(() => ++n)
          const a = f(), b = f(), c = f()
          return { actual: [a, b, c], expected: [1, 1, 1] }
        },
      },
      {
        description: 'passes arguments on first call',
        check: (fn) => {
          const f = (fn as any)((x: number, y: number) => x + y)
          return { actual: f(3, 4), expected: 7 }
        },
      },
    ],
    concepts: ['closure', 'flag variable', 'higher-order function'],
    explanation: 'Two closure variables: a boolean flag and a cached result. The flag gates execution; the result is returned regardless of whether the real fn ran. Common variation: "after" (call fn only after N calls) or "before" (call fn only while fewer than N calls have occurred). Lodash has all three.',
  },

  {
    id: 'chunk',
    title: 'Chunk Array',
    category: 'JavaScript',
    difficulty: 'Easy',
    description: `Implement chunk(arr, size) that splits an array into groups of the specified size. The last chunk may be smaller.

Examples:
  chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
  chunk([1,2,3,4], 2)   → [[1,2],[3,4]]
  chunk([1,2,3], 5)     → [[1,2,3]]
  chunk([], 2)          → []`,
    functionName: 'chunk',
    starterCode: `function chunk(arr, size) {
  // split arr into chunks of length size
}`,
    solution: `function chunk(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}`,
    tests: [
      {
        description: 'chunks with remainder',
        check: (fn) => ({
          actual: (fn as any)([1, 2, 3, 4, 5], 2),
          expected: [[1, 2], [3, 4], [5]],
        }),
      },
      {
        description: 'chunks evenly',
        check: (fn) => ({
          actual: (fn as any)([1, 2, 3, 4], 2),
          expected: [[1, 2], [3, 4]],
        }),
      },
      {
        description: 'size larger than array',
        check: (fn) => ({
          actual: (fn as any)([1, 2, 3], 10),
          expected: [[1, 2, 3]],
        }),
      },
      {
        description: 'empty array',
        check: (fn) => ({
          actual: (fn as any)([], 2),
          expected: [],
        }),
      },
    ],
    concepts: ['slice', 'loop with step', 'array manipulation'],
    explanation: 'Loop with step size i += size. arr.slice(i, i + size) handles the last chunk automatically — if i + size exceeds the array length, slice just returns the remaining elements. A reduce version also works: arr.reduce((acc, _, i) => i % size === 0 ? [...acc, arr.slice(i, i + size)] : acc, []).',
  },

  {
    id: 'deepclone',
    title: 'Deep Clone',
    category: 'JavaScript',
    difficulty: 'Medium',
    description: `Implement deepClone(obj) that creates a deep copy — no shared references with the original. Handle objects, arrays, and primitives. (You may assume no Date/RegExp/circular refs for this exercise.)

Examples:
  const a = { x: 1, y: { z: 2 } }
  const b = deepClone(a)
  b.y.z = 99
  a.y.z // still 2 — not shared`,
    functionName: 'deepClone',
    starterCode: `function deepClone(obj) {
  // create a deep copy with no shared references
}`,
    solution: `function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepClone)
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, deepClone(v)])
  )
}

// Modern alternative: structuredClone(obj)
// (handles Date, RegExp, Map, Set, circular refs — but not functions)`,
    tests: [
      {
        description: 'clones primitives',
        check: (fn) => ({ actual: (fn as any)(42), expected: 42 }),
      },
      {
        description: 'deep copies nested object (no shared reference)',
        check: (fn) => {
          const orig = { a: 1, b: { c: 2 } }
          const clone = (fn as any)(orig) as typeof orig
          clone.b.c = 99
          return { actual: orig.b.c, expected: 2 }
        },
      },
      {
        description: 'deep copies nested arrays',
        check: (fn) => {
          const orig = { arr: [1, [2, 3]] }
          const clone = (fn as any)(orig) as typeof orig
          ;(clone.arr[1] as number[])[0] = 99
          return { actual: (orig.arr[1] as number[])[0], expected: 2 }
        },
      },
      {
        description: 'result equals original',
        check: (fn) => {
          const orig = { a: 1, b: [2, { c: 3 }] }
          return { actual: (fn as any)(orig), expected: orig }
        },
      },
    ],
    concepts: ['recursion', 'reference vs value', 'typeof', 'Object.entries'],
    explanation: 'Base case: primitives (null, numbers, strings, booleans) are returned as-is — they\'re already values. Recursive case: arrays → map each element through deepClone; objects → reconstruct with Object.fromEntries. The modern answer is structuredClone() — know it exists and its limitations (no functions). Interviewers often ask: "how would you handle circular references?" Answer: use a WeakMap to track visited objects.',
  },

  {
    id: 'curry',
    title: 'Curry',
    category: 'JavaScript',
    difficulty: 'Hard',
    description: `Implement curry(fn) that transforms a function to accept arguments one at a time. The curried function should be callable with any combination of arguments until all are satisfied.

Examples:
  const add = curry((a, b, c) => a + b + c)
  add(1)(2)(3)    → 6
  add(1, 2)(3)    → 6
  add(1)(2, 3)    → 6
  add(1, 2, 3)    → 6`,
    functionName: 'curry',
    starterCode: `function curry(fn) {
  // return a curried version of fn
}`,
    solution: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args)
    }
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs))
    }
  }
}`,
    tests: [
      {
        description: 'one argument at a time',
        check: (fn) => {
          const add = (fn as any)((a: number, b: number, c: number) => a + b + c)
          return { actual: add(1)(2)(3), expected: 6 }
        },
      },
      {
        description: 'multiple args at once',
        check: (fn) => {
          const add = (fn as any)((a: number, b: number, c: number) => a + b + c)
          return { actual: add(1, 2)(3), expected: 6 }
        },
      },
      {
        description: 'all args at once',
        check: (fn) => {
          const add = (fn as any)((a: number, b: number, c: number) => a + b + c)
          return { actual: add(1, 2, 3), expected: 6 }
        },
      },
      {
        description: 'works with 2-argument function',
        check: (fn) => {
          const multiply = (fn as any)((a: number, b: number) => a * b)
          return { actual: multiply(6)(7), expected: 42 }
        },
      },
    ],
    concepts: ['closure', 'fn.length', 'partial application', 'recursion'],
    explanation: 'The key is fn.length — JavaScript functions expose their declared parameter count. Compare args.length against fn.length: if we have enough, call fn directly; otherwise return a new function that concatenates args and recurses. This is partial application. Interviewers love the follow-up: "what if fn uses rest params (...args)?" — fn.length would be 0, breaking this approach. You\'d need to explicitly pass the arity.',
  },
]
