import numpy as np
from typing import Tuple

def compute_curvature(dem: np.ndarray, cell_size_m: float = 30.0) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes profile curvature (flow direction), planform curvature (contour normal),
    and total curvature using Zevenbergen & Thorne (1987) 9-point polynomial fit.
    Negative profile curvature indicates convex/accelerating flow.
    Negative planform curvature indicates diverging ridges.
    """
    dem = dem.astype(np.float64)
    L = cell_size_m
    padded = np.pad(dem, 1, mode='edge')
    
    z1 = padded[:-2, :-2]
    z2 = padded[:-2, 1:-1]
    z3 = padded[:-2, 2:]
    z4 = padded[1:-1, :-2]
    z5 = padded[1:-1, 1:-1]
    z6 = padded[1:-1, 2:]
    z7 = padded[2:, :-2]
    z8 = padded[2:, 1:-1]
    z9 = padded[2:, 2:]

    # Partial derivatives
    D = ((z4 + z6) / 2.0 - z5) / (L**2)
    E = ((z2 + z8) / 2.0 - z5) / (L**2)
    F = (-z1 + z3 + z7 - z9) / (4.0 * (L**2))
    G = (-z4 + z6) / (2.0 * L)
    H = (z2 - z8) / (2.0 * L)

    p = G**2 + H**2
    valid = p > 1e-8

    profile = np.zeros_like(dem, dtype=np.float32)
    planform = np.zeros_like(dem, dtype=np.float32)

    profile[valid] = (-2.0 * (D[valid] * (G[valid]**2) + E[valid] * (H[valid]**2) + F[valid] * G[valid] * H[valid]) / p[valid]).astype(np.float32)
    planform[valid] = (2.0 * (D[valid] * (H[valid]**2) + E[valid] * (G[valid]**2) - F[valid] * G[valid] * H[valid]) / p[valid]).astype(np.float32)
    total = (profile + planform).astype(np.float32)

    return total, profile, planform
