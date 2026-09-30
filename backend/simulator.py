import math
import random
import time


# =========================================================
# ACTIVE SIMULATIONS
# =========================================================

simulation_states = {}


# =========================================================
# SIMULATION SCENARIOS
#
# Volume values are SIMULATED breath-volume values.
# They are NOT measurements produced by Wi-Fi CSI.
# =========================================================

SCENARIOS = {

    "NORMAL": {
        "label": "Normal",
        "start_rate": 15.0,
        "target_rate": 15.0,
        "start_volume": 587.0,
        "target_volume": 587.0,
        "transition_seconds": 1,
        "pattern": "NORMAL",
    },

    "FAST": {
        "label": "Fast Breathing",
        "start_rate": 15.0,
        "target_rate": 25.0,
        "start_volume": 587.0,
        "target_volume": 500.0,
        "transition_seconds": 12,
        "pattern": "FAST_BREATHING",
    },

    "SLOW": {
        "label": "Slow Breathing",
        "start_rate": 15.0,
        "target_rate": 7.0,
        "start_volume": 587.0,
        "target_volume": 500.0,
        "transition_seconds": 12,
        "pattern": "SLOW_BREATHING",
    },

    "SHALLOW": {
        "label": "Shallow Breathing",
        "start_rate": 15.0,
        "target_rate": 24.0,
        "start_volume": 587.0,
        "target_volume": 220.0,
        "transition_seconds": 14,
        "pattern": "SHALLOW_BREATHING",
    },

    "BREATHING_PAUSE": {
        "label": "Breathing Pause",
        "start_rate": 15.0,
        "target_rate": 8.0,
        "start_volume": 587.0,
        "target_volume": 350.0,
        "transition_seconds": 14,
        "pattern": "BREATHING_PAUSE",
    },

    "RECOVERY": {
        "label": "Recovery",
        "start_rate": 24.0,
        "target_rate": 15.0,
        "start_volume": 300.0,
        "target_volume": 587.0,
        "transition_seconds": 14,
        "pattern": "RECOVERY",
    },

    # Technical validation scenarios

    "MOTION_ARTIFACT": {
        "label": "Motion Artifact",
        "start_rate": None,
        "target_rate": None,
        "start_volume": None,
        "target_volume": None,
        "transition_seconds": 1,
        "pattern": "MOTION_ARTIFACT",
    },

    "SIGNAL_LOSS": {
        "label": "Signal Loss",
        "start_rate": None,
        "target_rate": None,
        "start_volume": None,
        "target_volume": None,
        "transition_seconds": 1,
        "pattern": "SIGNAL_UNRELIABLE",
    },
}


# =========================================================
# HELPERS
# =========================================================

def interpolate(start, end, progress):
    """
    Linear interpolation between two values.
    """

    if start is None or end is None:
        return None

    return start + ((end - start) * progress)


def smooth_progress(progress):
    """
    Smoothstep interpolation.

    Instead of changing abruptly:
        15 -> 16 -> 17...

    this creates a more natural acceleration/deceleration.
    """

    progress = max(0.0, min(1.0, progress))

    return progress * progress * (3 - 2 * progress)


# =========================================================
# START SIMULATION
# =========================================================

def start_simulation(patient_id: int, scenario: str):

    scenario = scenario.upper()

    if scenario not in SCENARIOS:
        raise ValueError("Unknown simulation scenario")

    simulation_states[patient_id] = {
        "scenario": scenario,
        "started_at": time.time(),
        "sample": 0,
    }

    return simulation_states[patient_id]


# =========================================================
# STOP SIMULATION
# =========================================================

def stop_simulation(patient_id: int):

    simulation_states.pop(patient_id, None)


# =========================================================
# GET STATE
# =========================================================

def get_simulation_state(patient_id: int):

    return simulation_states.get(patient_id)


# =========================================================
# GENERATE READING
# =========================================================

def generate_reading(patient_id: int):

    state = simulation_states.get(patient_id)

    if not state:
        return None

    scenario_name = state["scenario"]
    config = SCENARIOS[scenario_name]

    state["sample"] += 1

    elapsed = time.time() - state["started_at"]

    transition_seconds = config["transition_seconds"]

    raw_progress = min(
        elapsed / transition_seconds,
        1.0
    )

    progress = smooth_progress(raw_progress)


    # =====================================================
    # SIGNAL LOSS
    # =====================================================

    if scenario_name == "SIGNAL_LOSS":

        return {
            "respiratory_rate": None,
            "simulated_volume": None,
            "signal_quality": "UNRELIABLE",
            "pattern": "SIGNAL_UNRELIABLE",
            "confidence": 0.10,
            "waveform": None,
            "progress": 1.0,
        }


    # =====================================================
    # MOTION ARTIFACT
    # =====================================================

    if scenario_name == "MOTION_ARTIFACT":

        return {
            "respiratory_rate": None,
            "simulated_volume": None,
            "signal_quality": "POOR",
            "pattern": "MOTION_ARTIFACT",
            "confidence": 0.25,
            "waveform": random.uniform(-1.8, 1.8),
            "progress": 1.0,
        }


    # =====================================================
    # RATE + SIMULATED VOLUME
    # =====================================================

    rate = interpolate(
        config["start_rate"],
        config["target_rate"],
        progress
    )

    volume = interpolate(
        config["start_volume"],
        config["target_volume"],
        progress
    )


    # Small natural rate variability
    rate += random.uniform(-0.15, 0.15)


    # =====================================================
    # WAVEFORM AMPLITUDE
    # =====================================================

    # 587 mL is our simulator's reference amplitude.
    amplitude = volume / 587.0


    # =====================================================
    # BREATHING PAUSE BEHAVIOUR
    # =====================================================

    if scenario_name == "BREATHING_PAUSE":

        # Pauses become increasingly prominent
        # as the scenario progresses.

        pause_cycle = elapsed % 8.0

        pause_duration = 0.8 + (progress * 3.0)

        if pause_cycle < pause_duration:
            amplitude *= 0.05


    # =====================================================
    # WAVEFORM
    # =====================================================

    frequency = rate / 60.0

    waveform = (
        math.sin(
            2 * math.pi * frequency * elapsed
        )
        * amplitude
    )

    waveform += random.uniform(-0.025, 0.025)


    # =====================================================
    # SIGNAL QUALITY
    # =====================================================

    signal_quality = "GOOD"
    confidence = 0.96

    if scenario_name == "BREATHING_PAUSE":
        confidence = 0.92

    elif scenario_name == "SHALLOW":
        confidence = 0.93


    return {
        "respiratory_rate": round(rate, 1),
        "simulated_volume": round(volume),
        "signal_quality": signal_quality,
        "pattern": config["pattern"],
        "confidence": confidence,
        "waveform": round(waveform, 4),
        "progress": round(progress, 3),
    }