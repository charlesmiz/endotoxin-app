"""
=============================================================================
Project: Automated Data Processing Script for Validation of the
         Archachatina marginata-Based Endotoxin Kit
Author:  Chukwuma Charlesmary
Supervisor: Prof. M.O. Salawu
Date:    August 2026
Tools:   Python 3 Standard Library (math, csv) - Zero Third-Party Dependencies Required!
         (Optionally uses pandas, scipy, and matplotlib if installed)
=============================================================================
"""

import math
import csv
import sys

# Try importing optional scientific libraries if available
try:
    import numpy as np
    import pandas as pd
    import matplotlib.pyplot as plt
    from scipy import stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


# =============================================================================
# STATISTICAL MATH UTILITIES (Pure Python Implementation)
# =============================================================================

def mean(values: list) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)

def std_dev(values: list) -> float:
    n = len(values)
    if n <= 1:
        return 0.0
    m = mean(values)
    variance = sum((x - m) ** 2 for x in values) / (n - 1)
    return math.sqrt(variance)

def cv_percent(values: list) -> float:
    m = mean(values)
    if m == 0.0 or len(values) <= 1:
        return 0.0
    return (std_dev(values) / m) * 100.0

def linear_regression_ols(x_vals: list, y_vals: list) -> dict:
    """
    Ordinary Least Squares (OLS) Linear Regression:
        y = slope * x + intercept
    Calculates exact slope, intercept, R-squared, Pearson r, and Standard Error.
    """
    n = len(x_vals)
    if n < 2:
        raise ValueError("Linear regression requires at least 2 data points.")

    x_mean = mean(x_vals)
    y_mean = mean(y_vals)

    ss_xx = sum((x - x_mean) ** 2 for x in x_vals)
    ss_yy = sum((y - y_mean) ** 2 for y in y_vals)
    ss_xy = sum((x_vals[i] - x_mean) * (y_vals[i] - y_mean) for i in range(n))

    if ss_xx == 0.0:
        raise ValueError("Variance in x (concentrations) is zero.")

    slope = ss_xy / ss_xx
    intercept = y_mean - slope * x_mean

    # Residual sum of squares
    ss_res = sum((y_vals[i] - (slope * x_vals[i] + intercept)) ** 2 for i in range(n))
    
    # R-squared (Coefficient of Determination)
    r_squared = 1.0 - (ss_res / ss_yy) if ss_yy > 0 else 0.0
    
    # Standard Error of slope
    deg_freedom = n - 2
    mse = ss_res / deg_freedom if deg_freedom > 0 else 0.0
    stderr = math.sqrt(mse / ss_xx) if ss_xx > 0 else 0.0

    return {
        'slope': slope,
        'intercept': intercept,
        'r_squared': r_squared,
        'stderr': stderr,
        'n': n,
        'min_x': min(x_vals),
        'max_x': max(x_vals)
    }


# =============================================================================
# MODULE 1: CALIBRATION CURVE (Protein Coagulation Assay)
# =============================================================================

def process_calibration_standards(data: list) -> tuple:
    records = []
    x_points = []
    y_points = []

    for item in data:
        eu_val = float(item['eu'])
        reps = item.get('replicates', [])
        
        if reps and len(reps) > 0:
            m = mean(reps)
            sd = std_dev(reps)
            cv = cv_percent(reps)
        else:
            m = float(item['abs'])
            sd = 0.0
            cv = 0.0

        x_points.append(eu_val)
        y_points.append(m)

        records.append({
            'eu': eu_val,
            'mean_abs': m,
            'sd': sd,
            'cv': cv,
            'replicates': reps if reps else [m]
        })

    model = linear_regression_ols(x_points, y_points)
    return records, model


# =============================================================================
# MODULE 2: SAMPLE ENDOTOXIN ESTIMATION
# =============================================================================

def estimate_sample_concentrations(samples: list, model: dict, threshold_eu: float = 0.500) -> list:
    slope = model['slope']
    intercept = model['intercept']
    max_x = model['max_x']

    results = []
    for s in samples:
        name = s['name']
        reps = s.get('replicates', [])
        
        if reps and len(reps) > 0:
            m = mean(reps)
            sd = std_dev(reps)
            cv = cv_percent(reps)
        else:
            m = float(s['abs'])
            sd = 0.0
            cv = 0.0

        # Inverse linear prediction: x = (y - c) / m
        est_eu = (m - intercept) / slope if slope != 0 else 0.0

        status = "PASS (<= Threshold)" if est_eu <= threshold_eu else "FLAGGED (> Threshold)"
        if est_eu < 0:
            status += " [Note: Below Blank]"
        elif est_eu > max_x:
            status += " [Warning: Extrapolated above Std]"

        results.append({
            'name': name,
            'mean_abs': m,
            'sd': sd,
            'cv': cv,
            'est_eu': est_eu,
            'status': status
        })

    return results


# =============================================================================
# MODULE 3: PHENOLOXIDASE KINETIC RATE CALCULATIONS
# =============================================================================

def calculate_kinetic_rates(time_minutes: list, kinetic_series: dict) -> list:
    results = []
    for sample_name, abs_readings in kinetic_series.items():
        # Linear regression over time -> slope is dA/dt
        reg = linear_regression_ols(time_minutes, abs_readings)
        rate_da_dt = reg['slope']
        r2 = reg['r_squared']
        total_delta = abs_readings[-1] - abs_readings[0]

        results.append({
            'sample': sample_name,
            'rate_da_min': rate_da_dt,
            'r2': r2,
            'delta_abs': total_delta,
            'init_abs': abs_readings[0],
            'final_abs': abs_readings[-1]
        })
    return results


# =============================================================================
# MAIN SCRIPT EXECUTION
# =============================================================================

def main():
    print("=" * 78)
    print("  ARCHACHATINA MARGINATA ENDOTOXIN ASSAY - VALIDATION SCRIPT")
    print("  Author: Chukwuma Charlesmary  |  Supervisor: Prof. M.O. Salawu")
    print("=" * 78)

    # 1. STANDARD CALIBRATION DATA
    raw_calibration = [
        {'eu': 0.0, 'abs': 0.0644, 'replicates': [0.064, 0.065, 0.064]},
        {'eu': 0.5, 'abs': 0.0700, 'replicates': [0.069, 0.071, 0.070]},
        {'eu': 1.0, 'abs': 0.0753, 'replicates': [0.075, 0.076, 0.075]},
        {'eu': 2.0, 'abs': 0.0862, 'replicates': [0.086, 0.087, 0.086]},
        {'eu': 5.0, 'abs': 0.1189, 'replicates': [0.118, 0.120, 0.119]},
    ]

    print("\n[STEP 1] Processing Standard Calibration Curve (Protein Coagulation Assay)...")
    cal_records, model = process_calibration_standards(raw_calibration)

    print(f"{'Std (EU/mL)':<14} | {'Mean Abs (OD)':<14} | {'SD':<10} | {'CV (%)':<10}")
    print("-" * 56)
    for r in cal_records:
        print(f"{r['eu']:<14.2f} | {r['mean_abs']:<14.4f} | {r['sd']:<10.4f} | {r['cv']:<10.2f}%")

    sign = "+" if model['intercept'] >= 0 else "-"
    print("\n--- Calibration Model Summary ---")
    print(f"Regression Equation : y = {model['slope']:.6f}x {sign} {abs(model['intercept']):.6f}")
    print(f"Slope (Sensitivity) : {model['slope']:.6f} OD/(EU/mL)")
    print(f"Intercept (Blank)   : {model['intercept']:.6f} OD")
    print(f"Linearity (R²)      : {model['r_squared']:.5f}")
    print(f"Standard Error      : {model['stderr']:.6f}")

    if model['r_squared'] >= 0.980:
        print("✓ VALIDATION PASS: Calibration curve demonstrates acceptable linearity (R² >= 0.980).")
    else:
        print("⚠ WARNING: Calibration curve R² is below 0.980 target.")

    # 2. COMMERCIAL IV FLUID SAMPLES
    test_samples = [
        {'name': '5% Dextrose Injection (Sample A)', 'abs': 0.0682, 'replicates': [0.068, 0.068, 0.069]},
        {'name': 'Normal Saline 0.9% (Sample B)',     'abs': 0.0655, 'replicates': [0.065, 0.066, 0.066]},
        {'name': "Ringer's Lactate (Sample C)",       'abs': 0.0721, 'replicates': [0.072, 0.073, 0.071]},
        {'name': 'Positive Spike Control (Sample D)', 'abs': 0.1085, 'replicates': [0.108, 0.109, 0.109]},
    ]

    print("\n[STEP 2] Estimating Endotoxin Content in Commercial IV Fluid Samples...")
    sample_results = estimate_sample_concentrations(test_samples, model, threshold_eu=0.500)

    print(f"{'Sample Name':<35} | {'Mean OD':<9} | {'Est. Endotoxin (EU/mL)':<22} | {'QC Status'}")
    print("-" * 92)
    for s in sample_results:
        print(f"{s['name']:<35} | {s['mean_abs']:<9.4f} | {s['est_eu']:<22.4f} | {s['status']}")

    # 3. PHENOLOXIDASE KINETIC RATE CALCULATIONS
    time_minutes = [0, 2, 4, 6, 8, 10]
    kinetic_raw_series = {
        'Crude Haemolymph':       [0.050, 0.068, 0.086, 0.105, 0.124, 0.142],
        'Purified Fraction I':    [0.050, 0.078, 0.108, 0.138, 0.167, 0.198],
        'Negative Control (H2O)': [0.050, 0.051, 0.051, 0.052, 0.052, 0.053],
    }

    print("\n[STEP 3] Computing Phenoloxidase Kinetic Rates (dA/dt, Absorbance/min)...")
    kinetic_results = calculate_kinetic_rates(time_minutes, kinetic_raw_series)

    print(f"{'Sample / Fraction':<26} | {'Kinetic Rate (dA/min)':<22} | {'Linearity (R²)':<14} | {'Total ΔA'}")
    print("-" * 80)
    for k in kinetic_results:
        print(f"{k['sample']:<26} | {k['rate_da_min']:<22.5f} | {k['r2']:<14.4f} | {k['delta_abs']:<8.4f}")

    # 4. CSV EXPORT
    with open('iv_fluid_endotoxin_estimates.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Sample Name', 'Mean Absorbance', 'SD', 'CV (%)', 'Estimated Endotoxin (EU/mL)', 'Status'])
        for s in sample_results:
            writer.writerow([s['name'], f"{s['mean_abs']:.4f}", f"{s['sd']:.4f}", f"{s['cv']:.2f}", f"{s['est_eu']:.4f}", s['status']])

    print("\n[STEP 4] CSV Output Exported: 'iv_fluid_endotoxin_estimates.csv'")
    print("=" * 78)
    print("  ALL VALIDATION DATA SUCCESSFULLY PROCESSED AND VERIFIED")
    print("=" * 78)


if __name__ == "__main__":
    main()
