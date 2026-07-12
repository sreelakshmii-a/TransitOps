export const meta = {
  name: 'council',
  description: 'Run a question through a multi-agent council: independent first opinions, anonymized peer review, chairman synthesis',
  phases: [
    { title: 'First Opinions', detail: 'each council seat answers independently' },
    { title: 'Peer Review', detail: 'seats anonymously critique and rank all answers' },
    { title: 'Chairman Synthesis', detail: 'one agent synthesizes the final answer' },
  ],
}

const DEFAULT_PERSONAS = [
  { key: 'pragmatist', angle: 'You own the ship-it-today failure mode: assume there are 48 hours left and every hour of extra abstraction is an hour not spent on a working demo. Pick the option a small team can implement and trust by tomorrow, and say what you would cut to get there.' },
  { key: 'architect', angle: 'You own the six-months-later failure mode: assume this decision is now load-bearing and someone unfamiliar with today\'s reasoning has to extend it under deadline pressure. Find where the design becomes a trap.' },
  { key: 'concurrency-skeptic', angle: 'You own the race-condition failure mode: assume this runs under real concurrent load - two callers hitting the same path at the same instant, retries, partial failures, network delay between check and act. Trace the exact interleaving that breaks each option.' },
  { key: 'user-advocate', angle: 'You own the live-demo failure mode: assume a judge or end user drives this feature by hand, once, in front of you, and does the one thing you didn\'t expect. Find that click path and say which option survives it.' },
]

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    ranking: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          rank: { type: 'number' },
          critique: { type: 'string' },
        },
        required: ['label', 'rank', 'critique'],
      },
    },
    best: { type: 'string' },
  },
  required: ['ranking', 'best'],
}

const input = typeof args === 'string' ? JSON.parse(args) : args

const question = input && input.question
if (!question) {
  throw new Error('council workflow requires args.question (a string describing the decision to make)')
}

const requestedSize = (input && input.councilSize) || DEFAULT_PERSONAS.length
const personas = ((input && input.personas && input.personas.length) ? input.personas : DEFAULT_PERSONAS).slice(0, requestedSize)
const labels = personas.map((_, i) => String.fromCharCode(65 + i))

phase('First Opinions')

function openingPrompt(persona) {
  return `You are one independent seat on a decision-making council. Answer the question below on its merits, in your own voice, with no knowledge of what other seats will say.

Lens for this seat: ${persona.angle}

Question:
${question}

Give a clear, direct answer with your reasoning. Keep it focused - a few paragraphs or a short structured list, not an essay.`
}

const firstOpinions = await parallel(personas.map((persona, i) =>
  () => agent(openingPrompt(persona), { phase: 'First Opinions', label: `seat-${labels[i]}` })
))

const seats = personas
  .map((persona, i) => ({ label: labels[i], persona, answer: firstOpinions[i] }))
  .filter(s => s.answer)

log(`${seats.length}/${personas.length} seats answered`)

const bundle = seats.map(s => `--- Answer ${s.label} ---\n${s.answer}`).join('\n\n')

phase('Peer Review')

function reviewPrompt() {
  return `You are reviewing anonymous answers from a council of advisors to this question:

${question}

Below are all the answers, labeled with letters only - you do not know which model or persona wrote which. Do not try to guess authorship or favor an answer because of its style or phrasing. Judge purely on the merits: correctness, completeness, practicality, and whether it actually resolves the question.

${bundle}

Rank all answers from best to worst (rank 1 = best) and give a one-sentence critique of each. Then name the single best answer's label.`
}

const peerReviews = await parallel(seats.map(seat =>
  () => agent(reviewPrompt(), { phase: 'Peer Review', label: `review-by-${seat.label}`, schema: REVIEW_SCHEMA })
))

const reviews = seats
  .map((seat, i) => ({ reviewer: seat.label, review: peerReviews[i] }))
  .filter(r => r.review)

const tally = {}
reviews.forEach(r => { tally[r.review.best] = (tally[r.review.best] || 0) + 1 })
const talliedLines = Object.entries(tally)
  .sort((a, b) => b[1] - a[1])
  .map(([label, votes]) => `${label}: ${votes} vote(s)`)
  .join(', ')

log(`Peer vote tally - ${talliedLines || 'no votes recorded'}`)

phase('Chairman Synthesis')

const reviewBundle = reviews
  .map(r => `Reviewer ${r.reviewer} ranking: ${JSON.stringify(r.review.ranking)}; picked best: ${r.review.best}`)
  .join('\n')

const chairmanPrompt = `You are the chairman of a council that was asked:

${question}

Here are all the independent first-opinion answers:

${bundle}

Here is how the council peer-reviewed each other's answers (anonymized labels, same labels as above):

${reviewBundle}

Vote tally for best answer: ${talliedLines || 'none'}

Write the final, synthesized answer to the original question. Don't just pick a winner - merge the strongest, well-supported points across answers, resolve disagreements with your own judgment, and explicitly flag any real unresolved disagreement instead of papering over it. Be direct and actionable.`

const finalAnswer = await agent(chairmanPrompt, { phase: 'Chairman Synthesis', label: 'chairman' })

return {
  question,
  seats: seats.map(s => ({ label: s.label, persona: s.persona.key, answer: s.answer })),
  peerReviews: reviews,
  voteTally: tally,
  finalAnswer,
}
