import { DAY, determineSpecies, speciesName } from './game.js'

// Explicit menu action only. Never tick through simulated days of neglect.
export function advanceForTest(state, now = Date.now()) {
  if (!state || state.schema !== 1 || state.dead || !Number.isInteger(state.stage) || state.stage < 0 || state.stage >= 4) return state
  const stage = state.stage + 1
  const anchor = state.pausedAt > 0 ? state.pausedAt : now
  const species = stage === 4 && !state.species ? determineSpecies(state.meals || {}) : state.species
  return {...state, stage, ageDays:stage, bornAt:anchor-stage*DAY, updatedAt:now, species,
    message:stage === 4 ? 'Teste: adulto ' + speciesName(species) + '!' : 'Teste: fase ' + stage + ' de 4.'}
}
