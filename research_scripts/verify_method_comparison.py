#!/usr/bin/env python3
"""Independent reference implementation of Deming regression (lambda = var_x/var_y,
jackknife CI) and Bland-Altman analysis, used to cross-check the web app.
Pairs samples BY Sample_ID (never by row position).
Usage: python3 verify_method_comparison.py [csv] [--merge-control-met]
Requires: numpy, scipy"""
import csv, math, sys
import numpy as np
from scipy import stats

def deming(x, y, lam=1.0):
    n = len(x); mx, my = x.mean(), y.mean()
    sxx = ((x-mx)**2).sum()/(n-1); syy = ((y-my)**2).sum()/(n-1)
    sxy = ((x-mx)*(y-my)).sum()/(n-1)
    d = 1.0/lam                      # var_y / var_x
    b = (syy-d*sxx+math.sqrt((syy-d*sxx)**2+4*d*sxy**2))/(2*sxy)
    return b, my-b*mx

def deming_jackknife(x, y, lam=1.0, alpha=0.05):
    n = len(x); b, a = deming(x, y, lam)
    loo = np.array([deming(np.delete(x, i), np.delete(y, i), lam) for i in range(n)])
    se = np.sqrt((n-1)/n*((loo-loo.mean(axis=0))**2).sum(axis=0))
    t = stats.t.ppf(1-alpha/2, n-2)
    return (b, b-t*se[0], b+t*se[0]), (a, a-t*se[1], a+t*se[1])

def bland_altman(x, y, alpha=0.05):
    n = len(x); diff = x-y; mean = (x+y)/2
    d, s = diff.mean(), diff.std(ddof=1)
    t = stats.t.ppf(1-alpha/2, n-1)
    se_d = s/math.sqrt(n); se_loa = s*math.sqrt(1/n+1.96**2/(2*(n-1)))
    lo, hi = d-1.96*s, d+1.96*s
    c1, c2 = stats.chi2.ppf(1-alpha/2, n-1), stats.chi2.ppf(alpha/2, n-1)
    r, p = stats.pearsonr(mean, diff)
    z = math.atanh(r); zs = 1/math.sqrt(n-3)
    sl = stats.linregress(mean, diff)
    t2 = stats.t.ppf(1-alpha/2, n-2)
    return dict(n=n, bias=d, bias_ci=(d-t*se_d, d+t*se_d), sd=s,
        sd_ci=(s*math.sqrt((n-1)/c1), s*math.sqrt((n-1)/c2)),
        loa=(lo, hi), lo_ci=(lo-t*se_loa, lo+t*se_loa), hi_ci=(hi-t*se_loa, hi+t*se_loa),
        slope=sl.slope, slope_ci=(sl.slope-t2*sl.stderr, sl.slope+t2*sl.stderr),
        r=r, r_ci=(math.tanh(z-1.96*zs), math.tanh(z+1.96*zs)), p=p)

def rpd(a, b):
    m = (a+b)/2
    return abs(a-b)/abs(m)*100 if abs(m) > 0 else float('nan')

def load(path, merge):
    rows = {}
    for r in csv.DictReader(open(path)):
        sid = r['Sample_ID'].strip()
        if merge and sid in ('Control V', 'MET'): sid = 'Control V / MET'
        rec = rows.setdefault(sid, {})
        for k in ('Coag_Estimate_EUmL', 'PO_Estimate_EUmL'):
            if (r.get(k) or '').strip(): rec[k] = float(r[k])
    return {k: v for k, v in rows.items() if len(v) == 2}

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    from pathlib import Path
    path = args[0] if args else str(Path(__file__).resolve().parent.parent / 'data' / 'EXP-AM-2026-001_sample_results.csv')
    pairs = load(path, '--merge-control-met' in sys.argv)
    ids = list(pairs)
    x = np.array([pairs[i]['Coag_Estimate_EUmL'] for i in ids])
    y = np.array([pairs[i]['PO_Estimate_EUmL'] for i in ids])
    print(f'Pairs matched by Sample_ID: n = {len(ids)}')
    for i, a, b in zip(ids, x, y): print(f'  {i:18s} coag {a:8.3f}  PO {b:8.3f}')
    for lam in (0.5, 1.0, 2.0):
        s, a = deming_jackknife(x, y, lam)
        print(f'Deming lambda={lam}: slope {s[0]:.4f} [{s[1]:.4f}, {s[2]:.4f}]  intercept {a[0]:.4f} [{a[1]:.4f}, {a[2]:.4f}]')
    ba = bland_altman(x, y)
    for k, v in ba.items(): print(f'  BA {k}: {v}')
    print('RPD per pair:', [round(rpd(a, b), 1) for a, b in zip(x, y)])
