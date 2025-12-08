package core.model

data class KineticsParams(
    val reactivityRho: Double, // Reactivity ρ (unitless, e.g., fraction)
    val delayedNeutronFraction: Double, // β
    val promptGenerationTime: Double, // Λ (seconds)
    val delayedNeutronDecayConst: Double, // λ (1/seconds)
    val initialNeutronDensity: Double = 1.0, // n(0)
    val initialPrecursorConc: Double = delayedNeutronFraction / (promptGenerationTime * delayedNeutronDecayConst) // steady-state C(0)
)

data class SimulationSettings(
    val timeStep: Double = 0.001, // Δt in seconds
    val duration: Double = 5.0 // total simulation time in seconds
)

data class KineticsState(
    val time: Double,
    val neutronDensity: Double,
    val precursorConcentration: Double
)

/**
 * Simple explicit Euler solver for the 1-group point kinetics equations.
 * n' = ((ρ - β) / Λ) * n + λ * C
 * C' = (β / Λ) * n - λ * C
 */
fun simulatePointKinetics(
    params: KineticsParams,
    settings: SimulationSettings
): List<KineticsState> {
    val steps = (settings.duration / settings.timeStep).toInt().coerceAtLeast(1)
    val states = ArrayList<KineticsState>(steps + 1)

    var time = 0.0
    var n = params.initialNeutronDensity
    var c = params.initialPrecursorConc

    states.add(KineticsState(time, n, c))

    repeat(steps) {
        val dn = (((params.reactivityRho - params.delayedNeutronFraction) / params.promptGenerationTime) * n +
                params.delayedNeutronDecayConst * c) * settings.timeStep
        val dc = ((params.delayedNeutronFraction / params.promptGenerationTime) * n -
                params.delayedNeutronDecayConst * c) * settings.timeStep

        n += dn
        c += dc
        time += settings.timeStep

        states.add(KineticsState(time, n, c))
    }

    return states
}
